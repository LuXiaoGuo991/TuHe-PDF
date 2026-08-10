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
import {
  formatBytes,
  downloadFile,
  parsePageRanges,
} from '../utils/helpers.js';
import { PDFDocument } from 'pdf-lib';
import { loadPdfWithPasswordPrompt } from '../utils/password-prompt.js';
import JSZip from 'jszip';
import { loadPdfDocument } from '../utils/load-pdf-document.js';

interface ExtractState {
  file: File | null;
  pdfDoc: PDFDocument | null;
  totalPages: number;
}

const extractState: ExtractState = {
  file: null,
  pdfDoc: null,
  totalPages: 0,
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
  }

  if (dropZone) {
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('bg-gray-700');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('bg-gray-700');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('bg-gray-700');
      const droppedFiles = e.dataTransfer?.files;
      if (droppedFiles && droppedFiles.length > 0) {
        handleFile(droppedFiles[0]);
      }
    });

    // Clear value on click to allow re-selecting the same file
    fileInput?.addEventListener('click', () => {
      if (fileInput) fileInput.value = '';
    });
  }

  if (processBtn) {
    processBtn.addEventListener('click', extractPages);
  }

  document.getElementById('back-to-tools')?.addEventListener('click', () => {
    window.location.href = import.meta.env.BASE_URL;
  });
}

function handleFileUpload(e: Event) {
  const input = e.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    handleFile(input.files[0]);
  }
}

async function handleFile(file: File) {
  if (
    file.type !== 'application/pdf' &&
    !file.name.toLowerCase().endsWith('.pdf')
  ) {
    showAlert(
      translate('alert.invalidFile', 'Invalid File'),
      translate(
        'tools:extractPages.dynamic.9e33c22c50',
        'Please select a PDF file.'
      )
    );
    return;
  }

  extractState.file = file;

  try {
    const result = await loadPdfWithPasswordPrompt(file);
    if (!result) {
      extractState.file = null;
      return;
    }
    showLoader(translate('fileHandler.loadingPdf', 'Loading PDF...'));
    extractState.file = result.file;
    result.pdf.destroy();
    extractState.pdfDoc = await loadPdfDocument(result.bytes);
    extractState.totalPages = extractState.pdfDoc.getPageCount();

    updateFileDisplay();
    showOptions();
    hideLoader();
  } catch (error) {
    console.error('Error loading PDF:', error);
    hideLoader();
    showAlert(
      translate('alert.error', 'Error'),
      translate(
        'tools:extractPages.dynamic.6a04af93b9',
        'Failed to load PDF file.'
      )
    );
  }
}

function updateFileDisplay() {
  const fileDisplayArea = document.getElementById('file-display-area');
  if (!fileDisplayArea || !extractState.file) return;

  fileDisplayArea.innerHTML = '';
  const fileDiv = document.createElement('div');
  fileDiv.className =
    'flex items-center justify-between bg-gray-700 p-3 rounded-lg';

  const infoContainer = document.createElement('div');
  infoContainer.className = 'flex flex-col flex-1 min-w-0';

  const nameSpan = document.createElement('div');
  nameSpan.className = 'truncate font-medium text-gray-200 text-sm mb-1';
  nameSpan.textContent = extractState.file.name;

  const metaSpan = document.createElement('div');
  metaSpan.className = 'text-xs text-gray-400';
  metaSpan.textContent = translate(
    'tools:extractPages.dynamic.56a397a4ca',
    `${formatBytes(extractState.file.size)} • ${extractState.totalPages} pages`,
    {
      value0: formatBytes(extractState.file.size),
      value1: extractState.totalPages,
    }
  );

  infoContainer.append(nameSpan, metaSpan);

  const removeBtn = document.createElement('button');
  removeBtn.className = 'ml-4 text-red-400 hover:text-red-300 flex-shrink-0';
  removeBtn.innerHTML = '<i data-lucide="trash-2" class="w-4 h-4"></i>';
  removeBtn.onclick = () => resetState();

  fileDiv.append(infoContainer, removeBtn);
  fileDisplayArea.appendChild(fileDiv);
  createIcons({ icons });
}

function showOptions() {
  const extractOptions = document.getElementById('extract-options');
  const totalPagesSpan = document.getElementById('total-pages');

  if (extractOptions) {
    extractOptions.classList.remove('hidden');
  }
  if (totalPagesSpan) {
    totalPagesSpan.textContent = extractState.totalPages.toString();
  }
}

async function extractPages() {
  const pagesInput = document.getElementById(
    'pages-to-extract'
  ) as HTMLInputElement;
  if (!pagesInput || !pagesInput.value.trim()) {
    showAlert(
      translate('tools:extractPages.dynamic.1aa78bee2c', 'No Pages'),
      translate(
        'tools:extractPages.dynamic.82c32efccc',
        'Please enter page numbers to extract.'
      )
    );
    return;
  }

  const pagesToExtract = parsePageRanges(
    pagesInput.value,
    extractState.totalPages
  ).map((i) => i + 1);
  if (pagesToExtract.length === 0) {
    showAlert(
      translate('tools:extractPages.dynamic.8eaf742272', 'Invalid Pages'),
      translate(
        'tools:extractPages.dynamic.f2ad1b2d1f',
        'No valid page numbers found.'
      )
    );
    return;
  }

  showLoader(
    translate('tools:extractPages.dynamic.5632ead150', 'Extracting pages...')
  );

  try {
    const zip = new JSZip();
    const baseName = extractState.file?.name.replace('.pdf', '') || 'document';

    for (const pageNum of pagesToExtract) {
      const newPdf = await PDFDocument.create();
      const [copiedPage] = await newPdf.copyPages(extractState.pdfDoc, [
        pageNum - 1,
      ]);
      newPdf.addPage(copiedPage);
      const pdfBytes = await newPdf.save();
      zip.file(`${baseName}_page_${pageNum}.pdf`, pdfBytes);
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    downloadFile(zipBlob, `${baseName}_extracted_pages.zip`);

    hideLoader();
    showAlert(
      translate('alert.success', 'Success'),
      translate(
        'tools:extractPages.dynamic.54565c518f',
        `Extracted ${pagesToExtract.length} page(s) successfully!`,
        { value0: pagesToExtract.length }
      ),
      'success',
      () => {
        resetState();
      }
    );
  } catch (error) {
    console.error('Error extracting pages:', error);
    hideLoader();
    showAlert(
      translate('alert.error', 'Error'),
      translate(
        'tools:extractPages.dynamic.fa1284f132',
        'Failed to extract pages.'
      )
    );
  }
}

function resetState() {
  extractState.file = null;
  extractState.pdfDoc = null;
  extractState.totalPages = 0;

  const extractOptions = document.getElementById('extract-options');
  if (extractOptions) {
    extractOptions.classList.add('hidden');
  }

  const fileDisplayArea = document.getElementById('file-display-area');
  if (fileDisplayArea) {
    fileDisplayArea.innerHTML = '';
  }

  const pagesInput = document.getElementById(
    'pages-to-extract'
  ) as HTMLInputElement;
  if (pagesInput) {
    pagesInput.value = '';
  }
}
