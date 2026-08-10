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
import { PDFDocument as PDFLibDocument } from 'pdf-lib';
import { loadPdfWithPasswordPrompt } from '../utils/password-prompt.js';
import { AddBlankPageState } from '@/types';
import { loadPdfDocument } from '../utils/load-pdf-document.js';

const pageState: AddBlankPageState = {
  file: null,
  pdfDoc: null,
};

function resetState() {
  pageState.file = null;
  pageState.pdfDoc = null;

  const fileDisplayArea = document.getElementById('file-display-area');
  if (fileDisplayArea) fileDisplayArea.innerHTML = '';

  const toolOptions = document.getElementById('tool-options');
  if (toolOptions) toolOptions.classList.add('hidden');

  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  if (fileInput) fileInput.value = '';

  const pagePositionInput = document.getElementById(
    'page-position'
  ) as HTMLInputElement;
  if (pagePositionInput) pagePositionInput.value = '0';

  const pageCountInput = document.getElementById(
    'page-count'
  ) as HTMLInputElement;
  if (pageCountInput) pageCountInput.value = '1';
}

async function updateUI() {
  const fileDisplayArea = document.getElementById('file-display-area');
  const toolOptions = document.getElementById('tool-options');
  const pagePositionHint = document.getElementById('page-position-hint');
  const pagePositionInput = document.getElementById(
    'page-position'
  ) as HTMLInputElement;

  if (!fileDisplayArea) return;

  fileDisplayArea.innerHTML = '';

  if (pageState.file) {
    const fileDiv = document.createElement('div');
    fileDiv.className =
      'flex items-center justify-between bg-gray-700 p-3 rounded-lg text-sm';

    const infoContainer = document.createElement('div');
    infoContainer.className = 'flex flex-col overflow-hidden';

    const nameSpan = document.createElement('div');
    nameSpan.className = 'truncate font-medium text-gray-200 text-sm mb-1';
    nameSpan.textContent = pageState.file.name;

    const metaSpan = document.createElement('div');
    metaSpan.className = 'text-xs text-gray-400';
    metaSpan.textContent = translate(
      'tools:addBlankPage.dynamic.3194768496',
      `${formatBytes(pageState.file.size)} • Loading...`,
      { value0: formatBytes(pageState.file.size) }
    );

    infoContainer.append(nameSpan, metaSpan);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'ml-4 text-red-400 hover:text-red-300 flex-shrink-0';
    removeBtn.innerHTML = '<i data-lucide="trash-2" class="w-4 h-4"></i>';
    removeBtn.onclick = function () {
      resetState();
    };

    fileDiv.append(infoContainer, removeBtn);
    fileDisplayArea.appendChild(fileDiv);
    createIcons({ icons });

    // Load PDF document
    try {
      const result = await loadPdfWithPasswordPrompt(pageState.file);
      if (!result) {
        resetState();
        return;
      }
      showLoader(translate('fileHandler.loadingPdf', 'Loading PDF...'));
      pageState.file = result.file;
      pageState.pdfDoc = await loadPdfDocument(result.bytes);
      result.pdf.destroy();
      hideLoader();

      const pageCount = pageState.pdfDoc.getPageCount();
      metaSpan.textContent = translate(
        'tools:addBlankPage.dynamic.ceda244c1d',
        `${formatBytes(pageState.file.size)} • ${pageCount} pages`,
        { value0: formatBytes(pageState.file.size), value1: pageCount }
      );

      if (pagePositionHint) {
        pagePositionHint.textContent = translate(
          'tools:addBlankPage.dynamic.6d8c3c7f1a',
          `Enter 0 to insert at the beginning, or ${pageCount} to insert at the end.`,
          { value0: pageCount }
        );
      }
      if (pagePositionInput) {
        pagePositionInput.max = pageCount.toString();
      }

      if (toolOptions) toolOptions.classList.remove('hidden');
    } catch (error) {
      console.error('Error loading PDF:', error);
      hideLoader();
      showAlert(
        translate('alert.error', 'Error'),
        translate(
          'tools:addBlankPage.dynamic.b6aab8baeb',
          'Failed to load PDF file.'
        )
      );
      resetState();
    }
  } else {
    if (toolOptions) toolOptions.classList.add('hidden');
  }
}

async function addBlankPages() {
  if (!pageState.pdfDoc || !pageState.file) {
    showAlert(
      translate('alert.error', 'Error'),
      translate(
        'tools:addBlankPage.dynamic.c2c57c5f32',
        'Please upload a PDF first.'
      )
    );
    return;
  }

  const pagePositionInput = document.getElementById(
    'page-position'
  ) as HTMLInputElement;
  const pageCountInput = document.getElementById(
    'page-count'
  ) as HTMLInputElement;

  const position = parseInt(pagePositionInput.value);
  const insertCount = parseInt(pageCountInput.value);
  const totalPages = pageState.pdfDoc.getPageCount();

  if (isNaN(position) || position < 0 || position > totalPages) {
    showAlert(
      translate('tools:addBlankPage.dynamic.44bcb69846', 'Invalid Input'),
      translate(
        'tools:addBlankPage.dynamic.6234a20c60',
        `Please enter a number between 0 and ${totalPages}.`,
        { value0: totalPages }
      )
    );
    return;
  }

  if (isNaN(insertCount) || insertCount < 1) {
    showAlert(
      translate('tools:addBlankPage.dynamic.44bcb69846', 'Invalid Input'),
      translate(
        'tools:addBlankPage.dynamic.e791afd3b7',
        'Please enter a valid number of pages (1 or more).'
      )
    );
    return;
  }

  showLoader(
    translate(
      'tools:addBlankPage.dynamic.bae7d9dce8',
      `Adding ${insertCount} blank page${insertCount > 1 ? 's' : ''}...`,
      { value0: insertCount, value1: insertCount > 1 ? 's' : '' }
    )
  );

  try {
    const newPdf = await PDFLibDocument.create();
    const { width, height } = pageState.pdfDoc.getPage(0).getSize();
    const allIndices = Array.from({ length: totalPages }, function (_, i) {
      return i;
    });

    const indicesBefore = allIndices.slice(0, position);
    const indicesAfter = allIndices.slice(position);

    if (indicesBefore.length > 0) {
      const copied = await newPdf.copyPages(pageState.pdfDoc, indicesBefore);
      copied.forEach(function (p) {
        newPdf.addPage(p);
      });
    }

    // Add the specified number of blank pages
    for (let i = 0; i < insertCount; i++) {
      newPdf.addPage([width, height]);
    }

    if (indicesAfter.length > 0) {
      const copied = await newPdf.copyPages(pageState.pdfDoc, indicesAfter);
      copied.forEach(function (p) {
        newPdf.addPage(p);
      });
    }

    const newPdfBytes = await newPdf.save();
    downloadFile(
      new Blob([new Uint8Array(newPdfBytes)], { type: 'application/pdf' }),
      pageState.file.name
    );

    showAlert(
      translate('alert.success', 'Success'),
      translate(
        'tools:addBlankPage.dynamic.7dffb09a71',
        `Added ${insertCount} blank page${insertCount > 1 ? 's' : ''} successfully!`,
        { value0: insertCount, value1: insertCount > 1 ? 's' : '' }
      ),
      'success',
      function () {
        resetState();
      }
    );
  } catch (e) {
    console.error(e);
    showAlert(
      translate('alert.error', 'Error'),
      translate(
        'tools:addBlankPage.dynamic.3f3a8dab5a',
        `Could not add blank page${insertCount > 1 ? 's' : ''}.`,
        { value0: insertCount > 1 ? 's' : '' }
      )
    );
  } finally {
    hideLoader();
  }
}

function handleFileSelect(files: FileList | null) {
  if (files && files.length > 0) {
    const file = files[0];
    if (
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf')
    ) {
      pageState.file = file;
      updateUI();
    }
  }
}

document.addEventListener('DOMContentLoaded', function () {
  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  const dropZone = document.getElementById('drop-zone');
  const processBtn = document.getElementById('process-btn');
  const backBtn = document.getElementById('back-to-tools');

  if (backBtn) {
    backBtn.addEventListener('click', function () {
      window.location.href = import.meta.env.BASE_URL;
    });
  }

  if (fileInput && dropZone) {
    fileInput.addEventListener('change', function (e) {
      handleFileSelect((e.target as HTMLInputElement).files);
    });

    dropZone.addEventListener('dragover', function (e) {
      e.preventDefault();
      dropZone.classList.add('bg-gray-700');
    });

    dropZone.addEventListener('dragleave', function (e) {
      e.preventDefault();
      dropZone.classList.remove('bg-gray-700');
    });

    dropZone.addEventListener('drop', function (e) {
      e.preventDefault();
      dropZone.classList.remove('bg-gray-700');
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        const pdfFiles = Array.from(files).filter(function (f) {
          return (
            f.type === 'application/pdf' ||
            f.name.toLowerCase().endsWith('.pdf')
          );
        });
        if (pdfFiles.length > 0) {
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(pdfFiles[0]);
          handleFileSelect(dataTransfer.files);
        }
      }
    });

    fileInput.addEventListener('click', function () {
      fileInput.value = '';
    });
  }

  if (processBtn) {
    processBtn.addEventListener('click', addBlankPages);
  }
});
