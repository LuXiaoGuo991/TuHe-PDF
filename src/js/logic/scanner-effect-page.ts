import { showLoader, hideLoader, showAlert } from '../ui.js';
import {
  downloadFile,
  formatBytes,
  readFileAsArrayBuffer,
  getPDFDocument,
} from '../utils/helpers.js';
import { createIcons, icons } from 'lucide';
import { PDFDocument } from 'pdf-lib';
import { applyScannerEffect } from '../utils/image-effects.js';
import * as pdfjsLib from 'pdfjs-dist';
import type { ScanSettings } from '../types/scanner-effect-type.js';
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
let cachedBaselineData: ImageData | null = null;
let cachedBaselineWidth = 0;
let cachedBaselineHeight = 0;
let pdfjsDoc: pdfjsLib.PDFDocumentProxy | null = null;

function getSettings(): ScanSettings {
  return {
    grayscale:
      (document.getElementById('setting-grayscale') as HTMLInputElement)
        ?.checked ?? false,
    border:
      (document.getElementById('setting-border') as HTMLInputElement)
        ?.checked ?? false,
    rotate: parseFloat(
      (document.getElementById('setting-rotate') as HTMLInputElement)?.value ??
        '0'
    ),
    rotateVariance: parseFloat(
      (document.getElementById('setting-rotate-variance') as HTMLInputElement)
        ?.value ?? '0'
    ),
    brightness: parseInt(
      (document.getElementById('setting-brightness') as HTMLInputElement)
        ?.value ?? '0'
    ),
    contrast: parseInt(
      (document.getElementById('setting-contrast') as HTMLInputElement)
        ?.value ?? '0'
    ),
    blur: parseFloat(
      (document.getElementById('setting-blur') as HTMLInputElement)?.value ??
        '0'
    ),
    noise: parseInt(
      (document.getElementById('setting-noise') as HTMLInputElement)?.value ??
        '10'
    ),
    yellowish: parseInt(
      (document.getElementById('setting-yellowish') as HTMLInputElement)
        ?.value ?? '0'
    ),
    resolution: parseInt(
      (document.getElementById('setting-resolution') as HTMLInputElement)
        ?.value ?? '150'
    ),
  };
}

const applyEffects = applyScannerEffect;

function updatePreview(): void {
  if (!cachedBaselineData) return;

  const previewCanvas = document.getElementById(
    'preview-canvas'
  ) as HTMLCanvasElement;
  if (!previewCanvas) return;

  const settings = getSettings();
  const baselineCopy = new ImageData(
    new Uint8ClampedArray(cachedBaselineData.data),
    cachedBaselineWidth,
    cachedBaselineHeight
  );

  applyEffects(baselineCopy, previewCanvas, settings, settings.rotate);
}

async function renderPreview(): Promise<void> {
  if (!pdfjsDoc) return;

  const page = await pdfjsDoc.getPage(1);
  const viewport = page.getViewport({ scale: 1.0 });
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({ canvasContext: ctx, viewport, canvas }).promise;

  cachedBaselineData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  cachedBaselineWidth = canvas.width;
  cachedBaselineHeight = canvas.height;

  updatePreview();
}

const updateUI = () => {
  const fileDisplayArea = document.getElementById('file-display-area');
  const optionsPanel = document.getElementById('options-panel');

  if (!fileDisplayArea || !optionsPanel) return;

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
        'tools:scannerEffect.dynamic.7e69040d7a',
        `${formatBytes(file.size)} • ${t('common.loadingPageCount')}`,
        { value0: formatBytes(file.size), value1: t('common.loadingPageCount') }
      );

      infoContainer.append(nameSpan, metaSpan);

      const removeBtn = document.createElement('button');
      removeBtn.className =
        'ml-4 ui-text-danger ui-hover-text-danger flex-shrink-0';
      removeBtn.innerHTML = '<i data-lucide="trash-2" class="w-4 h-4"></i>';
      removeBtn.onclick = () => {
        files = [];
        pdfjsDoc = null;
        cachedBaselineData = null;
        updateUI();
      };

      fileDiv.append(infoContainer, removeBtn);
      fileDisplayArea.appendChild(fileDiv);

      readFileAsArrayBuffer(file)
        .then((buffer: ArrayBuffer) => {
          return getPDFDocument(buffer).promise;
        })
        .then((pdf: pdfjsLib.PDFDocumentProxy) => {
          metaSpan.textContent = translate(
            'tools:scannerEffect.dynamic.758bbe8260',
            `${formatBytes(file.size)} • ${pdf.numPages} ${pdf.numPages !== 1 ? t('common.pages') : t('common.page')}`,
            {
              value0: formatBytes(file.size),
              value1: pdf.numPages,
              value2: pdf.numPages !== 1 ? t('common.pages') : t('common.page'),
            }
          );
        })
        .catch(() => {
          metaSpan.textContent = formatBytes(file.size);
        });
    });

    createIcons({ icons });
  } else {
    optionsPanel.classList.add('hidden');
  }
};

const resetState = () => {
  files = [];
  pdfjsDoc = null;
  cachedBaselineData = null;
  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  if (fileInput) fileInput.value = '';
  updateUI();
};

async function processAllPages(): Promise<void> {
  if (files.length === 0) {
    showAlert(
      translate('tools:scannerEffect.dynamic.7bf2857a6a', 'No File'),
      translate(
        'tools:scannerEffect.dynamic.774b763d99',
        'Please upload a PDF file first.'
      )
    );
    return;
  }

  showLoader(
    translate(
      'tools:scannerEffect.dynamic.f3013a6f9a',
      'Applying scanner effect...'
    )
  );

  try {
    const settings = getSettings();
    const pdfBytes = (await readFileAsArrayBuffer(files[0])) as ArrayBuffer;
    const doc = await getPDFDocument({ data: pdfBytes }).promise;
    const newPdfDoc = await PDFDocument.create();
    const dpiScale = settings.resolution / 72;

    for (let i = 1; i <= doc.numPages; i++) {
      showLoader(
        translate(
          'tools:scannerEffect.dynamic.260ba5b09a',
          `Processing page ${i} of ${doc.numPages}...`,
          { value0: i, value1: doc.numPages }
        )
      );

      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale: dpiScale });
      const renderCanvas = document.createElement('canvas');
      const renderCtx = renderCanvas.getContext('2d')!;
      renderCanvas.width = viewport.width;
      renderCanvas.height = viewport.height;

      await page.render({
        canvasContext: renderCtx,
        viewport,
        canvas: renderCanvas,
      }).promise;

      const baseData = renderCtx.getImageData(
        0,
        0,
        renderCanvas.width,
        renderCanvas.height
      );
      const baselineCopy = new ImageData(
        new Uint8ClampedArray(baseData.data),
        baseData.width,
        baseData.height
      );

      const outputCanvas = document.createElement('canvas');
      const pageRotation =
        settings.rotate +
        (settings.rotateVariance > 0
          ? (Math.random() - 0.5) * 2 * settings.rotateVariance
          : 0);

      applyEffects(
        baselineCopy,
        outputCanvas,
        settings,
        pageRotation,
        dpiScale
      );

      const jpegBlob = await new Promise<Blob | null>((resolve) =>
        outputCanvas.toBlob(resolve, 'image/jpeg', 0.85)
      );

      if (jpegBlob) {
        const jpegBytes = await jpegBlob.arrayBuffer();
        const jpegImage = await newPdfDoc.embedJpg(jpegBytes);
        const newPage = newPdfDoc.addPage([
          outputCanvas.width,
          outputCanvas.height,
        ]);
        newPage.drawImage(jpegImage, {
          x: 0,
          y: 0,
          width: outputCanvas.width,
          height: outputCanvas.height,
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
        'tools:scannerEffect.dynamic.3b82b6cde5',
        'Scanner effect applied successfully!'
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
        'tools:scannerEffect.dynamic.9e7466ea5e',
        'Failed to apply scanner effect. The file might be corrupted.'
      )
    );
  } finally {
    hideLoader();
  }
}

const sliderDefaults: {
  id: string;
  display: string;
  suffix: string;
  defaultValue: string;
}[] = [
  {
    id: 'setting-rotate',
    display: 'rotate-value',
    suffix: '°',
    defaultValue: '0',
  },
  {
    id: 'setting-rotate-variance',
    display: 'rotate-variance-value',
    suffix: '°',
    defaultValue: '0',
  },
  {
    id: 'setting-brightness',
    display: 'brightness-value',
    suffix: '',
    defaultValue: '0',
  },
  {
    id: 'setting-contrast',
    display: 'contrast-value',
    suffix: '',
    defaultValue: '0',
  },
  {
    id: 'setting-blur',
    display: 'blur-value',
    suffix: 'px',
    defaultValue: '0',
  },
  {
    id: 'setting-noise',
    display: 'noise-value',
    suffix: '',
    defaultValue: '10',
  },
  {
    id: 'setting-yellowish',
    display: 'yellowish-value',
    suffix: '',
    defaultValue: '0',
  },
  {
    id: 'setting-resolution',
    display: 'resolution-value',
    suffix: ' DPI',
    defaultValue: '150',
  },
];

function resetSettings(): void {
  sliderDefaults.forEach(({ id, display, suffix, defaultValue }) => {
    const slider = document.getElementById(id) as HTMLInputElement;
    const label = document.getElementById(display);
    if (slider) slider.value = defaultValue;
    if (label) label.textContent = defaultValue + suffix;
  });

  const grayscale = document.getElementById(
    'setting-grayscale'
  ) as HTMLInputElement;
  const border = document.getElementById('setting-border') as HTMLInputElement;
  if (grayscale) grayscale.checked = false;
  if (border) border.checked = false;

  updatePreview();
}

function setupSettingsListeners(): void {
  sliderDefaults.forEach(({ id, display, suffix }) => {
    const slider = document.getElementById(id) as HTMLInputElement;
    const label = document.getElementById(display);
    if (slider && label) {
      slider.addEventListener('input', () => {
        label.textContent = slider.value + suffix;
        if (id !== 'setting-resolution') {
          updatePreview();
        }
      });
    }
  });

  const toggleIds = ['setting-grayscale', 'setting-border'];
  toggleIds.forEach((id) => {
    const toggle = document.getElementById(id) as HTMLInputElement;
    if (toggle) {
      toggle.addEventListener('change', updatePreview);
    }
  });

  const resetBtn = document.getElementById('reset-settings-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', resetSettings);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  const dropZone = document.getElementById('drop-zone');
  const processBtn = document.getElementById('process-btn');
  const backBtn = document.getElementById('back-to-tools');

  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.location.href = import.meta.env.BASE_URL;
    });
  }

  const handleFileSelect = async (newFiles: FileList | null) => {
    if (!newFiles || newFiles.length === 0) return;
    const validFiles = Array.from(newFiles).filter(
      (file) => file.type === 'application/pdf'
    );

    if (validFiles.length === 0) {
      showAlert(
        translate('alert.invalidFile', 'Invalid File'),
        translate(
          'tools:scannerEffect.dynamic.41ae43a300',
          'Please upload a PDF file.'
        )
      );
      return;
    }

    try {
      const result = await loadPdfWithPasswordPrompt(validFiles[0]);
      if (!result) return;
      showLoader(
        translate(
          'tools:scannerEffect.dynamic.97d54a425f',
          'Loading preview...'
        )
      );
      files = [result.file];
      updateUI();
      pdfjsDoc = result.pdf;
      await renderPreview();
    } catch (e) {
      console.error(e);
      showAlert(
        translate('alert.error', 'Error'),
        translate(
          'tools:scannerEffect.dynamic.a539e67250',
          'Failed to load PDF for preview.'
        )
      );
    } finally {
      hideLoader();
    }
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
    processBtn.addEventListener('click', processAllPages);
  }

  setupSettingsListeners();
});
