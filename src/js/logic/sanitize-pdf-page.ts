import { showAlert } from '../ui.js';
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
import { icons, createIcons } from 'lucide';
import { SanitizePdfState } from '@/types';
import { sanitizePdf } from '../utils/sanitize.js';
import { loadPdfWithPasswordPrompt } from '../utils/password-prompt.js';

const pageState: SanitizePdfState = {
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
}

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
    metaSpan.textContent = formatBytes(pageState.file.size);

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

    if (toolOptions) toolOptions.classList.remove('hidden');
  } else {
    if (toolOptions) toolOptions.classList.add('hidden');
  }
}

async function handleFileSelect(files: FileList | null) {
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

async function runSanitize() {
  if (!pageState.file) {
    showAlert(
      translate('alert.error', 'Error'),
      translate(
        'tools:sanitizePdf.dynamic.2d61fe671a',
        'No PDF document loaded.'
      )
    );
    return;
  }

  const loaderModal = document.getElementById('loader-modal');
  const loaderText = document.getElementById('loader-text');
  if (loaderModal) loaderModal.classList.remove('hidden');
  if (loaderText)
    loaderText.textContent = translate(
      'tools:sanitizePdf.dynamic.3e222526c4',
      'Sanitizing PDF...'
    );

  try {
    const options = {
      flattenForms: (
        document.getElementById('flatten-forms') as HTMLInputElement
      ).checked,
      removeMetadata: (
        document.getElementById('remove-metadata') as HTMLInputElement
      ).checked,
      removeAnnotations: (
        document.getElementById('remove-annotations') as HTMLInputElement
      ).checked,
      removeJavascript: (
        document.getElementById('remove-javascript') as HTMLInputElement
      ).checked,
      removeEmbeddedFiles: (
        document.getElementById('remove-embedded-files') as HTMLInputElement
      ).checked,
      removeLayers: (
        document.getElementById('remove-layers') as HTMLInputElement
      ).checked,
      removeLinks: (document.getElementById('remove-links') as HTMLInputElement)
        .checked,
      removeStructureTree: (
        document.getElementById('remove-structure-tree') as HTMLInputElement
      ).checked,
      removeMarkInfo: (
        document.getElementById('remove-markinfo') as HTMLInputElement
      ).checked,
      removeFonts: (document.getElementById('remove-fonts') as HTMLInputElement)
        .checked,
    };

    const hasAnyOption = Object.values(options).some(Boolean);
    if (!hasAnyOption) {
      showAlert(
        translate('tools:sanitizePdf.dynamic.0f6dc18170', 'No Changes'),
        translate(
          'tools:sanitizePdf.dynamic.00e694f932',
          'No items were selected for removal or none were found in the PDF.'
        )
      );
      if (loaderModal) loaderModal.classList.add('hidden');
      return;
    }

    if (loaderModal) loaderModal.classList.add('hidden');
    const loaded = await loadPdfWithPasswordPrompt(pageState.file);
    if (!loaded) {
      if (loaderModal) loaderModal.classList.add('hidden');
      return;
    }
    if (loaderModal) loaderModal.classList.remove('hidden');
    if (loaderText)
      loaderText.textContent = translate(
        'tools:sanitizePdf.dynamic.3e222526c4',
        'Sanitizing PDF...'
      );
    loaded.pdf.destroy();
    pageState.file = loaded.file;
    const result = await sanitizePdf(new Uint8Array(loaded.bytes), options);

    downloadFile(
      new Blob([new Uint8Array(result.bytes)], { type: 'application/pdf' }),
      pageState.file?.name || 'document.pdf'
    );
    showAlert(
      translate('alert.success', 'Success'),
      translate(
        'tools:sanitizePdf.dynamic.9851b480b3',
        'PDF has been sanitized and downloaded.'
      ),
      'success',
      () => {
        resetState();
      }
    );
  } catch (e: unknown) {
    console.error('Sanitization Error:', e);
    const msg = e instanceof Error ? e.message : String(e);
    showAlert(
      translate('alert.error', 'Error'),
      translate(
        'tools:sanitizePdf.dynamic.dbfaa60a88',
        `An error occurred during sanitization: ${msg}`,
        { value0: msg }
      )
    );
  } finally {
    if (loaderModal) loaderModal.classList.add('hidden');
  }
}

document.addEventListener('DOMContentLoaded', function () {
  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  const dropZone = document.getElementById('drop-zone');
  const processBtn = document.getElementById('process-btn');

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
      handleFileSelect(e.dataTransfer?.files);
    });

    fileInput.addEventListener('click', function () {
      fileInput.value = '';
    });
  }

  if (processBtn) {
    processBtn.addEventListener('click', runSanitize);
  }
});
