import { createIcons, icons } from 'lucide';
import { t } from '../i18n/i18n';

const translate = (
  key: string,
  fallback: string,
  options?: Record<string, unknown>
) => {
  const translation = t(key, options);
  return translation && translation !== key ? translation : fallback;
};
import { showAlert, showLoader, hideLoader } from '../ui.js';
import { formatBytes, downloadFile } from '../utils/helpers.js';
import { initPagePreview } from '../utils/page-preview.js';
import { PDFDocument } from 'pdf-lib';
import { loadPdfWithPasswordPrompt } from '../utils/password-prompt.js';
import * as pdfjsLib from 'pdfjs-dist';
import Sortable from 'sortablejs';
import { loadPdfDocument } from '../utils/load-pdf-document.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

interface OrganizeState {
  file: File | null;
  pdfDoc: PDFDocument | null;
  pdfJsDoc: pdfjsLib.PDFDocumentProxy | null;
  totalPages: number;
  sortableInstance: Sortable | null;
}

const organizeState: OrganizeState = {
  file: null,
  pdfDoc: null,
  pdfJsDoc: null,
  totalPages: 0,
  sortableInstance: null,
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePage);
} else {
  initializePage();
}

function initializePage() {
  createIcons({ icons });

  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  const dropZone = document.getElementById('drop-zone');
  const processBtn = document.getElementById('process-btn');

  if (fileInput) fileInput.addEventListener('change', handleFileUpload);

  if (dropZone) {
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('ui-bg-raised');
    });
    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('ui-bg-raised');
    });
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('ui-bg-raised');
      const droppedFiles = e.dataTransfer?.files;
      if (droppedFiles && droppedFiles.length > 0) handleFile(droppedFiles[0]);
    });
    // Clear value on click to allow re-selecting the same file
    fileInput?.addEventListener('click', () => {
      if (fileInput) fileInput.value = '';
    });
  }

  if (processBtn) processBtn.addEventListener('click', saveChanges);

  document.getElementById('back-to-tools')?.addEventListener('click', () => {
    window.location.href = import.meta.env.BASE_URL;
  });

  const applyOrderBtn = document.getElementById('apply-order-btn');
  if (applyOrderBtn) applyOrderBtn.addEventListener('click', applyCustomOrder);
}

function applyCustomOrder() {
  const orderInput = document.getElementById(
    'page-order-input'
  ) as HTMLInputElement;
  const grid = document.getElementById('page-grid');

  if (!orderInput || !grid) return;

  const orderString = orderInput.value;
  if (!orderString) {
    showAlert(
      translate('tools:duplicateOrganize.dynamic.3ee3f4d734', 'Invalid Order'),
      translate(
        'tools:duplicateOrganize.dynamic.88f1f34594',
        'Please enter a page order.'
      )
    );
    return;
  }

  const newOrder = orderString.split(',').map((s) => parseInt(s.trim(), 10));

  // Validation
  const currentGridCount = grid.children.length;
  const validNumbers = newOrder.every((n) => !isNaN(n) && n > 0); // Basic check, will validate against available thumbnails
  if (!validNumbers) {
    showAlert(
      translate(
        'tools:duplicateOrganize.dynamic.6ea125d343',
        'Invalid Page Numbers'
      ),
      translate(
        'tools:duplicateOrganize.dynamic.f1ea100a4f',
        `Please enter positive numbers.`
      )
    );
    return;
  }

  if (newOrder.length !== currentGridCount) {
    showAlert(
      translate(
        'tools:duplicateOrganize.dynamic.9188d43dd0',
        'Incorrect Page Count'
      ),
      translate(
        'tools:duplicateOrganize.dynamic.9fce12d6c1',
        `The number of pages specified (${newOrder.length}) does not match the current number of pages in the document (${currentGridCount}). Please provide a complete ordering for all pages.`,
        { value0: newOrder.length, value1: currentGridCount }
      )
    );
    return;
  }

  const uniqueNumbers = new Set(newOrder);
  if (uniqueNumbers.size !== newOrder.length) {
    showAlert(
      translate(
        'tools:duplicateOrganize.dynamic.6e2937ad37',
        'Duplicate Page Numbers'
      ),
      translate(
        'tools:duplicateOrganize.dynamic.d6d71e1a8b',
        'Please ensure all page numbers in the order are unique.'
      )
    );
    return;
  }

  const currentThumbnails = Array.from(grid.children) as HTMLElement[];
  const reorderedThumbnails: HTMLElement[] = [];
  const foundIndices = new Set();

  for (const pageNum of newOrder) {
    const originalIndexToFind = pageNum - 1; // pageNum is 1-based, originalPageIndex is 0-based
    const foundThumbnail = currentThumbnails.find(
      (thumb) =>
        thumb.dataset.originalPageIndex === originalIndexToFind.toString()
    );

    if (foundThumbnail) {
      reorderedThumbnails.push(foundThumbnail);
      foundIndices.add(originalIndexToFind.toString());
    }
  }

  const allOriginalIndicesPresent = currentThumbnails.every((thumb) =>
    foundIndices.has(thumb.dataset.originalPageIndex)
  );

  if (
    reorderedThumbnails.length !== currentGridCount ||
    !allOriginalIndicesPresent
  ) {
    showAlert(
      translate(
        'tools:duplicateOrganize.dynamic.06bf2457c8',
        'Invalid Page Order'
      ),
      translate(
        'tools:duplicateOrganize.dynamic.473466e8f2',
        'The specified page order is incomplete or contains invalid page numbers. Please ensure you provide a new position for every original page.'
      )
    );
    return;
  }

  // Clear the grid and append the reordered thumbnails
  grid.innerHTML = '';
  reorderedThumbnails.forEach((thumb) => grid.appendChild(thumb));

  initializeSortable(); // Re-initialize sortable on the new order

  showAlert(
    translate('alert.success', 'Success'),
    translate(
      'tools:duplicateOrganize.dynamic.5c34a0157f',
      'Pages have been reordered.'
    ),
    'success'
  );
}

function handleFileUpload(e: Event) {
  const input = e.target as HTMLInputElement;
  if (input.files && input.files.length > 0) handleFile(input.files[0]);
}

async function handleFile(file: File) {
  if (
    file.type !== 'application/pdf' &&
    !file.name.toLowerCase().endsWith('.pdf')
  ) {
    showAlert(
      translate('alert.invalidFile', 'Invalid File'),
      translate(
        'tools:duplicateOrganize.dynamic.25286017ef',
        'Please select a PDF file.'
      )
    );
    return;
  }

  organizeState.file = file;

  try {
    const result = await loadPdfWithPasswordPrompt(file);
    if (!result) return;
    showLoader(translate('fileHandler.loadingPdf', 'Loading PDF...'));

    organizeState.pdfDoc = await loadPdfDocument(result.bytes);
    organizeState.pdfJsDoc = result.pdf;
    organizeState.file = result.file;
    organizeState.totalPages = organizeState.pdfDoc.getPageCount();

    updateFileDisplay();
    await renderThumbnails();
    hideLoader();
  } catch (error) {
    console.error('Error loading PDF:', error);
    hideLoader();
    showAlert(
      translate('alert.error', 'Error'),
      translate(
        'tools:duplicateOrganize.dynamic.e5afc36c9b',
        'Failed to load PDF file.'
      )
    );
  }
}

function updateFileDisplay() {
  const fileDisplayArea = document.getElementById('file-display-area');
  if (!fileDisplayArea || !organizeState.file) return;

  fileDisplayArea.innerHTML = '';
  const fileDiv = document.createElement('div');
  fileDiv.className =
    'flex items-center justify-between ui-bg-raised p-3 rounded-lg';

  const infoContainer = document.createElement('div');
  infoContainer.className = 'flex flex-col flex-1 min-w-0';

  const nameSpan = document.createElement('div');
  nameSpan.className = 'truncate font-medium ui-text-primary text-sm mb-1';
  nameSpan.textContent = organizeState.file.name;

  const metaSpan = document.createElement('div');
  metaSpan.className = 'text-xs ui-text-secondary';
  metaSpan.textContent = translate(
    'tools:duplicateOrganize.dynamic.d370ae8ed8',
    `${formatBytes(organizeState.file.size)} • ${organizeState.totalPages} pages`,
    {
      value0: formatBytes(organizeState.file.size),
      value1: organizeState.totalPages,
    }
  );

  infoContainer.append(nameSpan, metaSpan);

  const removeBtn = document.createElement('button');
  removeBtn.className =
    'ml-4 ui-text-danger ui-hover-text-danger flex-shrink-0';
  removeBtn.innerHTML = '<i data-lucide="trash-2" class="w-4 h-4"></i>';
  removeBtn.onclick = () => resetState();

  fileDiv.append(infoContainer, removeBtn);
  fileDisplayArea.appendChild(fileDiv);
  createIcons({ icons });
}

function renumberPages() {
  const grid = document.getElementById('page-grid');
  if (!grid) return;
  const labels = grid.querySelectorAll('.page-number');
  labels.forEach((label, index) => {
    label.textContent = (index + 1).toString();
  });
}

function attachEventListeners(element: HTMLElement) {
  const duplicateBtn = element.querySelector('.duplicate-btn');
  const deleteBtn = element.querySelector('.delete-btn');

  duplicateBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const clone = element.cloneNode(true) as HTMLElement;
    element.after(clone);
    attachEventListeners(clone);
    renumberPages();
    createIcons({ icons });
    initializeSortable();
  });

  deleteBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const grid = document.getElementById('page-grid');
    if (grid && grid.children.length > 1) {
      element.remove();
      renumberPages();
      initializeSortable();
    } else {
      showAlert(
        translate(
          'tools:duplicateOrganize.dynamic.520b80318a',
          'Cannot Delete'
        ),
        translate(
          'tools:duplicateOrganize.dynamic.1d7a59ce91',
          'You cannot delete the last page of the document.'
        )
      );
    }
  });
}

async function renderThumbnails() {
  const grid = document.getElementById('page-grid');
  const processBtn = document.getElementById('process-btn');
  const advancedSettings = document.getElementById('advanced-settings');
  if (!grid || !processBtn || !advancedSettings) return;

  grid.innerHTML = '';
  grid.classList.remove('hidden');
  processBtn.classList.remove('hidden');
  advancedSettings.classList.remove('hidden');

  for (let i = 1; i <= organizeState.totalPages; i++) {
    const page = await organizeState.pdfJsDoc.getPage(i);
    const viewport = page.getViewport({ scale: 1 });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    await page.render({ canvas: null, canvasContext: ctx, viewport }).promise;

    const wrapper = document.createElement('div');
    wrapper.className =
      'page-thumbnail relative cursor-move flex flex-col items-center gap-1 p-2 border-2 ui-border ui-hover-border-action rounded-lg ui-bg-raised transition-colors group';
    wrapper.dataset.originalPageIndex = (i - 1).toString();
    wrapper.dataset.pageNumber = i.toString();

    const imgContainer = document.createElement('div');
    imgContainer.className = 'relative';

    const img = document.createElement('img');
    img.src = canvas.toDataURL();
    img.className = 'rounded-md shadow-md max-w-full h-auto';
    imgContainer.appendChild(img);

    const pageLabel = document.createElement('div');
    pageLabel.className =
      'page-number absolute top-1 left-1 ui-bg-action ui-text-primary text-xs px-2 py-1 rounded-md font-semibold shadow-lg z-10 pointer-events-none';
    pageLabel.textContent = i.toString();
    imgContainer.appendChild(pageLabel);

    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'flex items-center justify-center gap-4';

    const duplicateBtn = document.createElement('button');
    duplicateBtn.className =
      'duplicate-btn ui-bg-success ui-hover-bg-success ui-text-primary rounded-full w-8 h-8 flex items-center justify-center';
    duplicateBtn.title = translate(
      'tools:duplicateOrganize.dynamic.b1b2a7b600',
      'Duplicate Page'
    );
    duplicateBtn.innerHTML = '<i data-lucide="copy-plus" class="w-5 h-5"></i>';

    const deleteBtn = document.createElement('button');
    deleteBtn.className =
      'delete-btn bg-red-600 hover:bg-red-700 ui-text-primary rounded-full w-8 h-8 flex items-center justify-center';
    deleteBtn.title = translate(
      'tools:duplicateOrganize.dynamic.93889c4f64',
      'Delete Page'
    );
    deleteBtn.innerHTML = '<i data-lucide="x-circle" class="w-5 h-5"></i>';

    controlsDiv.append(duplicateBtn, deleteBtn);
    wrapper.append(imgContainer, controlsDiv);
    grid.appendChild(wrapper);

    attachEventListeners(wrapper);
  }

  createIcons({ icons });
  initializeSortable();
  initPagePreview(grid, organizeState.pdfJsDoc);
}

function initializeSortable() {
  const grid = document.getElementById('page-grid');
  if (!grid) return;

  if (organizeState.sortableInstance) organizeState.sortableInstance.destroy();

  organizeState.sortableInstance = Sortable.create(grid, {
    animation: 150,
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    dragClass: 'sortable-drag',
    filter: '.duplicate-btn, .delete-btn',
    preventOnFilter: true,
    onStart: (evt) => {
      if (evt.item) evt.item.style.opacity = '0.5';
    },
    onEnd: (evt) => {
      if (evt.item) evt.item.style.opacity = '1';
    },
  });
}

async function saveChanges() {
  showLoader(
    translate(
      'tools:duplicateOrganize.dynamic.b7b2151528',
      'Building new PDF...'
    )
  );

  try {
    const grid = document.getElementById('page-grid');
    if (!grid) return;

    const finalPageElements = grid.querySelectorAll('.page-thumbnail');
    const finalIndices = Array.from(finalPageElements)
      .map((el) =>
        parseInt((el as HTMLElement).dataset.originalPageIndex || '', 10)
      )
      .filter((index) => !isNaN(index) && index >= 0);

    if (finalIndices.length === 0) {
      showAlert(
        translate('alert.error', 'Error'),
        translate(
          'tools:duplicateOrganize.dynamic.671dda51b0',
          'No valid pages to save.'
        )
      );
      return;
    }

    const newPdf = await PDFDocument.create();
    const copiedPages = await newPdf.copyPages(
      organizeState.pdfDoc,
      finalIndices
    );
    copiedPages.forEach((page) => newPdf.addPage(page));

    const pdfBytes = await newPdf.save();
    downloadFile(
      new Blob([pdfBytes as BlobPart], { type: 'application/pdf' }),
      organizeState.file?.name || 'document.pdf'
    );

    hideLoader();
    showAlert(
      translate('alert.success', 'Success'),
      translate(
        'tools:duplicateOrganize.dynamic.6ba6c148c8',
        'PDF organized successfully!'
      ),
      'success',
      () => resetState()
    );
  } catch (error) {
    console.error('Error saving changes:', error);
    hideLoader();
    showAlert(
      translate('alert.error', 'Error'),
      translate(
        'tools:duplicateOrganize.dynamic.3523dee9d3',
        'Failed to save changes.'
      )
    );
  }
}

function resetState() {
  if (organizeState.sortableInstance) {
    organizeState.sortableInstance.destroy();
    organizeState.sortableInstance = null;
  }

  organizeState.file = null;
  organizeState.pdfDoc = null;
  organizeState.pdfJsDoc = null;
  organizeState.totalPages = 0;

  const grid = document.getElementById('page-grid');
  if (grid) {
    grid.innerHTML = '';
    grid.classList.add('hidden');
  }
  document.getElementById('process-btn')?.classList.add('hidden');
  document.getElementById('advanced-settings')?.classList.add('hidden');
  const fileDisplayArea = document.getElementById('file-display-area');
  if (fileDisplayArea) fileDisplayArea.innerHTML = '';
}
