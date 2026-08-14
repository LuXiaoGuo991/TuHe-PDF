import { showLoader, hideLoader, showAlert } from '../ui.js';
import {
  downloadFile,
  formatBytes,
  readFileAsArrayBuffer,
  getPDFDocument,
} from '../utils/helpers.js';
import { createIcons, icons } from 'lucide';
import { PDFDocument } from 'pdf-lib';
import { applyGreyscale } from '../utils/image-effects.js';
import * as pdfjsLib from 'pdfjs-dist';
import { t } from '../i18n/i18n';

const translate = (
  key: string,
  fallback: string,
  options?: Record<string, unknown>
) => {
  const translation = t(key, options);
  return translation && translation !== key ? translation : fallback;
};
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

    // Render files synchronously first
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
        'tools:pdfToGreyscale.dynamic.6c08c2bcda',
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
            'tools:pdfToGreyscale.dynamic.1aa9a280e2',
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
  updateUI();
};

async function convert() {
  if (files.length === 0) {
    showAlert(
      translate('tools:pdfToGreyscale.dynamic.47c2241964', 'No File'),
      translate(
        'tools:pdfToGreyscale.dynamic.4a35f197d6',
        'Please upload a PDF file first.'
      )
    );
    return;
  }
  try {
    const result = await loadPdfWithPasswordPrompt(files[0], files, 0);
    if (!result) return;
    showLoader(
      translate(
        'tools:pdfToGreyscale.dynamic.029c0cd7cc',
        'Converting to greyscale...'
      )
    );
    const { pdf: pdfjsDoc } = result;
    const newPdfDoc = await PDFDocument.create();

    for (let i = 1; i <= pdfjsDoc.numPages; i++) {
      const page = await pdfjsDoc.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context!, viewport: viewport, canvas })
        .promise;

      const imageData = context!.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
      );
      applyGreyscale(imageData);
      context!.putImageData(imageData, 0, 0);

      const jpegBlob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.9)
      );

      if (jpegBlob) {
        const jpegBytes = await jpegBlob.arrayBuffer();
        const jpegImage = await newPdfDoc.embedJpg(jpegBytes);
        const newPage = newPdfDoc.addPage([viewport.width, viewport.height]);
        newPage.drawImage(jpegImage, {
          x: 0,
          y: 0,
          width: viewport.width,
          height: viewport.height,
        });
      }
    }

    const resultBytes = await newPdfDoc.save();
    downloadFile(
      new Blob([new Uint8Array(resultBytes)], { type: 'application/pdf' }),
      files[0]?.name || 'document.pdf'
    );
    showAlert(
      translate('alert.success', 'Success'),
      translate(
        'tools:pdfToGreyscale.dynamic.2969af6c0d',
        'PDF converted to greyscale successfully!'
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
        'tools:pdfToGreyscale.dynamic.cd8601b331',
        'Failed to convert PDF to greyscale. The file might be corrupted.'
      )
    );
  } finally {
    hideLoader();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  const dropZone = document.getElementById('drop-zone');
  const processBtn = document.getElementById('process-btn');

  const handleFileSelect = (newFiles: FileList | null) => {
    if (!newFiles || newFiles.length === 0) return;
    const validFiles = Array.from(newFiles).filter(
      (file) => file.type === 'application/pdf'
    );

    if (validFiles.length === 0) {
      showAlert(
        translate('alert.invalidFile', 'Invalid File'),
        translate(
          'tools:pdfToGreyscale.dynamic.a8d626a999',
          'Please upload a PDF file.'
        )
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
