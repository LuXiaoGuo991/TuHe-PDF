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
import { downloadFile, hexToRgb, formatBytes } from '../utils/helpers.js';
import { PDFDocument as PDFLibDocument } from 'pdf-lib';
import { loadPdfWithPasswordPrompt } from '../utils/password-prompt.js';
import {
  addPageNumbers as addPageNumbersToPdf,
  type PageNumberPosition,
  type PageNumberFormat,
} from '../utils/pdf-operations.js';
import { loadPdfDocument } from '../utils/load-pdf-document.js';

interface PageState {
  file: File | null;
  pdfDoc: PDFLibDocument | null;
}

const pageState: PageState = {
  file: null,
  pdfDoc: null,
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

  if (fileInput) {
    fileInput.addEventListener('change', handleFileUpload);
    fileInput.addEventListener('click', () => {
      fileInput.value = '';
    });
  }

  if (dropZone) {
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('ui-border-action');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('ui-border-action');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('ui-border-action');
      if (e.dataTransfer?.files.length) {
        handleFiles(e.dataTransfer.files);
      }
    });
  }

  if (processBtn) {
    processBtn.addEventListener('click', addPageNumbers);
  }
}

function handleFileUpload(e: Event) {
  const input = e.target as HTMLInputElement;
  if (input.files?.length) {
    handleFiles(input.files);
  }
}

async function handleFiles(files: FileList) {
  const file = files[0];
  if (!file || file.type !== 'application/pdf') {
    showAlert(
      translate('alert.invalidFile', 'Invalid File'),
      translate(
        'tools:pageNumbers.dynamic.26e6ad72a2',
        'Please upload a valid PDF file.'
      )
    );
    return;
  }

  try {
    const result = await loadPdfWithPasswordPrompt(file);
    if (!result) return;
    showLoader(translate('fileHandler.loadingPdf', 'Loading PDF...'));

    pageState.pdfDoc = await loadPdfDocument(result.bytes);
    pageState.file = result.file;
    result.pdf.destroy();

    updateFileDisplay();
    document.getElementById('options-panel')?.classList.remove('hidden');
  } catch (error) {
    console.error(error);
    showAlert(
      translate('alert.error', 'Error'),
      translate(
        'tools:pageNumbers.dynamic.1111bc148d',
        'Failed to load PDF file.'
      )
    );
  } finally {
    hideLoader();
  }
}

function updateFileDisplay() {
  const fileDisplayArea = document.getElementById('file-display-area');
  if (!fileDisplayArea || !pageState.file || !pageState.pdfDoc) return;

  fileDisplayArea.innerHTML = '';
  const fileDiv = document.createElement('div');
  fileDiv.className =
    'flex items-center justify-between ui-bg-raised p-3 rounded-lg';

  const infoContainer = document.createElement('div');
  infoContainer.className = 'flex flex-col flex-1 min-w-0';

  const nameSpan = document.createElement('div');
  nameSpan.className = 'truncate font-medium ui-text-primary text-sm mb-1';
  nameSpan.textContent = pageState.file.name;

  const metaSpan = document.createElement('div');
  metaSpan.className = 'text-xs ui-text-secondary';
  metaSpan.textContent = translate(
    'tools:pageNumbers.dynamic.b20dee6fba',
    `${formatBytes(pageState.file.size)} • ${pageState.pdfDoc.getPageCount()} pages`,
    {
      value0: formatBytes(pageState.file.size),
      value1: pageState.pdfDoc.getPageCount(),
    }
  );

  infoContainer.append(nameSpan, metaSpan);

  const removeBtn = document.createElement('button');
  removeBtn.className =
    'ml-4 ui-text-danger ui-hover-text-danger flex-shrink-0';
  removeBtn.innerHTML = '<i data-lucide="trash-2" class="w-4 h-4"></i>';
  removeBtn.onclick = resetState;

  fileDiv.append(infoContainer, removeBtn);
  fileDisplayArea.appendChild(fileDiv);
  createIcons({ icons });
}

function resetState() {
  pageState.file = null;
  pageState.pdfDoc = null;
  const fileDisplayArea = document.getElementById('file-display-area');
  if (fileDisplayArea) fileDisplayArea.innerHTML = '';
  document.getElementById('options-panel')?.classList.add('hidden');
  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  if (fileInput) fileInput.value = '';
}

async function addPageNumbers() {
  if (!pageState.pdfDoc) {
    showAlert(
      translate('alert.error', 'Error'),
      translate(
        'tools:pageNumbers.dynamic.c1a36bf7c8',
        'Please upload a PDF file first.'
      )
    );
    return;
  }

  showLoader(
    translate('tools:pageNumbers.dynamic.2aae7ec78b', 'Adding page numbers...')
  );
  try {
    const position = (document.getElementById('position') as HTMLSelectElement)
      .value as PageNumberPosition;
    const fontSize =
      parseInt(
        (document.getElementById('font-size') as HTMLInputElement).value
      ) || 12;
    const format =
      (document.getElementById('number-format') as HTMLSelectElement).value ===
      'page_x_of_y'
        ? ('page_x_of_y' as PageNumberFormat)
        : ('simple' as PageNumberFormat);
    const colorHex = (document.getElementById('text-color') as HTMLInputElement)
      .value;
    const textColor = hexToRgb(colorHex);

    const pdfBytes = new Uint8Array(await pageState.pdfDoc.save());
    const resultBytes = await addPageNumbersToPdf(pdfBytes, {
      position,
      fontSize,
      format,
      color: textColor,
    });

    downloadFile(
      new Blob([resultBytes as unknown as BlobPart], {
        type: 'application/pdf',
      }),
      pageState.file?.name || 'document.pdf'
    );
    showAlert(
      translate('alert.success', 'Success'),
      translate(
        'tools:pageNumbers.dynamic.8616021b4d',
        'Page numbers added successfully!'
      ),
      'success',
      () => {
        resetState();
      }
    );
  } catch (e) {
    console.error(e);
    showAlert(
      translate('alert.error', 'Error'),
      translate(
        'tools:pageNumbers.dynamic.9f528540a0',
        'Could not add page numbers.'
      )
    );
  } finally {
    hideLoader();
  }
}
