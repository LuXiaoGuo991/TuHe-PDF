import { showLoader, hideLoader, showAlert } from '../ui.js';
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
import { createIcons, icons } from 'lucide';
import { loadPyMuPDF } from '../utils/pymupdf-loader.js';
import { loadPdfWithPasswordPrompt } from '../utils/password-prompt.js';
let file: File | null = null;

const updateUI = () => {
  const fileDisplayArea = document.getElementById('file-display-area');
  const optionsPanel = document.getElementById('options-panel');

  if (!fileDisplayArea || !optionsPanel) return;

  fileDisplayArea.innerHTML = '';

  if (file) {
    optionsPanel.classList.remove('hidden');

    const fileDiv = document.createElement('div');
    fileDiv.className =
      'flex items-center justify-between bg-gray-700 p-3 rounded-lg text-sm';

    const infoContainer = document.createElement('div');
    infoContainer.className = 'flex flex-col overflow-hidden';

    const nameSpan = document.createElement('div');
    nameSpan.className = 'truncate font-medium text-gray-200 text-sm mb-1';
    nameSpan.textContent = file.name;

    const metaSpan = document.createElement('div');
    metaSpan.className = 'text-xs text-gray-400';
    metaSpan.textContent = formatBytes(file.size);

    infoContainer.append(nameSpan, metaSpan);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'ml-4 text-red-400 hover:text-red-300 flex-shrink-0';
    removeBtn.innerHTML = '<i data-lucide="trash-2" class="w-4 h-4"></i>';
    removeBtn.onclick = resetState;

    fileDiv.append(infoContainer, removeBtn);
    fileDisplayArea.appendChild(fileDiv);

    createIcons({ icons });
  } else {
    optionsPanel.classList.add('hidden');
  }
};

const resetState = () => {
  file = null;
  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  if (fileInput) fileInput.value = '';
  updateUI();
};

function tableToCsv(rows: (string | null)[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const cellStr = cell ?? '';
          if (
            cellStr.includes(',') ||
            cellStr.includes('"') ||
            cellStr.includes('\n')
          ) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        })
        .join(',')
    )
    .join('\n');
}

async function convert() {
  if (!file) {
    showAlert(
      translate('tools:pdfToCsv.dynamic.69783ee8ef', 'No File'),
      translate(
        'tools:pdfToCsv.dynamic.ad03050928',
        'Please upload a PDF file first.'
      )
    );
    return;
  }

  showLoader(
    translate('tools:pdfToCsv.dynamic.267db28b36', 'Loading Engine...')
  );

  try {
    const pymupdf = await loadPyMuPDF();

    hideLoader();
    const pwResult = await loadPdfWithPasswordPrompt(file);
    if (!pwResult) return;
    pwResult.pdf.destroy();
    file = pwResult.file;

    showLoader(
      translate('tools:pdfToCsv.dynamic.b2a33c3624', 'Extracting tables...')
    );

    const doc = await pymupdf.open(file);
    const pageCount = doc.pageCount;
    const baseName = file.name.replace(/\.[^/.]+$/, '');

    const allRows: (string | null)[][] = [];

    for (let i = 0; i < pageCount; i++) {
      showLoader(
        translate(
          'tools:pdfToCsv.dynamic.851ba63d4f',
          `Scanning page ${i + 1} of ${pageCount}...`,
          { value0: i + 1, value1: pageCount }
        )
      );
      const page = doc.getPage(i);
      const tables = page.findTables();

      tables.forEach((table) => {
        allRows.push(...table.rows);
        allRows.push([]);
      });
    }

    if (allRows.length === 0) {
      showAlert(
        translate('tools:pdfToCsv.dynamic.b9789e2c14', 'No Tables Found'),
        translate(
          'tools:pdfToCsv.dynamic.cf3fa196da',
          'No tables were detected in this PDF.'
        )
      );
      return;
    }

    const csvContent = tableToCsv(allRows.filter((row) => row.length > 0));
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadFile(blob, `${baseName}.csv`);
    showAlert(
      translate('alert.success', 'Success'),
      translate(
        'tools:pdfToCsv.dynamic.2d3e7a570f',
        'PDF converted to CSV successfully!'
      ),
      'success',
      resetState
    );
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : 'Unknown error';
    showAlert(
      translate('alert.error', 'Error'),
      translate(
        'tools:pdfToCsv.dynamic.f3154bcd1b',
        `Failed to convert PDF to CSV. ${message}`,
        { value0: message }
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
  const backBtn = document.getElementById('back-to-tools');

  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.location.href = import.meta.env.BASE_URL;
    });
  }

  const handleFileSelect = (newFiles: FileList | null) => {
    if (!newFiles || newFiles.length === 0) return;
    const validFile = Array.from(newFiles).find(
      (f) => f.type === 'application/pdf'
    );

    if (!validFile) {
      showAlert(
        translate('alert.invalidFile', 'Invalid File'),
        translate(
          'tools:pdfToCsv.dynamic.fa8ca0aeab',
          'Please upload a PDF file.'
        )
      );
      return;
    }

    file = validFile;
    updateUI();
  };

  if (fileInput && dropZone) {
    fileInput.addEventListener('change', (e) => {
      handleFileSelect((e.target as HTMLInputElement).files);
    });

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('bg-gray-700');
    });

    dropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dropZone.classList.remove('bg-gray-700');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('bg-gray-700');
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
