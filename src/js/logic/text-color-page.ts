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
  downloadFile,
  hexToRgb,
  formatBytes,
  getPDFDocument,
  readFileAsArrayBuffer,
} from '../utils/helpers.js';
import { PDFDocument as PDFLibDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { TextColorState } from '@/types';
import { loadPdfWithPasswordPrompt } from '../utils/password-prompt.js';
import { loadPdfDocument } from '../utils/load-pdf-document.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const pageState: TextColorState = { file: null, pdfDoc: null };

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
      if (e.dataTransfer?.files.length) handleFiles(e.dataTransfer.files);
    });
  }
  if (processBtn) processBtn.addEventListener('click', changeTextColor);
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
        'tools:changeTextColor.dynamic.0602b07098',
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
        'tools:changeTextColor.dynamic.0e00f36bee',
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
    'tools:changeTextColor.dynamic.1b2ec4b858',
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

async function changeTextColor() {
  if (!pageState.pdfDoc || !pageState.file) {
    showAlert(
      translate('alert.error', 'Error'),
      translate(
        'tools:changeTextColor.dynamic.8ad206dd8d',
        'Please upload a PDF file first.'
      )
    );
    return;
  }
  const colorHex = (
    document.getElementById('text-color-input') as HTMLInputElement
  ).value;
  const { r, g, b } = hexToRgb(colorHex);
  const darknessThreshold = 120;
  showLoader(
    translate(
      'tools:changeTextColor.dynamic.53e68d6a7d',
      'Changing text color...'
    )
  );
  try {
    const newPdfDoc = await PDFLibDocument.create();
    const pdf = await getPDFDocument(
      await readFileAsArrayBuffer(pageState.file)
    ).promise;

    for (let i = 1; i <= pdf.numPages; i++) {
      showLoader(
        translate(
          'tools:changeTextColor.dynamic.f5a92a1c7b',
          `Processing page ${i} of ${pdf.numPages}...`,
          { value0: i, value1: pdf.numPages }
        )
      );
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const context = canvas.getContext('2d')!;
      await page.render({ canvasContext: context, viewport, canvas }).promise;

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let j = 0; j < data.length; j += 4) {
        if (
          data[j] < darknessThreshold &&
          data[j + 1] < darknessThreshold &&
          data[j + 2] < darknessThreshold
        ) {
          data[j] = r * 255;
          data[j + 1] = g * 255;
          data[j + 2] = b * 255;
        }
      }
      context.putImageData(imageData, 0, 0);

      const pngImageBytes = await new Promise<Uint8Array>((resolve) =>
        canvas.toBlob((blob) => {
          const reader = new FileReader();
          reader.onload = () =>
            resolve(new Uint8Array(reader.result as ArrayBuffer));
          reader.readAsArrayBuffer(blob!);
        }, 'image/png')
      );

      const pngImage = await newPdfDoc.embedPng(pngImageBytes);
      const newPage = newPdfDoc.addPage([viewport.width, viewport.height]);
      newPage.drawImage(pngImage, {
        x: 0,
        y: 0,
        width: viewport.width,
        height: viewport.height,
      });
    }
    const newPdfBytes = await newPdfDoc.save();
    downloadFile(
      new Blob([new Uint8Array(newPdfBytes)], { type: 'application/pdf' }),
      pageState.file?.name || 'document.pdf'
    );
    showAlert(
      translate('alert.success', 'Success'),
      translate(
        'tools:changeTextColor.dynamic.cd18866f65',
        'Text color changed successfully!'
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
        'tools:changeTextColor.dynamic.fca2960c93',
        'Could not change text color.'
      )
    );
  } finally {
    hideLoader();
  }
}
