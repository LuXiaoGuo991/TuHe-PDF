import { showAlert } from '../ui.js';
import { t } from '../i18n/i18n';

const translate = (
  key: string,
  fallback: string,
  options?: Record<string, unknown>
) => {
  const translation = t(key, options);
  return translation && translation !== key ? translation : fallback;
};
import { downloadFile, formatBytes } from '../utils/helpers.js';
import { convertFileToOutlines } from '../utils/ghostscript-loader.js';
import { isGhostscriptAvailable } from '../utils/ghostscript-dynamic-loader.js';
import { showWasmRequiredDialog } from '../utils/wasm-provider.js';
import { batchDecryptIfNeeded } from '../utils/password-prompt.js';
import { icons, createIcons } from 'lucide';
import JSZip from 'jszip';
import { deduplicateFileName } from '../utils/deduplicate-filename.js';

interface FontToOutlineState {
  files: File[];
}

const pageState: FontToOutlineState = {
  files: [],
};

function resetState() {
  pageState.files = [];

  const fileDisplayArea = document.getElementById('file-display-area');
  if (fileDisplayArea) fileDisplayArea.innerHTML = '';

  const toolOptions = document.getElementById('tool-options');
  if (toolOptions) toolOptions.classList.add('hidden');

  const fileControls = document.getElementById('file-controls');
  if (fileControls) fileControls.classList.add('hidden');

  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  if (fileInput) fileInput.value = '';
}

async function updateUI() {
  const fileDisplayArea = document.getElementById('file-display-area');
  const toolOptions = document.getElementById('tool-options');
  const fileControls = document.getElementById('file-controls');

  if (!fileDisplayArea) return;

  fileDisplayArea.innerHTML = '';

  if (pageState.files.length > 0) {
    pageState.files.forEach((file, index) => {
      const fileDiv = document.createElement('div');
      fileDiv.className =
        'flex items-center justify-between ui-bg-raised p-3 rounded-lg text-sm';

      const infoContainer = document.createElement('div');
      infoContainer.className = 'flex flex-col overflow-hidden';

      const nameSpan = document.createElement('div');
      nameSpan.className = 'truncate font-medium ui-text-primary text-sm mb-1';
      nameSpan.textContent = file.name;

      const metaSpan = document.createElement('div');
      metaSpan.className = 'text-xs ui-text-secondary';
      metaSpan.textContent = formatBytes(file.size);

      infoContainer.append(nameSpan, metaSpan);

      const removeBtn = document.createElement('button');
      removeBtn.className =
        'ml-4 ui-text-danger ui-hover-text-danger flex-shrink-0';
      removeBtn.innerHTML = '<i data-lucide="trash-2" class="w-4 h-4"></i>';
      removeBtn.onclick = function () {
        pageState.files.splice(index, 1);
        updateUI();
      };

      fileDiv.append(infoContainer, removeBtn);
      fileDisplayArea.appendChild(fileDiv);
    });

    createIcons({ icons });

    if (toolOptions) toolOptions.classList.remove('hidden');
    if (fileControls) fileControls.classList.remove('hidden');
  } else {
    if (toolOptions) toolOptions.classList.add('hidden');
    if (fileControls) fileControls.classList.add('hidden');
  }
}

function handleFileSelect(files: FileList | null) {
  if (files && files.length > 0) {
    const pdfFiles = Array.from(files).filter(
      (f) =>
        f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );
    if (pdfFiles.length > 0) {
      pageState.files.push(...pdfFiles);
      updateUI();
    }
  }
}

async function processFiles() {
  if (pageState.files.length === 0) {
    showAlert(
      translate('alert.noFiles', 'No Files'),
      translate(
        'tools:fontToOutline.dynamic.ff6a22c28e',
        'Please select at least one PDF file.'
      )
    );
    return;
  }

  // Check if Ghostscript is configured
  if (!isGhostscriptAvailable()) {
    showWasmRequiredDialog('ghostscript');
    return;
  }

  pageState.files = await batchDecryptIfNeeded(pageState.files);

  const loaderModal = document.getElementById('loader-modal');
  const loaderText = document.getElementById('loader-text');

  try {
    if (pageState.files.length === 1) {
      if (loaderModal) loaderModal.classList.remove('hidden');
      if (loaderText)
        loaderText.textContent = translate(
          'tools:fontToOutline.dynamic.7db89a06ed',
          'Converting fonts to outlines...'
        );

      const file = pageState.files[0];
      const resultBlob = await convertFileToOutlines(file, (msg) => {
        if (loaderText) loaderText.textContent = msg;
      });

      downloadFile(resultBlob, file.name);
      if (loaderModal) loaderModal.classList.add('hidden');
    } else {
      if (loaderModal) loaderModal.classList.remove('hidden');
      if (loaderText)
        loaderText.textContent = translate(
          'tools:fontToOutline.dynamic.b9e71d80df',
          'Processing multiple PDFs...'
        );

      const zip = new JSZip();
      const usedNames = new Set<string>();
      let processedCount = 0;

      for (let i = 0; i < pageState.files.length; i++) {
        const file = pageState.files[i];
        if (loaderText)
          loaderText.textContent = translate(
            'tools:fontToOutline.dynamic.d4bf39f87d',
            `Processing ${i + 1}/${pageState.files.length}: ${file.name}...`,
            { value0: i + 1, value1: pageState.files.length, value2: file.name }
          );

        try {
          const resultBlob = await convertFileToOutlines(file, () => {});
          const arrayBuffer = await resultBlob.arrayBuffer();
          const zipEntryName = deduplicateFileName(file.name, usedNames);
          zip.file(zipEntryName, arrayBuffer);
          processedCount++;
        } catch (e) {
          console.error(`Error processing ${file.name}:`, e);
        }
      }

      if (processedCount > 0) {
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        downloadFile(zipBlob, 'outlined_pdfs.zip');
        showAlert(
          translate('alert.success', 'Success'),
          translate(
            'tools:fontToOutline.dynamic.759b439f61',
            `Processed ${processedCount} PDFs.`,
            { value0: processedCount }
          ),
          'success',
          () => {
            resetState();
          }
        );
      } else {
        showAlert(
          translate('alert.error', 'Error'),
          translate(
            'tools:fontToOutline.dynamic.bc182f005b',
            'No PDFs could be processed.'
          )
        );
      }
      if (loaderModal) loaderModal.classList.add('hidden');
    }
  } catch (e: unknown) {
    console.error(e);
    if (loaderModal) loaderModal.classList.add('hidden');
    const errorMessage =
      e instanceof Error ? e.message : 'An unexpected error occurred.';
    showAlert(
      translate('alert.error', 'Error'),
      translate('alert.processFailed', 'Processing failed. Please try again.')
    );
  }
}

document.addEventListener('DOMContentLoaded', function () {
  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  const dropZone = document.getElementById('drop-zone');
  const processBtn = document.getElementById('process-btn');
  const addMoreBtn = document.getElementById('add-more-btn');
  const clearFilesBtn = document.getElementById('clear-files-btn');
  const backBtn = document.getElementById('back-to-tools');

  if (backBtn) {
    backBtn.addEventListener('click', function () {
      window.location.href = import.meta.env.BASE_URL;
    });
  }

  if (fileInput && dropZone) {
    fileInput.addEventListener('change', function (e) {
      handleFileSelect((e.target as HTMLInputElement).files);
    });

    dropZone.addEventListener('dragover', function (e) {
      e.preventDefault();
      dropZone.classList.add('ui-bg-raised');
    });

    dropZone.addEventListener('dragleave', function (e) {
      e.preventDefault();
      dropZone.classList.remove('ui-bg-raised');
    });

    dropZone.addEventListener('drop', function (e) {
      e.preventDefault();
      dropZone.classList.remove('ui-bg-raised');
      handleFileSelect(e.dataTransfer?.files);
    });

    fileInput.addEventListener('click', function () {
      fileInput.value = '';
    });
  }

  if (processBtn) {
    processBtn.addEventListener('click', processFiles);
  }

  if (addMoreBtn) {
    addMoreBtn.addEventListener('click', function () {
      fileInput.value = '';
      fileInput.click();
    });
  }

  if (clearFilesBtn) {
    clearFilesBtn.addEventListener('click', function () {
      resetState();
    });
  }
});
