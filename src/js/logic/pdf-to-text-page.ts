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
import { downloadFile, formatBytes } from '../utils/helpers.js';
import { loadPyMuPDF } from '../utils/pymupdf-loader.js';
import type { PyMuPDFInstance } from '@/types';
import { batchDecryptIfNeeded } from '../utils/password-prompt.js';
import { deduplicateFileName } from '../utils/deduplicate-filename.js';

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
  const processBtn = document.getElementById(
    'process-btn'
  ) as HTMLButtonElement;

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
    processBtn.addEventListener('click', extractText);
  }
}

function handleFileUpload(e: Event) {
  const input = e.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    handleFiles(input.files);
  }
}

function handleFiles(newFiles: FileList) {
  const validFiles = Array.from(newFiles).filter(
    (file) =>
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf')
  );

  if (validFiles.length < newFiles.length) {
    showAlert(
      translate('tools:pdfToText.dynamic.3003a34022', 'Invalid Files'),
      translate(
        'tools:pdfToText.dynamic.fad4a0bfb8',
        'Some files were skipped. Only PDF files are allowed.'
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
  const extractOptions = document.getElementById('extract-options');

  if (!fileDisplayArea || !fileControls || !extractOptions) return;

  fileDisplayArea.innerHTML = '';

  if (files.length > 0) {
    fileControls.classList.remove('hidden');
    extractOptions.classList.remove('hidden');

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
      sizeSpan.textContent = translate(
        'tools:pdfToText.dynamic.2a17bf4990',
        `(${formatBytes(file.size)})`,
        { value0: formatBytes(file.size) }
      );

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
    extractOptions.classList.add('hidden');
  }
}

async function ensurePyMuPDF(): Promise<PyMuPDFInstance> {
  if (!pymupdf) {
    pymupdf = (await loadPyMuPDF()) as PyMuPDFInstance;
  }
  return pymupdf;
}

async function extractText() {
  if (files.length === 0) {
    showAlert(
      translate('alert.noFiles', 'No Files'),
      translate(
        'tools:pdfToText.dynamic.9b20a15e20',
        'Please select at least one PDF file.'
      )
    );
    return;
  }

  showLoader(
    translate('tools:pdfToText.dynamic.3cd2bcee0a', 'Loading engine...')
  );

  try {
    const mupdf = await ensurePyMuPDF();

    hideLoader();
    files = await batchDecryptIfNeeded(files);
    showLoader(
      translate('tools:pdfToText.dynamic.7f1788f372', 'Extracting text...')
    );

    if (files.length === 1) {
      const file = files[0];
      showLoader(
        translate(
          'tools:pdfToText.dynamic.f3aeb819f5',
          `Extracting text from ${file.name}...`,
          { value0: file.name }
        )
      );

      const fullText = await mupdf.pdfToText(file);

      const baseName = file.name.replace(/\.pdf$/i, '');
      const textBlob = new Blob([fullText], {
        type: 'text/plain;charset=utf-8',
      });
      downloadFile(textBlob, `${baseName}.txt`);

      hideLoader();
      showAlert(
        translate('alert.success', 'Success'),
        translate(
          'tools:pdfToText.dynamic.c8c1d4f740',
          'Text extracted successfully!'
        ),
        'success',
        () => {
          resetState();
        }
      );
    } else {
      showLoader(
        translate(
          'tools:pdfToText.dynamic.7f3721e1f5',
          'Extracting text from multiple files...'
        )
      );

      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const usedNames = new Set<string>();

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        showLoader(
          translate(
            'tools:pdfToText.dynamic.53e9bab963',
            `Extracting text from file ${i + 1}/${files.length}: ${file.name}...`,
            { value0: i + 1, value1: files.length, value2: file.name }
          )
        );

        const fullText = await mupdf.pdfToText(file);

        const baseName = file.name.replace(/\.pdf$/i, '');
        const zipEntryName = deduplicateFileName(`${baseName}.txt`, usedNames);
        zip.file(zipEntryName, fullText);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadFile(zipBlob, 'pdf-to-text.zip');

      hideLoader();
      showAlert(
        translate('alert.success', 'Success'),
        translate(
          'tools:pdfToText.dynamic.8389aa2a38',
          `Extracted text from ${files.length} PDF files!`,
          { value0: files.length }
        ),
        'success',
        () => {
          resetState();
        }
      );
    }
  } catch (e: unknown) {
    console.error('[PDFToText]', e);
    hideLoader();
    showAlert(
      translate('tools:pdfToText.dynamic.bd2ff6bec3', 'Extraction Error'),
      translate('alert.processFailed', 'Processing failed. Please try again.')
    );
  }
}
