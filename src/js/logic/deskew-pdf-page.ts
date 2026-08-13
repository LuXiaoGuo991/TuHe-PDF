import { loadPyMuPDF } from '../utils/pymupdf-loader.js';
import { t } from '../i18n/i18n';

const translate = (
  key: string,
  fallback: string,
  options?: Record<string, unknown>
) => {
  const translation = t(key, options);
  return translation && translation !== key ? translation : fallback;
};
import type { PyMuPDFInstance } from '@/types';
import { batchDecryptIfNeeded } from '../utils/password-prompt.js';
import { createIcons, icons } from 'lucide';
import { downloadFile } from '../utils/helpers';
import { isWasmAvailable } from '../config/wasm-cdn-config.js';
import { showWasmRequiredDialog } from '../utils/wasm-provider.js';

interface DeskewResult {
  totalPages: number;
  correctedPages: number;
  angles: number[];
  corrected: boolean[];
}

let selectedFiles: File[] = [];
let pymupdf: PyMuPDFInstance | null = null;

async function initPyMuPDF(): Promise<PyMuPDFInstance> {
  if (!pymupdf) {
    pymupdf = (await loadPyMuPDF()) as PyMuPDFInstance;
  }
  return pymupdf;
}

function showLoader(message: string): void {
  const loader = document.getElementById('loader-modal');
  const text = document.getElementById('loader-text');
  if (loader && text) {
    text.textContent = message;
    loader.classList.remove('hidden');
  }
}

function hideLoader(): void {
  const loader = document.getElementById('loader-modal');
  if (loader) {
    loader.classList.add('hidden');
  }
}

function showAlert(title: string, message: string): void {
  const modal = document.getElementById('alert-modal');
  const titleEl = document.getElementById('alert-title');
  const msgEl = document.getElementById('alert-message');
  if (modal && titleEl && msgEl) {
    titleEl.textContent = title;
    msgEl.textContent = message;
    modal.classList.remove('hidden');
  }
}

function updateFileDisplay(): void {
  const fileDisplayArea = document.getElementById('file-display-area');
  const fileControls = document.getElementById('file-controls');
  const deskewOptions = document.getElementById('deskew-options');
  const resultsArea = document.getElementById('results-area');

  if (!fileDisplayArea || !fileControls || !deskewOptions || !resultsArea)
    return;

  resultsArea.classList.add('hidden');

  if (selectedFiles.length === 0) {
    fileDisplayArea.innerHTML = '';
    fileControls.classList.add('hidden');
    deskewOptions.classList.add('hidden');
    return;
  }

  fileControls.classList.remove('hidden');
  deskewOptions.classList.remove('hidden');

  fileDisplayArea.textContent = translate(
    'tools:deskewPdf.dynamic.9462cdd58a',
    ''
  );
  selectedFiles.forEach((file, index) => {
    const row = document.createElement('div');
    row.className =
      'flex items-center justify-between ui-bg-raised p-3 rounded-lg';

    const info = document.createElement('div');
    info.className = 'flex items-center gap-3';

    const fileIcon = document.createElement('i');
    fileIcon.setAttribute('data-lucide', 'file-text');
    fileIcon.className = 'w-5 h-5 ui-text-action';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'ui-text-primary truncate max-w-xs';
    nameSpan.textContent = file.name;

    const sizeSpan = document.createElement('span');
    sizeSpan.className = 'ui-text-tertiary text-sm';
    sizeSpan.textContent = translate(
      'tools:deskewPdf.dynamic.d5273db50d',
      `(${(file.size / 1024).toFixed(1)} KB)`,
      { value0: (file.size / 1024).toFixed(1) }
    );

    info.append(fileIcon, nameSpan, sizeSpan);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-file ui-text-secondary hover:ui-text-danger';
    removeBtn.dataset.index = String(index);

    const removeIcon = document.createElement('i');
    removeIcon.setAttribute('data-lucide', 'x');
    removeIcon.className = 'w-5 h-5';
    removeBtn.appendChild(removeIcon);

    row.append(info, removeBtn);
    fileDisplayArea.appendChild(row);
  });

  createIcons({ icons });

  fileDisplayArea.querySelectorAll('.remove-file').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(
        (e.currentTarget as HTMLElement).dataset.index || '0',
        10
      );
      selectedFiles.splice(index, 1);
      updateFileDisplay();
    });
  });
}

function displayResults(result: DeskewResult): void {
  const resultsArea = document.getElementById('results-area');
  const totalEl = document.getElementById('result-total');
  const correctedEl = document.getElementById('result-corrected');
  const anglesList = document.getElementById('angles-list');

  if (!resultsArea || !totalEl || !correctedEl || !anglesList) return;

  resultsArea.classList.remove('hidden');
  totalEl.textContent = result.totalPages.toString();
  correctedEl.textContent = result.correctedPages.toString();

  anglesList.innerHTML = result.angles
    .map((angle, idx) => {
      const wasCorrected = result.corrected[idx];
      const color = wasCorrected ? 'ui-text-success' : 'ui-text-secondary';
      const icon = wasCorrected ? 'check' : 'minus';
      return `
        <div class="flex items-center gap-2 text-sm py-1">
          <i data-lucide="${icon}" class="w-4 h-4 ${color}"></i>
          <span class="ui-text-secondary">${translate(
            'tools:deskewPdf.pageNumber',
            'Page {{page}}:',
            { page: idx + 1 }
          )}</span>
          <span class="${color}">${angle.toFixed(2)}°</span>
          ${wasCorrected ? `<span class="ui-text-success text-xs">${translate('tools:deskewPdf.corrected', '(corrected)')}</span>` : ''}
        </div>
      `;
    })
    .join('');

  createIcons({ icons });
}

async function processDeskew(): Promise<void> {
  if (selectedFiles.length === 0) {
    showAlert(
      translate('alert.noFiles', 'No Files'),
      translate(
        'tools:deskewPdf.dynamic.92c18c8069',
        'Please select at least one PDF file.'
      )
    );
    return;
  }

  // Check if PyMuPDF is configured
  if (!isWasmAvailable('pymupdf')) {
    showWasmRequiredDialog('pymupdf');
    return;
  }

  const thresholdSelect = document.getElementById(
    'deskew-threshold'
  ) as HTMLSelectElement;
  const dpiSelect = document.getElementById('deskew-dpi') as HTMLSelectElement;

  const threshold = parseFloat(thresholdSelect?.value || '0.5');
  const dpi = parseInt(dpiSelect?.value || '150', 10);

  selectedFiles = await batchDecryptIfNeeded(selectedFiles);

  showLoader(
    translate('tools:deskewPdf.dynamic.940e55b69e', 'Initializing PyMuPDF...')
  );

  try {
    const pdf = await initPyMuPDF();
    await pdf.load();

    for (const file of selectedFiles) {
      showLoader(
        translate(
          'tools:deskewPdf.dynamic.e35d1ef53a',
          `Deskewing ${file.name}...`,
          { value0: file.name }
        )
      );

      const { pdf: resultPdf, result } = await pdf.deskewPdf(file, {
        threshold,
        dpi,
      });

      displayResults(result);

      downloadFile(resultPdf, file.name);
    }

    hideLoader();
    showAlert(
      translate('alert.success', 'Success'),
      translate(
        'tools:deskewPdf.dynamic.d1f2bb540e',
        `Deskewed ${selectedFiles.length} file(s). ${selectedFiles.length > 1 ? 'Downloads started for all files.' : ''}`,
        {
          value0: selectedFiles.length,
          value1:
            selectedFiles.length > 1 ? 'Downloads started for all files.' : '',
        }
      )
    );
  } catch (error) {
    hideLoader();
    console.error('Deskew error:', error);
    showAlert(
      translate('alert.error', 'Error'),
      translate('alert.processFailed', 'Processing failed. Please try again.')
    );
  }
}

function initPage(): void {
  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  const dropZone = document.getElementById('drop-zone');
  const addMoreBtn = document.getElementById('add-more-btn');
  const clearFilesBtn = document.getElementById('clear-files-btn');
  const processBtn = document.getElementById('process-btn');
  const alertOk = document.getElementById('alert-ok');
  const backBtn = document.getElementById('back-to-tools');

  if (fileInput) {
    fileInput.addEventListener('change', () => {
      if (fileInput.files) {
        selectedFiles = [...selectedFiles, ...Array.from(fileInput.files)];
        updateFileDisplay();
        fileInput.value = '';
      }
    });
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
      if (e.dataTransfer?.files) {
        const pdfFiles = Array.from(e.dataTransfer.files).filter(
          (f) => f.type === 'application/pdf'
        );
        selectedFiles = [...selectedFiles, ...pdfFiles];
        updateFileDisplay();
      }
    });
  }

  if (addMoreBtn) {
    addMoreBtn.addEventListener('click', () => fileInput?.click());
  }

  if (clearFilesBtn) {
    clearFilesBtn.addEventListener('click', () => {
      selectedFiles = [];
      updateFileDisplay();
    });
  }

  if (processBtn) {
    processBtn.addEventListener('click', processDeskew);
  }

  if (alertOk) {
    alertOk.addEventListener('click', () => {
      document.getElementById('alert-modal')?.classList.add('hidden');
    });
  }

  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.location.href = '/';
    });
  }

  createIcons({ icons });
}

document.addEventListener('DOMContentLoaded', initPage);
