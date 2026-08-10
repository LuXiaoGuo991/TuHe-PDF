import { showLoader, hideLoader, showAlert } from '../ui.js';
import { t } from '../i18n/i18n';

const translate = (
  key: string,
  fallback: string,
  options?: Record<string, unknown>
) => {
  const translation = t(key, options);
  return translation && translation !== key ? translation : fallback;
};
import { downloadFile } from '../utils/helpers.js';
import { state } from '../state.js';
import { loadPdfWithPasswordPrompt } from '../utils/password-prompt.js';
import {
  renderPagesProgressively,
  cleanupLazyRendering,
} from '../utils/render-utils.js';
import Sortable from 'sortablejs';
import { icons, createIcons } from 'lucide';
import { PDFDocument as PDFLibDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const duplicateOrganizeState: {
  sortableInstances: { pageGrid?: Sortable };
} = {
  sortableInstances: {},
};

function initializePageGridSortable() {
  const grid = document.getElementById('page-grid');
  if (!grid) return;

  if (duplicateOrganizeState.sortableInstances.pageGrid) {
    duplicateOrganizeState.sortableInstances.pageGrid.destroy();
  }

  duplicateOrganizeState.sortableInstances.pageGrid = Sortable.create(grid, {
    animation: 150,
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    dragClass: 'sortable-drag',
    filter: '.duplicate-btn, .delete-btn',
    preventOnFilter: true,
    onStart: function (evt: Sortable.SortableEvent) {
      evt.item.style.opacity = '0.5';
    },
    onEnd: function (evt: Sortable.SortableEvent) {
      evt.item.style.opacity = '1';
    },
  });
}

/**
 * Attaches event listeners for duplicate and delete to a page thumbnail element.
 * @param {HTMLElement} element The thumbnail element to attach listeners to.
 */
function attachEventListeners(element: HTMLElement) {
  // Re-number all visible page labels
  const renumberPages = () => {
    const grid = document.getElementById('page-grid');
    const pages = grid.querySelectorAll('.page-number');
    pages.forEach((label, index) => {
      // @ts-expect-error TS(2322) FIXME: Type 'number' is not assignable to type 'string'.
      label.textContent = index + 1;
    });
  };

  // Duplicate button listener
  element
    .querySelector('.duplicate-btn')
    .addEventListener('click', (e: Event) => {
      e.stopPropagation();
      const clone = element.cloneNode(true) as HTMLElement;
      element.after(clone);
      attachEventListeners(clone);
      renumberPages();
      initializePageGridSortable();
    });

  element.querySelector('.delete-btn').addEventListener('click', (e: Event) => {
    e.stopPropagation();
    if (document.getElementById('page-grid').children.length > 1) {
      element.remove();
      renumberPages();
      initializePageGridSortable();
    } else {
      showAlert(
        translate('common.dynamic.1b233cd173', 'Cannot Delete'),
        translate(
          'common.dynamic.e5a34f7ac1',
          'You cannot delete the last page of the document.'
        )
      );
    }
  });
}

export async function renderDuplicateOrganizeThumbnails() {
  const grid = document.getElementById('page-grid');
  if (!grid) return;

  // Cleanup any previous lazy loading observers
  cleanupLazyRendering();

  showLoader(
    translate('common.dynamic.44d04541b5', 'Rendering page previews...')
  );
  const pdfData = await state.pdfDoc.save();
  hideLoader();
  const loadResult = await loadPdfWithPasswordPrompt(
    state.files[0],
    state.files,
    0
  );
  if (!loadResult) return;
  showLoader(
    translate('common.dynamic.44d04541b5', 'Rendering page previews...')
  );
  const pdfjsDoc = loadResult.pdf;

  grid.textContent = translate('common.dynamic.0e455bd98f', '');

  // Function to create wrapper element for each page
  const createWrapper = (canvas: HTMLCanvasElement, pageNumber: number) => {
    const wrapper = document.createElement('div');
    wrapper.className =
      'page-thumbnail relative cursor-move flex flex-col items-center gap-2';
    // @ts-expect-error TS(2322) FIXME: Type 'number' is not assignable to type 'string'.
    wrapper.dataset.originalPageIndex = pageNumber - 1;

    const imgContainer = document.createElement('div');
    imgContainer.className =
      'w-full h-36 bg-gray-900 rounded-lg flex items-center justify-center overflow-hidden border-2 border-gray-600';

    const img = document.createElement('img');
    img.src = canvas.toDataURL();
    img.className = 'max-w-full max-h-full object-contain';
    imgContainer.appendChild(img);

    const pageNumberSpan = document.createElement('span');
    pageNumberSpan.className =
      'page-number absolute top-1 left-1 bg-gray-900 bg-opacity-75 text-white text-xs rounded-full px-2 py-1';
    pageNumberSpan.textContent = pageNumber.toString();

    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'flex items-center justify-center gap-4';

    const duplicateBtn = document.createElement('button');
    duplicateBtn.className =
      'duplicate-btn bg-green-600 hover:bg-green-700 text-white rounded-full w-8 h-8 flex items-center justify-center';
    duplicateBtn.title = translate(
      'common.dynamic.c565bcea4a',
      'Duplicate Page'
    );
    const duplicateIcon = document.createElement('i');
    duplicateIcon.setAttribute('data-lucide', 'copy-plus');
    duplicateIcon.className = 'w-5 h-5';
    duplicateBtn.appendChild(duplicateIcon);

    const deleteBtn = document.createElement('button');
    deleteBtn.className =
      'delete-btn bg-red-600 hover:bg-red-700 text-white rounded-full w-8 h-8 flex items-center justify-center';
    deleteBtn.title = translate('common.dynamic.5efb3e8ec6', 'Delete Page');
    const deleteIcon = document.createElement('i');
    deleteIcon.setAttribute('data-lucide', 'x-circle');
    deleteIcon.className = 'w-5 h-5';
    deleteBtn.appendChild(deleteIcon);

    controlsDiv.append(duplicateBtn, deleteBtn);
    wrapper.append(imgContainer, pageNumberSpan, controlsDiv);

    attachEventListeners(wrapper);

    return wrapper;
  };

  try {
    // Render pages progressively with lazy loading
    await renderPagesProgressively(pdfjsDoc, grid, createWrapper, {
      batchSize: 8,
      useLazyLoading: true,
      lazyLoadMargin: '400px',
      onProgress: (current, total) => {
        showLoader(
          translate(
            'common.dynamic.b41206e984',
            `Rendering page previews: ${current}/${total}`,
            { value0: current, value1: total }
          )
        );
      },
      onBatchComplete: () => {
        createIcons({ icons });
      },
    });

    initializePageGridSortable();
  } catch (error) {
    console.error('Error rendering thumbnails:', error);
    showAlert(
      translate('alert.error', 'Error'),
      translate('common.dynamic.38e425eed8', 'Failed to render page previews')
    );
  } finally {
    hideLoader();
  }
}

export async function processAndSave() {
  showLoader(translate('common.dynamic.a8a342113d', 'Building new PDF...'));
  try {
    const grid = document.getElementById('page-grid');
    const finalPageElements = grid.querySelectorAll('.page-thumbnail');

    const finalIndices = Array.from(finalPageElements)
      .map((el) =>
        parseInt((el as HTMLElement).dataset.originalPageIndex || '', 10)
      )
      .filter((index) => !isNaN(index) && index >= 0);

    console.log('Saving PDF with indices:', finalIndices);
    console.log('Original PDF Page Count:', state.pdfDoc?.getPageCount());

    if (finalIndices.length === 0) {
      showAlert(
        translate('alert.error', 'Error'),
        translate('common.dynamic.104fff0b03', 'No valid pages to save.')
      );
      return;
    }

    const newPdfDoc = await PDFLibDocument.create();

    const totalPages = state.pdfDoc.getPageCount();
    const invalidIndices = finalIndices.filter((i) => i >= totalPages);
    if (invalidIndices.length > 0) {
      console.error('Found invalid indices:', invalidIndices);
      showAlert(
        translate('alert.error', 'Error'),
        translate(
          'common.dynamic.12199c4a8b',
          'Some pages could not be processed. Please try again.'
        )
      );
      return;
    }

    const copiedPages = await newPdfDoc.copyPages(state.pdfDoc, finalIndices);
    copiedPages.forEach((page) => newPdfDoc.addPage(page));

    const newPdfBytes = await newPdfDoc.save();
    downloadFile(
      new Blob([new Uint8Array(newPdfBytes)], { type: 'application/pdf' }),
      state.files[0]?.name || 'document.pdf'
    );
  } catch (e) {
    console.error('Save error:', e);
    showAlert(
      translate('alert.error', 'Error'),
      translate(
        'common.dynamic.c36048581f',
        'Failed to save the new PDF. Check console for details.'
      )
    );
  } finally {
    hideLoader();
  }
}
