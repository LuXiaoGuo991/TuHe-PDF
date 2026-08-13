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
import JSZip from 'jszip';
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

async function extract() {
  if (!file) {
    showAlert(
      translate('tools:extractTables.dynamic.73433d0bfe', 'No File'),
      translate(
        'tools:extractTables.dynamic.823e9c0f13',
        'Please upload a PDF file first.'
      )
    );
    return;
  }

  const formatRadios = document.querySelectorAll('input[name="export-format"]');
  let format = 'csv';
  formatRadios.forEach((radio: Element) => {
    if ((radio as HTMLInputElement).checked) {
      format = (radio as HTMLInputElement).value;
    }
  });

  try {
    showLoader(
      translate('tools:extractTables.dynamic.79bc8aecb7', 'Loading Engine...')
    );
    const pymupdf = await loadPyMuPDF();

    hideLoader();
    const pwResult = await loadPdfWithPasswordPrompt(file);
    if (!pwResult) return;
    pwResult.pdf.destroy();
    file = pwResult.file;

    showLoader(
      translate(
        'tools:extractTables.dynamic.4e588c6fbf',
        'Extracting tables...'
      )
    );

    const doc = await pymupdf.open(file);
    const pageCount = doc.pageCount;
    const baseName = file.name.replace(/\.[^/.]+$/, '');

    interface TableData {
      page: number;
      tableIndex: number;
      rows: (string | null)[][];
      markdown: string;
      rowCount: number;
      colCount: number;
    }

    const allTables: TableData[] = [];

    for (let i = 0; i < pageCount; i++) {
      showLoader(
        translate(
          'tools:extractTables.dynamic.4e8aa3ff08',
          `Scanning page ${i + 1} of ${pageCount}...`,
          { value0: i + 1, value1: pageCount }
        )
      );
      const page = doc.getPage(i);
      const tables = page.findTables();

      tables.forEach((table, tableIdx) => {
        allTables.push({
          page: i + 1,
          tableIndex: tableIdx + 1,
          rows: table.rows,
          markdown: table.markdown,
          rowCount: table.rowCount,
          colCount: table.colCount,
        });
      });
    }

    if (allTables.length === 0) {
      showAlert(
        translate('tools:extractTables.dynamic.ffa0b5036c', 'No Tables Found'),
        translate(
          'tools:extractTables.dynamic.0425695ccd',
          'No tables were detected in this PDF.'
        )
      );
      return;
    }

    if (allTables.length === 1) {
      const table = allTables[0];
      let content: string;
      let ext: string;
      let mimeType: string;

      if (format === 'csv') {
        content = tableToCsv(table.rows);
        ext = 'csv';
        mimeType = 'text/csv';
      } else if (format === 'json') {
        content = JSON.stringify(table.rows, null, 2);
        ext = 'json';
        mimeType = 'application/json';
      } else {
        content = table.markdown;
        ext = 'md';
        mimeType = 'text/markdown';
      }

      const blob = new Blob([content], { type: mimeType });
      downloadFile(blob, `${baseName}_table.${ext}`);
      showAlert(
        translate('alert.success', 'Success'),
        translate(
          'tools:extractTables.dynamic.bcf7770932',
          `Extracted 1 table successfully!`
        ),
        'success',
        resetState
      );
    } else {
      showLoader(
        translate(
          'tools:extractTables.dynamic.e26185baed',
          'Creating ZIP file...'
        )
      );
      const zip = new JSZip();

      allTables.forEach((table, idx) => {
        const filename = `table_${idx + 1}_page${table.page}`;
        let content: string;
        let ext: string;

        if (format === 'csv') {
          content = tableToCsv(table.rows);
          ext = 'csv';
        } else if (format === 'json') {
          content = JSON.stringify(table.rows, null, 2);
          ext = 'json';
        } else {
          content = table.markdown;
          ext = 'md';
        }

        zip.file(`${filename}.${ext}`, content);
      });

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadFile(zipBlob, `${baseName}_tables.zip`);
      showAlert(
        translate('alert.success', 'Success'),
        translate(
          'tools:extractTables.dynamic.06afde8883',
          `Extracted ${allTables.length} tables successfully!`,
          { value0: allTables.length }
        ),
        'success',
        resetState
      );
    }
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : 'Unknown error';
    showAlert(
      translate('alert.error', 'Error'),
      translate(
        'tools:extractTables.dynamic.9d11f4df3a',
        `Failed to extract tables. ${message}`,
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
          'tools:extractTables.dynamic.a9a4c9ebca',
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
    processBtn.addEventListener('click', extract);
  }
});
