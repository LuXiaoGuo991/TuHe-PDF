const translate = (
  key: string,
  fallback: string,
  options?: Record<string, unknown>
) => {
  const value = t(key, options);
  return value && value !== key ? value : fallback;
};

import { resetState } from './state.js';
import { formatBytes, getPDFDocument } from './utils/helpers.js';
import {
  renderPagesProgressively,
  cleanupLazyRendering,
} from './utils/render-utils.js';
import { initPagePreview } from './utils/page-preview.js';
import { icons, createIcons } from 'lucide';
import Sortable from 'sortablejs';
import {
  getRotationState,
  updateRotationState,
} from './utils/rotation-state.js';
import * as pdfjsLib from 'pdfjs-dist';
import { t } from './i18n/i18n';
import type { FileInputOptions } from '@/types';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

// Centralizing DOM element selection
export const dom = {
  gridView: document.getElementById('grid-view'),
  toolGrid: document.getElementById('tool-grid'),
  toolInterface: document.getElementById('tool-interface'),
  toolContent: document.getElementById('tool-content'),
  backToGridBtn: document.getElementById('back-to-grid'),
  loaderModal: document.getElementById('loader-modal'),
  loaderText: document.getElementById('loader-text'),
  alertModal: document.getElementById('alert-modal'),
  alertTitle: document.getElementById('alert-title'),
  alertMessage: document.getElementById('alert-message'),
  alertOkBtn: document.getElementById('alert-ok'),
  heroSection: document.getElementById('hero-section'),
  featuresSection: document.getElementById('features-section'),
  toolsHeader: document.getElementById('tools-header'),
  dividers: document.querySelectorAll('.section-divider'),
  hideSections: document.querySelectorAll('.hide-section'),
  shortcutsModal: document.getElementById('shortcuts-modal'),
  closeShortcutsModalBtn: document.getElementById('close-shortcuts-modal'),
  shortcutsList: document.getElementById('shortcuts-list'),
  shortcutSearch: document.getElementById('shortcut-search'),
  resetShortcutsBtn: document.getElementById('reset-shortcuts-btn'),
  importShortcutsBtn: document.getElementById('import-shortcuts-btn'),
  exportShortcutsBtn: document.getElementById('export-shortcuts-btn'),
  openShortcutsBtn: document.getElementById('open-shortcuts-btn'),
  warningModal: document.getElementById('warning-modal'),
  warningTitle: document.getElementById('warning-title'),
  warningMessage: document.getElementById('warning-message'),
  warningCancelBtn: document.getElementById('warning-cancel-btn'),
  warningConfirmBtn: document.getElementById('warning-confirm-btn'),
};

export const showLoader = (text = t('common.loading'), progress?: number) => {
  if (dom.loaderText) dom.loaderText.textContent = text;

  // Add or update progress bar if progress is provided
  const loaderModal = dom.loaderModal;
  if (loaderModal) {
    let progressBar = loaderModal.querySelector(
      '.loader-progress-bar'
    ) as HTMLElement;
    let progressContainer = loaderModal.querySelector(
      '.loader-progress-container'
    ) as HTMLElement;

    if (progress !== undefined && progress >= 0) {
      // Create progress container if it doesn't exist
      if (!progressContainer) {
        progressContainer = document.createElement('div');
        progressContainer.className = 'loader-progress-container w-64 mt-4';
        progressContainer.innerHTML = `
                    <div class="merge-progress-track">
                        <div class="loader-progress-bar merge-progress-bar" style="width: 0%"></div>
                    </div>
                    <p class="loader-progress-text text-xs ui-text-secondary mt-1 text-center">0%</p>
                `;
        const loaderCard =
          loaderModal.querySelector<HTMLElement>('[data-loader-card]') ??
          (loaderModal.firstElementChild as HTMLElement | null);
        loaderCard?.appendChild(progressContainer);
        progressBar = progressContainer.querySelector(
          '.loader-progress-bar'
        ) as HTMLElement;
      }

      // Update progress
      if (progressBar) {
        progressBar.style.width = `${progress}%`;
      }
      const progressText = progressContainer.querySelector(
        '.loader-progress-text'
      );
      if (progressText) {
        progressText.textContent = translate(
          'common.dynamic.afc1792050',
          `${Math.round(progress)}%`,
          { value0: Math.round(progress) }
        );
      }
      progressContainer.classList.remove('hidden');
    } else {
      // Hide progress bar if no progress provided
      if (progressContainer) {
        progressContainer.classList.add('hidden');
      }
    }

    loaderModal.classList.remove('hidden');
  }
};

export const hideLoader = () => {
  if (dom.loaderModal) dom.loaderModal.classList.add('hidden');
};

export const showAlert = (
  title: string,
  message: string,
  type: string = 'error',
  callback?: () => void
) => {
  if (dom.alertTitle) dom.alertTitle.textContent = title;
  if (dom.alertMessage) dom.alertMessage.textContent = message;
  if (dom.alertModal) dom.alertModal.classList.remove('hidden');

  if (dom.alertOkBtn) {
    const newOkBtn = dom.alertOkBtn.cloneNode(true) as HTMLElement;
    dom.alertOkBtn.replaceWith(newOkBtn);
    dom.alertOkBtn = newOkBtn;

    newOkBtn.addEventListener('click', () => {
      hideAlert();
      if (callback) callback();
    });
  }
};

export const hideAlert = () => {
  if (dom.alertModal) dom.alertModal.classList.add('hidden');
};

export const switchView = (view: string) => {
  if (view === 'grid') {
    dom.gridView.classList.remove('hidden');
    dom.toolInterface.classList.add('hidden');
    // show hero and features and header
    dom.heroSection.classList.remove('hidden');
    dom.featuresSection.classList.remove('hidden');
    dom.toolsHeader.classList.remove('hidden');
    // show dividers
    dom.dividers.forEach((divider) => {
      divider.classList.remove('hidden');
    });
    // show hideSections
    dom.hideSections.forEach((section) => {
      section.classList.remove('hidden');
    });

    resetState();
  } else {
    dom.gridView.classList.add('hidden');
    dom.toolInterface.classList.remove('hidden');
    dom.featuresSection.classList.add('hidden');
    dom.heroSection.classList.add('hidden');
    dom.toolsHeader.classList.add('hidden');
    dom.dividers.forEach((divider) => {
      divider.classList.add('hidden');
    });
    dom.hideSections.forEach((section) => {
      section.classList.add('hidden');
    });
  }
};

const thumbnailState: {
  sortableInstances: Record<string, Sortable>;
} = {
  sortableInstances: {},
};

function initializeOrganizeSortable(containerId: string) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (thumbnailState.sortableInstances[containerId]) {
    thumbnailState.sortableInstances[containerId].destroy();
  }

  thumbnailState.sortableInstances[containerId] = Sortable.create(container, {
    animation: 150,
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    dragClass: 'sortable-drag',
    filter: '.delete-page-btn',
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
 * Renders page thumbnails for tools like 'Organize' and 'Rotate'.
 * @param {string} toolId The ID of the active tool.
 * @param {object} pdfDoc The loaded pdf-lib document instance.
 */
export const renderPageThumbnails = async (
  toolId: string,
  pdfDoc: { save: () => Promise<Uint8Array> }
) => {
  const containerId =
    toolId === 'organize'
      ? 'page-organizer'
      : toolId === 'delete-pages'
        ? 'delete-pages-preview'
        : 'page-rotator';
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = '';

  // Cleanup any previous lazy loading observers
  cleanupLazyRendering();

  const currentRenderId = Date.now();
  container.dataset.renderId = currentRenderId.toString();

  showLoader(t('multiTool.renderingTitle'));

  const pdfData = await pdfDoc.save();
  const pdf = await getPDFDocument({ data: pdfData }).promise;

  // Function to create wrapper element for each page
  const createWrapper = (canvas: HTMLCanvasElement, pageNumber: number) => {
    const wrapper = document.createElement('div');
    wrapper.dataset.pageIndex = String(pageNumber - 1);

    const imgContainer = document.createElement('div');
    imgContainer.className = 'relative';

    const img = document.createElement('img');
    img.src = canvas.toDataURL();
    img.className = 'rounded-md shadow-md max-w-full h-auto';

    imgContainer.appendChild(img);

    const pageNumSpan = document.createElement('div');
    pageNumSpan.className =
      'ui-page-number absolute top-1 left-1 text-xs px-2 py-1 rounded-md font-semibold shadow-lg z-10 pointer-events-none';
    pageNumSpan.textContent = pageNumber.toString();

    if (toolId === 'organize') {
      wrapper.className =
        'ui-thumbnail-card page-thumbnail relative cursor-move flex flex-col items-center gap-1 p-2 border-2 rounded-lg transition-colors group';

      imgContainer.appendChild(pageNumSpan);
      wrapper.appendChild(imgContainer);

      const deleteBtn = document.createElement('button');
      deleteBtn.className =
        'delete-page-btn ui-button-danger absolute top-1 right-1 rounded-full w-6 h-6 flex items-center justify-center z-10';
      deleteBtn.innerHTML = '&times;';
      deleteBtn.addEventListener('click', (e) => {
        (e.currentTarget as HTMLElement).parentElement.remove();

        // Renumber remaining pages
        const pages = container.querySelectorAll('.page-thumbnail');
        pages.forEach((page, index) => {
          const numSpan = page.querySelector('.ui-page-number');
          if (numSpan) {
            numSpan.textContent = (index + 1).toString();
          }
        });

        initializeOrganizeSortable(containerId);
      });

      wrapper.appendChild(deleteBtn);
    } else if (toolId === 'rotate') {
      wrapper.className =
        'ui-thumbnail-card page-rotator-item flex flex-col items-center gap-2 p-2 border-2 rounded-lg transition-colors relative group';

      // Read rotation from state (handles "Rotate All" on lazy-loaded pages)
      const rotationStateArray = getRotationState();
      const pageIndex = pageNumber - 1;
      const initialRotation = rotationStateArray[pageIndex] || 0;

      wrapper.dataset.rotation = initialRotation.toString();
      img.classList.add('transition-transform', 'duration-300');

      // Apply initial rotation if any
      if (initialRotation !== 0) {
        img.style.transform = `rotate(${initialRotation}deg)`;
      }

      imgContainer.appendChild(pageNumSpan);
      wrapper.appendChild(imgContainer);

      const controlsDiv = document.createElement('div');
      controlsDiv.className =
        'flex flex-col lg:flex-row items-center justify-center w-full gap-2 px-1';

      // Custom Stepper Component
      const stepperContainer = document.createElement('div');
      stepperContainer.className =
        'ui-stepper flex items-center border rounded-md overflow-hidden w-24 h-8';

      const decrementBtn = document.createElement('button');
      decrementBtn.className =
        'ui-stepper-button px-2 h-full border-r transition-colors flex items-center justify-center';
      decrementBtn.innerHTML = '<i data-lucide="minus" class="w-3 h-3"></i>';

      const angleInput = document.createElement('input');
      angleInput.type = 'number';
      angleInput.className =
        'no-spinner w-full h-full bg-transparent ui-text-primary text-xs text-center focus:outline-none appearance-none m-0 p-0 border-none';
      angleInput.value = initialRotation.toString();
      angleInput.placeholder = translate('common.dynamic.d44e20976e', '0');

      const incrementBtn = document.createElement('button');
      incrementBtn.className =
        'ui-stepper-button px-2 h-full border-l transition-colors flex items-center justify-center';
      incrementBtn.innerHTML = '<i data-lucide="plus" class="w-3 h-3"></i>';

      // Helper to update rotation
      const updateRotation = (newRotation: number) => {
        const card = wrapper; // Closure capture
        const imgEl = card.querySelector('img');
        const pageIndex = pageNumber - 1;

        // Update UI
        angleInput.value = newRotation.toString();
        card.dataset.rotation = newRotation.toString();
        imgEl.style.transform = `rotate(${newRotation}deg)`;

        // Update State
        updateRotationState(pageIndex, newRotation);
      };

      // Event Listeners
      decrementBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const current = parseInt(angleInput.value) || 0;
        updateRotation(current - 1);
      });

      incrementBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const current = parseInt(angleInput.value) || 0;
        updateRotation(current + 1);
      });

      angleInput.addEventListener('change', (e) => {
        e.stopPropagation();
        const val = parseInt((e.target as HTMLInputElement).value) || 0;
        updateRotation(val);
      });
      angleInput.addEventListener('click', (e) => e.stopPropagation());

      stepperContainer.append(decrementBtn, angleInput, incrementBtn);

      const rotateBtn = document.createElement('button');
      rotateBtn.className =
        'rotate-btn ui-button-secondary p-1.5 rounded-md transition-colors flex-shrink-0';
      rotateBtn.title = translate('common.dynamic.b1c9a82c0a', 'Rotate +90°');
      rotateBtn.innerHTML = '<i data-lucide="rotate-cw" class="w-4 h-4"></i>';
      rotateBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const current = parseInt(angleInput.value) || 0;
        updateRotation(current + 90);
      });

      controlsDiv.append(stepperContainer, rotateBtn);
      wrapper.appendChild(controlsDiv);
    } else if (toolId === 'delete-pages') {
      wrapper.className =
        'ui-thumbnail-card page-thumbnail relative cursor-pointer flex flex-col items-center gap-1 p-2 border-2 rounded-lg transition-colors group';
      wrapper.dataset.pageNumber = pageNumber.toString();

      imgContainer.appendChild(pageNumSpan);
      wrapper.appendChild(imgContainer);

      wrapper.addEventListener('click', () => {
        const input = document.getElementById(
          'pages-to-delete'
        ) as HTMLInputElement;
        if (!input) return;

        const currentVal = input.value;
        let pages = currentVal
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s);
        const pageStr = pageNumber.toString();

        if (pages.includes(pageStr)) {
          pages = pages.filter((p) => p !== pageStr);
        } else {
          pages.push(pageStr);
        }

        pages.sort((a, b) => {
          const numA = parseInt(a.split('-')[0]);
          const numB = parseInt(b.split('-')[0]);
          return numA - numB;
        });

        input.value = pages.join(', ');

        input.dispatchEvent(new Event('input'));
      });
    }

    return wrapper;
  };

  try {
    // Render pages progressively with lazy loading
    await renderPagesProgressively(pdf, container, createWrapper, {
      batchSize: 8,
      useLazyLoading: true,
      lazyLoadMargin: '300px',
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
      shouldCancel: () => {
        return container.dataset.renderId !== currentRenderId.toString();
      },
    });

    if (toolId === 'organize') {
      initializeOrganizeSortable(containerId);
    } else if (toolId === 'delete-pages') {
      // No sortable needed for delete pages
    }

    // Reinitialize lucide icons for dynamically added elements
    createIcons({ icons });

    // Attach Quick Look page preview
    initPagePreview(container, pdf);
  } catch (error) {
    console.error('Error rendering page thumbnails:', error);
    showAlert(t('multiTool.error'), t('multiTool.errorRendering'));
  } finally {
    hideLoader();
  }
};

/**
 * Renders a list of uploaded files in the specified container.
 * @param {HTMLElement} container The DOM element to render the list into.
 * @param {File[]} files The array of file objects.
 */
export const renderFileDisplay = (container: HTMLElement, files: File[]) => {
  container.textContent = translate('common.dynamic.0e455bd98f', '');
  if (files.length > 0) {
    files.forEach((file: File) => {
      const fileDiv = document.createElement('div');
      fileDiv.className =
        'ui-file-row flex items-center justify-between p-3 rounded-lg text-sm';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'truncate font-medium ui-text-primary';
      nameSpan.textContent = file.name;

      const sizeSpan = document.createElement('span');
      sizeSpan.className = 'flex-shrink-0 ml-4 ui-text-secondary';
      sizeSpan.textContent = formatBytes(file.size);

      fileDiv.append(nameSpan, sizeSpan);
      container.appendChild(fileDiv);
    });
  }
};

const createFileInputHTML = (options: FileInputOptions = {}) => {
  const multiple = options.multiple ? 'multiple' : '';
  const acceptedFiles = options.accept || 'application/pdf';
  const showControls = options.showControls || false;

  return `
        <div id="drop-zone" class="ui-panel ui-drop-zone relative flex flex-col items-center justify-center w-full h-48 cursor-pointer transition-colors duration-300">
            <div class="flex flex-col items-center justify-center pt-5 pb-6">
                <i data-lucide="upload-cloud" class="w-10 h-10 mb-3 ui-text-secondary"></i>
                <p class="mb-2 text-sm ui-text-secondary"><span class="font-semibold">${t('upload.clickToSelect')}</span> ${t('upload.orDragAndDrop')}</p>
                <p class="text-xs ui-text-tertiary">${multiple ? t('upload.pdfOrImages') : t('upload.singleFileHint')}</p>
                <p class="text-xs ui-text-tertiary">${t('upload.filesNeverLeave')}</p>
            </div>
            <input id="file-input" type="file" class="ui-input absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer" ${multiple} accept="${acceptedFiles}">
        </div>
        
        ${
          showControls
            ? `
            <!-- NEW: Add control buttons for multi-file uploads -->
            <div id="file-controls" class="hidden mt-4 flex gap-3">
                <button id="add-more-btn" class="btn ui-button-primary font-semibold px-4 py-2 rounded-lg flex items-center gap-2">
                    <i data-lucide="plus"></i> ${t('upload.addMore')}
                </button>
                <button id="clear-files-btn" class="btn ui-button-danger font-semibold px-4 py-2 rounded-lg flex items-center gap-2">
                    <i data-lucide="trash-2"></i> ${t('upload.clearAll')}
                </button>
            </div>
        `
            : ''
        }
    `;
};
