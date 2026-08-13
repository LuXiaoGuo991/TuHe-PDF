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
import * as XLSX from 'xlsx';
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
      'flex items-center justify-between ui-bg-raised p-3 rounded-lg text-sm';

    const infoContainer = document.createElement('div');
    infoContainer.className = 'flex flex-col overflow-hidden';

    const nameSpan = document.createElement('div');
    nameSpan.className = 'truncate font-medium ui-text-primary text-sm mb-1';
    nameSpan.textContent = file.name;

    const metaSpan = document.createElement('div');
    metaSpan.className = 'text-xs ui-text-secondary';
    metaSpan.textContent = formatBytes(file.size);

    infoContainer.append(nameSpan, metaSpan);

    const removeBtn = document.createElement('button');
    removeBtn.className =
      'ml-4 ui-text-danger ui-hover-text-danger flex-shrink-0';
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

async function convert() {
  if (!file) {
    showAlert(
      translate('tools:pdfToExcel.dynamic.59516df9fc', 'No File'),
      translate(
        'tools:pdfToExcel.dynamic.2591070d22',
        'Please upload a PDF file first.'
      )
    );
    return;
  }

  showLoader(
    translate('tools:pdfToExcel.dynamic.9c4cf6ec2b', 'Loading Engine...')
  );

  try {
    const pymupdf = await loadPyMuPDF();

    hideLoader();
    const pwResult = await loadPdfWithPasswordPrompt(file);
    if (!pwResult) return;
    pwResult.pdf.destroy();
    file = pwResult.file;

    showLoader(
      translate('tools:pdfToExcel.dynamic.63dc1ff1bb', 'Extracting tables...')
    );

    const doc = await pymupdf.open(file);
    const pageCount = doc.pageCount;
    const baseName = file.name.replace(/\.[^/.]+$/, '');

    interface TableData {
      page: number;
      rows: (string | null)[][];
    }

    const allTables: TableData[] = [];

    for (let i = 0; i < pageCount; i++) {
      showLoader(
        translate(
          'tools:pdfToExcel.dynamic.dede460ecd',
          `Scanning page ${i + 1} of ${pageCount}...`,
          { value0: i + 1, value1: pageCount }
        )
      );
      const page = doc.getPage(i);
      const tables = page.findTables();

      tables.forEach((table) => {
        allTables.push({
          page: i + 1,
          rows: table.rows,
        });
      });
    }

    if (allTables.length === 0) {
      showAlert(
        translate('tools:pdfToExcel.dynamic.d682b77e95', 'No Tables Found'),
        translate(
          'tools:pdfToExcel.dynamic.f7048f7844',
          'No tables were detected in this PDF.'
        )
      );
      return;
    }

    showLoader(
      translate('tools:pdfToExcel.dynamic.7143676af8', 'Creating Excel file...')
    );

    const workbook = XLSX.utils.book_new();

    if (allTables.length === 1) {
      const worksheet = XLSX.utils.aoa_to_sheet(allTables[0].rows);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Table');
    } else {
      allTables.forEach((table, idx) => {
        const sheetName = `Table ${idx + 1} (Page ${table.page})`.substring(
          0,
          31
        );
        const worksheet = XLSX.utils.aoa_to_sheet(table.rows);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      });
    }

    const xlsxData = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([xlsxData], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    downloadFile(blob, `${baseName}.xlsx`);
    showAlert(
      translate('alert.success', 'Success'),
      translate(
        'tools:pdfToExcel.dynamic.58ec90b001',
        `Extracted ${allTables.length} table(s) to Excel!`,
        { value0: allTables.length }
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
        'tools:pdfToExcel.dynamic.7f193f2e33',
        `Failed to convert PDF to Excel. ${message}`,
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
          'tools:pdfToExcel.dynamic.abef904a42',
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
