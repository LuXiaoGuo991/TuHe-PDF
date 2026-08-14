import { t } from '../i18n/i18n';

const translate = (
  key: string,
  fallback: string,
  options?: Record<string, unknown>
) => {
  const value = t(key, options);
  return value && value !== key ? value : fallback;
};

import { showAlert } from '../ui.js';
import {
  downloadFile,
  formatBytes,
  initializeQpdf,
  readFileAsArrayBuffer,
} from '../utils/helpers.js';
import { icons, createIcons } from 'lucide';
import { RemoveRestrictionsState, QpdfInstanceExtended } from '@/types';

const pageState: RemoveRestrictionsState = {
  file: null,
};

function resetState() {
  pageState.file = null;

  const fileDisplayArea = document.getElementById('file-display-area');
  if (fileDisplayArea) fileDisplayArea.innerHTML = '';

  const toolOptions = document.getElementById('tool-options');
  if (toolOptions) toolOptions.classList.add('hidden');

  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  if (fileInput) fileInput.value = '';

  const passwordInput = document.getElementById(
    'owner-password-remove'
  ) as HTMLInputElement;
  if (passwordInput) passwordInput.value = '';
}

async function updateUI() {
  const fileDisplayArea = document.getElementById('file-display-area');
  const toolOptions = document.getElementById('tool-options');

  if (!fileDisplayArea) return;

  fileDisplayArea.innerHTML = '';

  if (pageState.file) {
    const fileDiv = document.createElement('div');
    fileDiv.className =
      'flex items-center justify-between ui-bg-raised p-3 rounded-lg text-sm';

    const infoContainer = document.createElement('div');
    infoContainer.className = 'flex flex-col overflow-hidden';

    const nameSpan = document.createElement('div');
    nameSpan.className = 'truncate font-medium ui-text-primary text-sm mb-1';
    nameSpan.textContent = pageState.file.name;

    const metaSpan = document.createElement('div');
    metaSpan.className = 'text-xs ui-text-secondary';
    metaSpan.textContent = formatBytes(pageState.file.size);

    infoContainer.append(nameSpan, metaSpan);

    const removeBtn = document.createElement('button');
    removeBtn.className =
      'ml-4 ui-text-danger ui-hover-text-danger flex-shrink-0';
    removeBtn.innerHTML = '<i data-lucide="trash-2" class="w-4 h-4"></i>';
    removeBtn.onclick = function () {
      resetState();
    };

    fileDiv.append(infoContainer, removeBtn);
    fileDisplayArea.appendChild(fileDiv);
    createIcons({ icons });

    if (toolOptions) toolOptions.classList.remove('hidden');
  } else {
    if (toolOptions) toolOptions.classList.add('hidden');
  }
}

function handleFileSelect(files: FileList | null) {
  if (files && files.length > 0) {
    const file = files[0];
    if (
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf')
    ) {
      pageState.file = file;
      updateUI();
    }
  }
}

async function removeRestrictions() {
  if (!pageState.file) {
    showAlert(
      translate('tools:removeRestrictions.dynamic.2de7e01738', 'No File'),
      translate(
        'tools:removeRestrictions.dynamic.9afe460e3d',
        'Please upload a PDF file first.'
      )
    );
    return;
  }

  const password =
    (document.getElementById('owner-password-remove') as HTMLInputElement)
      ?.value || '';

  const inputPath = '/input.pdf';
  const outputPath = '/output.pdf';
  let qpdf: QpdfInstanceExtended;

  const loaderModal = document.getElementById('loader-modal');
  const loaderText = document.getElementById('loader-text');

  try {
    if (loaderModal) loaderModal.classList.remove('hidden');
    if (loaderText)
      loaderText.textContent = translate(
        'tools:removeRestrictions.dynamic.ae0f78ae39',
        'Initializing...'
      );

    qpdf = await initializeQpdf();

    if (loaderText)
      loaderText.textContent = translate(
        'tools:removeRestrictions.dynamic.a4f489ba51',
        'Reading PDF...'
      );
    const fileBuffer = await readFileAsArrayBuffer(pageState.file);
    const uint8Array = new Uint8Array(fileBuffer as ArrayBuffer);

    qpdf.FS.writeFile(inputPath, uint8Array);

    if (loaderText)
      loaderText.textContent = translate(
        'tools:removeRestrictions.dynamic.0af8548308',
        'Removing restrictions...'
      );

    const args = [inputPath];

    if (password) {
      args.push(`--password=${password}`);
    }

    args.push('--decrypt', '--remove-restrictions', '--', outputPath);

    try {
      qpdf.callMain(args);
    } catch (qpdfError: unknown) {
      console.error('qpdf execution error:', qpdfError);
      const qpdfMsg = qpdfError instanceof Error ? qpdfError.message : '';
      if (qpdfMsg.includes('password') || qpdfMsg.includes('encrypt')) {
        throw new Error(
          'Failed to remove restrictions. The PDF may require the correct owner password.',
          { cause: qpdfError }
        );
      }

      throw new Error(
        'Failed to remove restrictions: ' + (qpdfMsg || 'Unknown error'),
        { cause: qpdfError }
      );
    }

    if (loaderText)
      loaderText.textContent = translate(
        'tools:removeRestrictions.dynamic.8f0ab838a0',
        'Preparing download...'
      );
    const outputFile = qpdf.FS.readFile(outputPath, { encoding: 'binary' });

    if (!outputFile || outputFile.length === 0) {
      throw new Error('Operation resulted in an empty file.');
    }

    const blob = new Blob([new Uint8Array(outputFile)], {
      type: 'application/pdf',
    });
    downloadFile(blob, pageState.file.name);

    if (loaderModal) loaderModal.classList.add('hidden');

    showAlert(
      translate('alert.success', 'Success'),
      translate(
        'tools:removeRestrictions.dynamic.d7ab0131b2',
        'PDF restrictions removed successfully! The file is now fully editable and printable.'
      ),
      'success',
      () => {
        resetState();
      }
    );
  } catch (error: unknown) {
    console.error('Error during restriction removal:', error);
    if (loaderModal) loaderModal.classList.add('hidden');
    showAlert(
      translate(
        'tools:removeRestrictions.dynamic.3cbb1317ff',
        'Operation Failed'
      ),
      translate('alert.processFailed', 'Processing failed. Please try again.')
    );
  } finally {
    try {
      if (qpdf?.FS) {
        try {
          qpdf.FS.unlink(inputPath);
        } catch (e) {
          console.warn('Failed to unlink input file:', e);
        }
        try {
          qpdf.FS.unlink(outputPath);
        } catch (e) {
          console.warn('Failed to unlink output file:', e);
        }
      }
    } catch (cleanupError) {
      console.warn('Failed to cleanup WASM FS:', cleanupError);
    }
  }
}

document.addEventListener('DOMContentLoaded', function () {
  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  const dropZone = document.getElementById('drop-zone');
  const processBtn = document.getElementById('process-btn');

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
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        const pdfFiles = Array.from(files).filter(function (f) {
          return (
            f.type === 'application/pdf' ||
            f.name.toLowerCase().endsWith('.pdf')
          );
        });
        if (pdfFiles.length > 0) {
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(pdfFiles[0]);
          handleFileSelect(dataTransfer.files);
        }
      }
    });

    fileInput.addEventListener('click', function () {
      fileInput.value = '';
    });
  }

  if (processBtn) {
    processBtn.addEventListener('click', removeRestrictions);
  }
});
