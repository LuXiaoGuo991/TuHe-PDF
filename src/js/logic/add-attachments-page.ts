import { AddAttachmentState } from '@/types';
import { t } from '../i18n/i18n';

const translate = (
  key: string,
  fallback: string,
  options?: Record<string, unknown>
) => {
  const translation = t(key, options);
  return translation && translation !== key ? translation : fallback;
};
import { showLoader, hideLoader, showAlert } from '../ui.js';
import { downloadFile, formatBytes } from '../utils/helpers.js';
import { createIcons, icons } from 'lucide';
import { isCpdfAvailable } from '../utils/cpdf-helper.js';
import {
  showWasmRequiredDialog,
  WasmProvider,
} from '../utils/wasm-provider.js';
import { loadPdfWithPasswordPrompt } from '../utils/password-prompt.js';
import { loadPdfDocument } from '../utils/load-pdf-document.js';

const worker = new Worker(
  import.meta.env.BASE_URL + 'workers/add-attachments.worker.js'
);

const pageState: AddAttachmentState = {
  file: null,
  pdfDoc: null,
  attachments: [],
};

function resetState() {
  pageState.file = null;
  pageState.pdfDoc = null;
  pageState.attachments = [];

  const fileDisplayArea = document.getElementById('file-display-area');
  if (fileDisplayArea) fileDisplayArea.innerHTML = '';

  const toolOptions = document.getElementById('tool-options');
  if (toolOptions) toolOptions.classList.add('hidden');

  const attachmentFileList = document.getElementById('attachment-file-list');
  if (attachmentFileList) attachmentFileList.innerHTML = '';

  const attachmentInput = document.getElementById(
    'attachment-files-input'
  ) as HTMLInputElement;
  if (attachmentInput) attachmentInput.value = '';

  const attachmentLevelOptions = document.getElementById(
    'attachment-level-options'
  );
  if (attachmentLevelOptions) attachmentLevelOptions.classList.add('hidden');

  const pageRangeWrapper = document.getElementById('page-range-wrapper');
  if (pageRangeWrapper) pageRangeWrapper.classList.add('hidden');

  const processBtn = document.getElementById('process-btn');
  if (processBtn) processBtn.classList.add('hidden');

  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  if (fileInput) fileInput.value = '';

  const documentRadio = document.querySelector(
    'input[name="attachment-level"][value="document"]'
  ) as HTMLInputElement;
  if (documentRadio) documentRadio.checked = true;
}

worker.onmessage = function (e) {
  const data = e.data;

  if (data.status === 'success' && data.modifiedPDF !== undefined) {
    hideLoader();

    downloadFile(
      new Blob([new Uint8Array(data.modifiedPDF)], { type: 'application/pdf' }),
      pageState.file?.name || 'document.pdf'
    );

    showAlert(
      translate('alert.success', 'Success'),
      translate(
        'tools:addAttachments.dynamic.b699690e1e',
        `${pageState.attachments.length} file(s) attached successfully.`,
        { value0: pageState.attachments.length }
      ),
      'success',
      function () {
        resetState();
      }
    );
  } else if (data.status === 'error') {
    hideLoader();
    showAlert(
      translate('alert.error', 'Error'),
      translate('alert.processFailed', 'Processing failed. Please try again.')
    );
  }
};

worker.onerror = function (error) {
  hideLoader();
  console.error('Worker error:', error);
  showAlert(
    translate('alert.error', 'Error'),
    translate(
      'tools:addAttachments.dynamic.b76c5703b2',
      'Worker error occurred. Check console for details.'
    )
  );
};

async function updateUI() {
  const fileDisplayArea = document.getElementById('file-display-area');
  const toolOptions = document.getElementById('tool-options');

  if (!fileDisplayArea) return;

  fileDisplayArea.innerHTML = '';

  if (pageState.file) {
    const fileDiv = document.createElement('div');
    fileDiv.className =
      'flex items-center justify-between ui-bg-raised p-3 rounded-lg text-sm';

    const infoContainer = document.createElement('div');
    infoContainer.className = 'flex flex-col overflow-hidden';

    const nameSpan = document.createElement('div');
    nameSpan.className = 'truncate font-medium ui-text-primary text-sm mb-1';
    nameSpan.textContent = pageState.file.name;

    const metaSpan = document.createElement('div');
    metaSpan.className = 'text-xs ui-text-secondary';
    metaSpan.textContent = translate(
      'tools:addAttachments.dynamic.8413da039e',
      `${formatBytes(pageState.file.size)} • Loading...`,
      { value0: formatBytes(pageState.file.size) }
    );

    infoContainer.append(nameSpan, metaSpan);

    const removeBtn = document.createElement('button');
    removeBtn.className =
      'ml-4 ui-text-danger ui-hover-text-danger flex-shrink-0';
    removeBtn.innerHTML = '<i data-lucide="trash-2" class="w-4 h-4"></i>';
    removeBtn.onclick = function () {
      resetState();
    };

    fileDiv.append(infoContainer, removeBtn);
    fileDisplayArea.appendChild(fileDiv);
    createIcons({ icons });

    try {
      const result = await loadPdfWithPasswordPrompt(pageState.file);
      if (!result) {
        resetState();
        return;
      }
      result.pdf.destroy();
      pageState.file = result.file;
      showLoader(translate('fileHandler.loadingPdf', 'Loading PDF...'));

      pageState.pdfDoc = await loadPdfDocument(result.bytes);

      const pageCount = pageState.pdfDoc.getPageCount();
      metaSpan.textContent = translate(
        'tools:addAttachments.dynamic.97300a736c',
        `${formatBytes(pageState.file.size)} • ${pageCount} pages`,
        { value0: formatBytes(pageState.file.size), value1: pageCount }
      );

      const totalPagesSpan = document.getElementById('attachment-total-pages');
      if (totalPagesSpan) totalPagesSpan.textContent = pageCount.toString();

      hideLoader();

      if (toolOptions) toolOptions.classList.remove('hidden');
    } catch (error) {
      console.error('Error loading PDF:', error);
      hideLoader();
      showAlert(
        translate('alert.error', 'Error'),
        translate(
          'tools:addAttachments.dynamic.5af4d6db9e',
          'Failed to load PDF file.'
        )
      );
      resetState();
    }
  } else {
    if (toolOptions) toolOptions.classList.add('hidden');
  }
}

function updateAttachmentList() {
  const attachmentFileList = document.getElementById('attachment-file-list');
  const attachmentLevelOptions = document.getElementById(
    'attachment-level-options'
  );
  const processBtn = document.getElementById('process-btn');

  if (!attachmentFileList) return;

  attachmentFileList.innerHTML = '';

  pageState.attachments.forEach(function (file) {
    const div = document.createElement('div');
    div.className =
      'flex justify-between items-center p-2 ui-bg-surface rounded-md ui-text-primary';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'truncate text-sm';
    nameSpan.textContent = file.name;

    const sizeSpan = document.createElement('span');
    sizeSpan.className = 'text-xs ui-text-secondary';
    sizeSpan.textContent = formatBytes(file.size);

    div.append(nameSpan, sizeSpan);
    attachmentFileList.appendChild(div);
  });

  if (pageState.attachments.length > 0) {
    if (attachmentLevelOptions)
      attachmentLevelOptions.classList.remove('hidden');
    if (processBtn) processBtn.classList.remove('hidden');
  } else {
    if (attachmentLevelOptions) attachmentLevelOptions.classList.add('hidden');
    if (processBtn) processBtn.classList.add('hidden');
  }
}

async function addAttachments() {
  if (!pageState.file || !pageState.pdfDoc) {
    showAlert(
      translate('alert.error', 'Error'),
      translate(
        'tools:addAttachments.dynamic.2a84f91d07',
        'Please upload a PDF first.'
      )
    );
    return;
  }

  if (pageState.attachments.length === 0) {
    showAlert(
      translate('alert.noFiles', 'No Files'),
      translate(
        'tools:addAttachments.dynamic.9b8eee5d44',
        'Please select at least one file to attach.'
      )
    );
    return;
  }

  // Check if CPDF is configured
  if (!isCpdfAvailable()) {
    showWasmRequiredDialog('cpdf');
    return;
  }

  const attachmentLevel =
    (
      document.querySelector(
        'input[name="attachment-level"]:checked'
      ) as HTMLInputElement
    )?.value || 'document';

  let pageRange: string = '';

  if (attachmentLevel === 'page') {
    const pageRangeInput = document.getElementById(
      'attachment-page-range'
    ) as HTMLInputElement;
    pageRange = pageRangeInput?.value?.trim() || '';

    if (!pageRange) {
      showAlert(
        translate('alert.error', 'Error'),
        translate(
          'tools:addAttachments.dynamic.17dfbec9d9',
          'Please specify a page range for page-level attachments.'
        )
      );
      return;
    }
  }

  showLoader(
    translate(
      'tools:addAttachments.dynamic.c42168707d',
      'Embedding files into PDF...'
    )
  );

  try {
    const pdfBuffer = await pageState.file.arrayBuffer();

    const attachmentBuffers: ArrayBuffer[] = [];
    const attachmentNames: string[] = [];

    for (let i = 0; i < pageState.attachments.length; i++) {
      const file = pageState.attachments[i];
      showLoader(
        translate(
          'tools:addAttachments.dynamic.086438607c',
          `Reading ${file.name} (${i + 1}/${pageState.attachments.length})...`,
          {
            value0: file.name,
            value1: i + 1,
            value2: pageState.attachments.length,
          }
        )
      );

      const fileBuffer = await file.arrayBuffer();
      attachmentBuffers.push(fileBuffer);
      attachmentNames.push(file.name);
    }

    showLoader(
      translate(
        'tools:addAttachments.dynamic.f95aaa0707',
        'Attaching files to PDF...'
      )
    );

    const message = {
      command: 'add-attachments',
      pdfBuffer: pdfBuffer,
      attachmentBuffers: attachmentBuffers,
      attachmentNames: attachmentNames,
      attachmentLevel: attachmentLevel,
      pageRange: pageRange,
      cpdfUrl: WasmProvider.getUrl('cpdf')! + 'coherentpdf.browser.min.js',
    };

    const transferables = [pdfBuffer, ...attachmentBuffers];
    worker.postMessage(message, transferables);
  } catch (error) {
    console.error('Error attaching files:', error);
    hideLoader();
    showAlert(
      translate('alert.error', 'Error'),
      translate('alert.processFailed', 'Processing failed. Please try again.')
    );
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

function handleAttachmentSelect(files: FileList | null) {
  if (files && files.length > 0) {
    pageState.attachments = Array.from(files);
    updateAttachmentList();
  }
}

document.addEventListener('DOMContentLoaded', function () {
  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  const dropZone = document.getElementById('drop-zone');
  const attachmentInput = document.getElementById(
    'attachment-files-input'
  ) as HTMLInputElement;
  const attachmentDropZone = document.getElementById('attachment-drop-zone');
  const processBtn = document.getElementById('process-btn');
  const backBtn = document.getElementById('back-to-tools');
  const pageRangeWrapper = document.getElementById('page-range-wrapper');

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
      dropZone.classList.add('ui-bg-raised');
    });

    dropZone.addEventListener('dragleave', function (e) {
      e.preventDefault();
      dropZone.classList.remove('ui-bg-raised');
    });

    dropZone.addEventListener('drop', function (e) {
      e.preventDefault();
      dropZone.classList.remove('ui-bg-raised');
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

  if (attachmentInput && attachmentDropZone) {
    attachmentInput.addEventListener('change', function (e) {
      handleAttachmentSelect((e.target as HTMLInputElement).files);
    });

    attachmentDropZone.addEventListener('dragover', function (e) {
      e.preventDefault();
      attachmentDropZone.classList.add('ui-bg-raised');
    });

    attachmentDropZone.addEventListener('dragleave', function (e) {
      e.preventDefault();
      attachmentDropZone.classList.remove('ui-bg-raised');
    });

    attachmentDropZone.addEventListener('drop', function (e) {
      e.preventDefault();
      attachmentDropZone.classList.remove('ui-bg-raised');
      const files = e.dataTransfer?.files;
      if (files) {
        handleAttachmentSelect(files);
      }
    });

    attachmentInput.addEventListener('click', function () {
      attachmentInput.value = '';
    });
  }

  const attachmentLevelRadios = document.querySelectorAll(
    'input[name="attachment-level"]'
  );
  attachmentLevelRadios.forEach(function (radio) {
    radio.addEventListener('change', function (e) {
      const value = (e.target as HTMLInputElement).value;
      if (value === 'page' && pageRangeWrapper) {
        pageRangeWrapper.classList.remove('hidden');
      } else if (pageRangeWrapper) {
        pageRangeWrapper.classList.add('hidden');
      }
    });
  });

  if (processBtn) {
    processBtn.addEventListener('click', addAttachments);
  }
});
