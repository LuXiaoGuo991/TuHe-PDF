import { createIcons, icons } from 'lucide';
import { showAlert, showLoader, hideLoader } from '../ui.js';
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
import { loadPyMuPDF } from '../utils/pymupdf-loader.js';
import type { PyMuPDFInstance } from '@/types';
import {
  getSelectedQuality,
  compressImageFile,
} from '../utils/image-compress.js';

const SUPPORTED_FORMATS = '.jpg,.jpeg,.jp2,.jpx';
const SUPPORTED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/jp2'];

let files: File[] = [];
let pymupdf: PyMuPDFInstance | null = null;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePage);
} else {
  initializePage();
}

function initializePage() {
  createIcons({ icons });

  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  const dropZone = document.getElementById('drop-zone');
  const addMoreBtn = document.getElementById('add-more-btn');
  const clearFilesBtn = document.getElementById('clear-files-btn');
  const processBtn = document.getElementById('process-btn');

  if (fileInput) {
    fileInput.addEventListener('change', handleFileUpload);
  }

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
      if (droppedFiles && droppedFiles.length > 0) {
        handleFiles(droppedFiles);
      }
    });

    fileInput?.addEventListener('click', () => {
      if (fileInput) fileInput.value = '';
    });
  }

  if (addMoreBtn) {
    addMoreBtn.addEventListener('click', () => {
      fileInput?.click();
    });
  }

  if (clearFilesBtn) {
    clearFilesBtn.addEventListener('click', () => {
      files = [];
      updateUI();
    });
  }

  if (processBtn) {
    processBtn.addEventListener('click', convertToPdf);
  }
}

function handleFileUpload(e: Event) {
  const input = e.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    handleFiles(input.files);
  }
}

function getFileExtension(filename: string): string {
  return '.' + (filename.split('.').pop()?.toLowerCase() || '');
}

function isValidImageFile(file: File): boolean {
  const ext = getFileExtension(file.name);
  const validExtensions = SUPPORTED_FORMATS.split(',');
  return (
    validExtensions.includes(ext) || SUPPORTED_MIME_TYPES.includes(file.type)
  );
}

function handleFiles(newFiles: FileList) {
  const validFiles = Array.from(newFiles).filter(isValidImageFile);

  if (validFiles.length < newFiles.length) {
    showAlert(
      translate('tools:jpgToPdf.invalidFilesTitle', 'Invalid Files'),
      translate(
        'tools:jpgToPdf.invalidFilesMsg',
        'Some files were skipped. Only JPG, JPEG, JP2, and JPX files are allowed.'
      )
    );
  }

  if (validFiles.length > 0) {
    files = [...files, ...validFiles];
    updateUI();
  }
}

const resetState = () => {
  files = [];
  updateUI();
};

function updateUI() {
  const fileDisplayArea = document.getElementById('file-display-area');
  const fileControls = document.getElementById('file-controls');
  const optionsDiv = document.getElementById('jpg-to-pdf-options');

  if (!fileDisplayArea || !fileControls || !optionsDiv) return;

  fileDisplayArea.innerHTML = '';

  if (files.length > 0) {
    fileControls.classList.remove('hidden');
    optionsDiv.classList.remove('hidden');

    files.forEach((file, index) => {
      const fileDiv = document.createElement('div');
      fileDiv.className =
        'flex items-center justify-between ui-bg-raised p-3 rounded-lg text-sm';

      const infoContainer = document.createElement('div');
      infoContainer.className = 'flex items-center gap-2 overflow-hidden';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'truncate font-medium ui-text-primary';
      nameSpan.textContent = file.name;

      const sizeSpan = document.createElement('span');
      sizeSpan.className = 'flex-shrink-0 ui-text-secondary text-xs';
      sizeSpan.textContent = `(${formatBytes(file.size)})`;

      infoContainer.append(nameSpan, sizeSpan);

      const removeBtn = document.createElement('button');
      removeBtn.className =
        'ml-4 ui-text-danger ui-hover-text-danger flex-shrink-0';
      removeBtn.innerHTML = '<i data-lucide="trash-2" class="w-4 h-4"></i>';
      removeBtn.onclick = () => {
        files = files.filter((_, i) => i !== index);
        updateUI();
      };

      fileDiv.append(infoContainer, removeBtn);
      fileDisplayArea.appendChild(fileDiv);
    });
    createIcons({ icons });
  } else {
    fileControls.classList.add('hidden');
    optionsDiv.classList.add('hidden');
  }
}

async function ensurePyMuPDF(): Promise<PyMuPDFInstance> {
  if (!pymupdf) {
    pymupdf = (await loadPyMuPDF()) as PyMuPDFInstance;
  }
  return pymupdf;
}

async function convertToPdf() {
  if (files.length === 0) {
    showAlert(
      translate('alert.noFiles', 'No Files'),
      translate(
        'tools:jpgToPdf.noFilesMsg',
        'Please select at least one JPG or JPEG2000 image.'
      )
    );
    return;
  }

  showLoader(translate('tools:jpgToPdf.loadingEngine', 'Loading engine...'));

  try {
    const mupdf = await ensurePyMuPDF();

    showLoader(
      translate('tools:jpgToPdf.converting', 'Converting images to PDF...')
    );
    const quality = getSelectedQuality();
    const compressedFiles: File[] = [];
    for (const file of files) {
      compressedFiles.push(await compressImageFile(file, quality));
    }

    const pdfBlob = await mupdf.imagesToPdf(compressedFiles);

    downloadFile(pdfBlob, 'from_jpgs.pdf');

    showAlert(
      translate('alert.success', 'Success'),
      translate('tools:jpgToPdf.createSuccess', 'PDF created successfully!'),
      'success',
      () => {
        resetState();
      }
    );
  } catch (e: unknown) {
    console.error('[JpgToPdf]', e);
    showAlert(
      translate('tools:jpgToPdf.conversionErrorTitle', 'Conversion Error'),
      e instanceof Error
        ? e.message
        : translate(
            'tools:jpgToPdf.convertFailed',
            'Failed to convert images to PDF.'
          )
    );
  } finally {
    hideLoader();
  }
}
