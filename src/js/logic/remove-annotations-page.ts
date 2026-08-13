import { PDFDocument, PDFName } from 'pdf-lib';
import { t } from '../i18n/i18n';

const translate = (
  key: string,
  fallback: string,
  options?: Record<string, unknown>
) => {
  const translation = t(key, options);
  return translation && translation !== key ? translation : fallback;
};
import { createIcons, icons } from 'lucide';
import { loadPdfWithPasswordPrompt } from '../utils/password-prompt.js';
import { loadPdfDocument } from '../utils/load-pdf-document.js';
import { escapeHtml, formatBytes } from '../utils/helpers.js';

// State management
const pageState: { pdfDoc: PDFDocument | null; file: File | null } = {
  pdfDoc: null,
  file: null,
};

// UI helpers
function showLoader(
  message: string = translate('loader.processing', 'Processing...')
) {
  const loader = document.getElementById('loader-modal');
  const loaderText = document.getElementById('loader-text');
  if (loader) loader.classList.remove('hidden');
  if (loaderText) loaderText.textContent = message;
}

function hideLoader() {
  const loader = document.getElementById('loader-modal');
  if (loader) loader.classList.add('hidden');
}

function showAlert(
  title: string,
  message: string,
  type: string = 'error',
  callback?: () => void
) {
  const modal = document.getElementById('alert-modal');
  const alertTitle = document.getElementById('alert-title');
  const alertMessage = document.getElementById('alert-message');
  const okBtn = document.getElementById('alert-ok');

  if (alertTitle) alertTitle.textContent = title;
  if (alertMessage) alertMessage.textContent = message;
  if (modal) modal.classList.remove('hidden');

  if (okBtn) {
    const newOkBtn = okBtn.cloneNode(true) as HTMLElement;
    okBtn.replaceWith(newOkBtn);
    newOkBtn.addEventListener('click', () => {
      modal?.classList.add('hidden');
      if (callback) callback();
    });
  }
}

function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function updateFileDisplay() {
  const displayArea = document.getElementById('file-display-area');
  if (!displayArea || !pageState.file || !pageState.pdfDoc) return;

  const fileSize = formatBytes(pageState.file.size);
  const pageCount = pageState.pdfDoc.getPageCount();

  displayArea.innerHTML = `
        <div class="ui-bg-raised p-3 rounded-lg border ui-border ui-hover-border-action transition-colors">
            <div class="flex items-center justify-between">
                <div class="flex-1 min-w-0">
                    <p class="truncate font-medium ui-text-primary">${escapeHtml(pageState.file.name)}</p>
                    <p class="ui-text-secondary text-sm">${fileSize} • ${translate('common.filePages', '{{count}} pages', { count: pageCount })}</p>
                </div>
                <button id="remove-file" class="ui-text-danger ui-hover-text-danger p-2 flex-shrink-0 ml-2" title="${translate('tools:common.removeFile', 'Remove file')}">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>
        </div>
    `;

  createIcons({ icons });

  document
    .getElementById('remove-file')
    ?.addEventListener('click', () => resetState());
}

function resetState() {
  pageState.pdfDoc = null;
  pageState.file = null;
  const displayArea = document.getElementById('file-display-area');
  if (displayArea) displayArea.innerHTML = '';
  document.getElementById('options-panel')?.classList.add('hidden');
  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  if (fileInput) fileInput.value = '';
}

// File handling
async function handleFileUpload(file: File) {
  if (!file || file.type !== 'application/pdf') {
    showAlert(
      translate('alert.error', 'Error'),
      translate(
        'tools:removeAnnotations.dynamic.b14673b883',
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
        'tools:removeAnnotations.dynamic.2e1c623bdc',
        'Failed to load PDF file.'
      )
    );
  } finally {
    hideLoader();
  }
}

// Process function
async function processRemoveAnnotations() {
  if (!pageState.pdfDoc) {
    showAlert(
      translate('alert.error', 'Error'),
      translate(
        'tools:removeAnnotations.dynamic.269b7169f3',
        'Please upload a PDF file first.'
      )
    );
    return;
  }

  showLoader(
    translate(
      'tools:removeAnnotations.dynamic.89b910e2a6',
      'Removing annotations...'
    )
  );
  try {
    const pages = pageState.pdfDoc.getPages();

    // Remove all annotations from all pages
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const annotRefs = page.node.Annots()?.asArray() || [];
      if (annotRefs.length > 0) {
        page.node.delete(PDFName.of('Annots'));
      }
    }

    const newPdfBytes = await pageState.pdfDoc.save();
    downloadFile(
      new Blob([new Uint8Array(newPdfBytes)], { type: 'application/pdf' }),
      pageState.file?.name || 'document.pdf'
    );
    showAlert(
      translate('alert.success', 'Success'),
      translate(
        'tools:removeAnnotations.dynamic.7abc526444',
        'Annotations removed successfully!'
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
        'tools:removeAnnotations.dynamic.880d584cbf',
        'Could not remove annotations.'
      )
    );
  } finally {
    hideLoader();
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  const dropZone = document.getElementById('drop-zone');
  const processBtn = document.getElementById('process-btn');
  const backBtn = document.getElementById('back-to-tools');

  fileInput?.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) handleFileUpload(file);
  });

  dropZone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('ui-border-action');
  });

  dropZone?.addEventListener('dragleave', () => {
    dropZone.classList.remove('ui-border-action');
  });

  dropZone?.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('ui-border-action');
    const file = e.dataTransfer?.files[0];
    if (file) handleFileUpload(file);
  });

  processBtn?.addEventListener('click', processRemoveAnnotations);

  backBtn?.addEventListener('click', () => {
    window.location.href = '../../index.html';
  });
});
