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
import { PDFDocument as PDFLibDocument, rgb } from 'pdf-lib';
import { BackgroundColorState } from '@/types';
import { loadPdfWithPasswordPrompt } from '../utils/password-prompt.js';
import { loadPdfDocument } from '../utils/load-pdf-document.js';

const pageState: BackgroundColorState = { file: null, pdfDoc: null };

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePage);
} else {
  initializePage();
}

function initializePage() {
  createIcons({ icons });
  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  const dropZone = document.getElementById('drop-zone');
  const backBtn = document.getElementById('back-to-tools');
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
      if (e.dataTransfer?.files.length) handleFiles(e.dataTransfer.files);
    });
  }
  if (backBtn)
    backBtn.addEventListener('click', () => {
      window.location.href = import.meta.env.BASE_URL;
    });
  if (processBtn) processBtn.addEventListener('click', changeBackgroundColor);
}

function handleFileUpload(e: Event) {
  const input = e.target as HTMLInputElement;
  if (input.files?.length) handleFiles(input.files);
}

async function handleFiles(files: FileList) {
  const file = files[0];
  if (!file || file.type !== 'application/pdf') {
    showAlert(
      translate('alert.invalidFile', 'Invalid File'),
      translate(
        'tools:backgroundColor.dynamic.b9cf61f80d',
        'Please upload a valid PDF file.'
      )
    );
    return;
  }
  try {
    const result = await loadPdfWithPasswordPrompt(file);
    if (!result) return;
    showLoader(translate('fileHandler.loadingPdf', 'Loading PDF...'));
    result.pdf.destroy();
    pageState.pdfDoc = await loadPdfDocument(result.bytes);
    pageState.file = result.file;
    updateFileDisplay();
    document.getElementById('options-panel')?.classList.remove('hidden');
  } catch (error) {
    console.error(error);
    showAlert(
      translate('alert.error', 'Error'),
      translate(
        'tools:backgroundColor.dynamic.f70d9e0d74',
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
    'tools:backgroundColor.dynamic.9a4711e8a0',
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

async function changeBackgroundColor() {
  if (!pageState.pdfDoc) {
    showAlert(
      translate('alert.error', 'Error'),
      translate(
        'tools:backgroundColor.dynamic.20fb18bbc1',
        'Please upload a PDF file first.'
      )
    );
    return;
  }
  const colorHex = (
    document.getElementById('background-color') as HTMLInputElement
  ).value;
  const color = hexToRgb(colorHex);
  showLoader(
    translate(
      'tools:backgroundColor.dynamic.526d3e3d75',
      'Changing background color...'
    )
  );
  try {
    const newPdfDoc = await PDFLibDocument.create();
    for (let i = 0; i < pageState.pdfDoc.getPageCount(); i++) {
      const [originalPage] = await newPdfDoc.copyPages(pageState.pdfDoc, [i]);
      const { width, height } = originalPage.getSize();
      const newPage = newPdfDoc.addPage([width, height]);
      newPage.drawRectangle({
        x: 0,
        y: 0,
        width,
        height,
        color: rgb(color.r, color.g, color.b),
      });
      const embeddedPage = await newPdfDoc.embedPage(originalPage);
      newPage.drawPage(embeddedPage, { x: 0, y: 0, width, height });
    }
    const newPdfBytes = await newPdfDoc.save();
    downloadFile(
      new Blob([new Uint8Array(newPdfBytes)], { type: 'application/pdf' }),
      pageState.file?.name || 'document.pdf'
    );
    showAlert(
      translate('alert.success', 'Success'),
      translate(
        'tools:backgroundColor.dynamic.dfa29c075b',
        'Background color changed successfully!'
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
        'tools:backgroundColor.dynamic.8fc0565b63',
        'Could not change the background color.'
      )
    );
  } finally {
    hideLoader();
  }
}
