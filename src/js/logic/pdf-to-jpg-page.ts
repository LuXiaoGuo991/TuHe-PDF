const translate = (
  key: string,
  fallback: string,
  options?: Record<string, unknown>
) => {
  const value = t(key, options);
  return value && value !== key ? value : fallback;
};

import { showLoader, hideLoader, showAlert } from '../ui.js';
import {
  downloadFile,
  formatBytes,
  readFileAsArrayBuffer,
  getPDFDocument,
  getCleanPdfFilename,
} from '../utils/helpers.js';
import { createIcons, icons } from 'lucide';
import JSZip from 'jszip';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFPageProxy } from 'pdfjs-dist';
import { t } from '../i18n/i18n';
import { loadPdfWithPasswordPrompt } from '../utils/password-prompt.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

let files: File[] = [];

const updateUI = () => {
  const fileDisplayArea = document.getElementById('file-display-area');
  const optionsPanel = document.getElementById('options-panel');
  const dropZone = document.getElementById('drop-zone');

  if (!fileDisplayArea || !optionsPanel || !dropZone) return;

  fileDisplayArea.innerHTML = '';

  if (files.length > 0) {
    optionsPanel.classList.remove('hidden');

    files.forEach((file) => {
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
      metaSpan.textContent = translate(
        'tools:pdfToJpg.dynamic.0b79ba5389',
        `${formatBytes(file.size)} • ${t('common.loadingPageCount')}`,
        { value0: formatBytes(file.size), value1: t('common.loadingPageCount') }
      ); // Initial state

      infoContainer.append(nameSpan, metaSpan);

      const removeBtn = document.createElement('button');
      removeBtn.className =
        'ml-4 ui-text-danger ui-hover-text-danger flex-shrink-0';
      removeBtn.innerHTML = '<i data-lucide="trash-2" class="w-4 h-4"></i>';
      removeBtn.onclick = () => {
        files = [];
        updateUI();
      };

      fileDiv.append(infoContainer, removeBtn);
      fileDisplayArea.appendChild(fileDiv);

      // Fetch page count asynchronously
      readFileAsArrayBuffer(file)
        .then((buffer) => {
          return getPDFDocument(buffer).promise;
        })
        .then((pdf) => {
          metaSpan.textContent = translate(
            'tools:pdfToJpg.dynamic.67bab51c34',
            `${formatBytes(file.size)} • ${pdf.numPages} ${pdf.numPages !== 1 ? t('common.pages') : t('common.page')}`,
            {
              value0: formatBytes(file.size),
              value1: pdf.numPages,
              value2: pdf.numPages !== 1 ? t('common.pages') : t('common.page'),
            }
          );
        })
        .catch((e) => {
          console.warn('Error loading PDF page count:', e);
          metaSpan.textContent = formatBytes(file.size);
        });
    });

    // Initialize icons immediately after synchronous render
    createIcons({ icons });
  } else {
    optionsPanel.classList.add('hidden');
  }
};

const resetState = () => {
  files = [];
  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  if (fileInput) fileInput.value = '';
  const qualitySlider = document.getElementById(
    'jpg-quality'
  ) as HTMLInputElement;
  const qualityValue = document.getElementById('jpg-quality-value');
  if (qualitySlider) qualitySlider.value = '0.9';
  if (qualityValue)
    qualityValue.textContent = translate(
      'tools:pdfToJpg.dynamic.71ef9ac6e1',
      '90%'
    );
  updateUI();
};

async function convert() {
  if (files.length === 0) {
    showAlert(
      t('tools:pdfToJpg.alert.noFile'),
      t('tools:pdfToJpg.alert.noFileExplanation')
    );
    return;
  }
  try {
    const result = await loadPdfWithPasswordPrompt(files[0], files, 0);
    if (!result) return;
    showLoader(t('tools:pdfToJpg.loader.converting'));
    const { pdf } = result;

    const qualityInput = document.getElementById(
      'jpg-quality'
    ) as HTMLInputElement;
    const quality = qualityInput ? parseFloat(qualityInput.value) : 0.9;

    if (pdf.numPages === 1) {
      const page = await pdf.getPage(1);
      const blob = await renderPage(page, quality);
      downloadFile(blob, getCleanPdfFilename(files[0].name) + '.jpg');
    } else {
      const zip = new JSZip();
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const blob = await renderPage(page, quality);
        if (blob) {
          zip.file(`page_${i}.jpg`, blob);
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadFile(zipBlob, getCleanPdfFilename(files[0].name) + '_jpgs.zip');
    }

    showAlert(
      t('common.success'),
      t('tools:pdfToJpg.alert.conversionSuccess'),
      'success',
      () => {
        resetState();
      }
    );
  } catch (e) {
    console.error(e);
    showAlert(t('common.error'), t('tools:pdfToJpg.alert.conversionError'));
  } finally {
    hideLoader();
  }
}

async function renderPage(
  page: PDFPageProxy,
  quality: number
): Promise<Blob | null> {
  const viewport = page.getViewport({ scale: 2.0 });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.height = viewport.height;
  canvas.width = viewport.width;

  await page.render({
    canvasContext: context!,
    viewport: viewport,
    canvas,
  }).promise;

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', quality)
  );
  return blob;
}

document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  const dropZone = document.getElementById('drop-zone');
  const processBtn = document.getElementById('process-btn');
  const qualitySlider = document.getElementById(
    'jpg-quality'
  ) as HTMLInputElement;
  const qualityValue = document.getElementById('jpg-quality-value');

  if (qualitySlider && qualityValue) {
    qualitySlider.addEventListener('input', () => {
      qualityValue.textContent = translate(
        'tools:pdfToJpg.dynamic.36d422fdc3',
        `${Math.round(parseFloat(qualitySlider.value) * 100)}%`,
        { value0: Math.round(parseFloat(qualitySlider.value) * 100) }
      );
    });
  }

  const handleFileSelect = (newFiles: FileList | null) => {
    if (!newFiles || newFiles.length === 0) return;
    const validFiles = Array.from(newFiles).filter(
      (file) => file.type === 'application/pdf'
    );

    if (validFiles.length === 0) {
      showAlert(
        t('tools:pdfToJpg.alert.invalidFile'),
        t('tools:pdfToJpg.alert.invalidFileExplanation')
      );
      return;
    }

    files = [validFiles[0]];
    updateUI();
  };

  if (fileInput && dropZone) {
    fileInput.addEventListener('change', (e) => {
      handleFileSelect((e.target as HTMLInputElement).files);
    });

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('ui-bg-raised');
    });

    dropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dropZone.classList.remove('ui-bg-raised');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('ui-bg-raised');
      handleFileSelect(e.dataTransfer?.files ?? null);
    });

    fileInput.addEventListener('click', () => {
      fileInput.value = '';
    });
  }

  if (processBtn) {
    processBtn.addEventListener('click', convert);
  }
});
