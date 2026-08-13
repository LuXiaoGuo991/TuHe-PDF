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
import { state } from '../state.js';
import { createIcons, icons } from 'lucide';
import {
  getLibreOfficeConverter,
  type LoadProgress,
} from '../utils/libreoffice-loader.js';

const ACCEPTED_EXTENSIONS = ['.odp'];
const FILETYPE_NAME = 'ODP';

document.addEventListener('DOMContentLoaded', () => {
  state.files = [];

  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  const dropZone = document.getElementById('drop-zone');
  const convertOptions = document.getElementById('convert-options');
  const fileDisplayArea = document.getElementById('file-display-area');
  const fileControls = document.getElementById('file-controls');
  const addMoreBtn = document.getElementById('add-more-btn');
  const clearFilesBtn = document.getElementById('clear-files-btn');
  const backBtn = document.getElementById('back-to-tools');
  const processBtn = document.getElementById('process-btn');

  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.location.href = import.meta.env.BASE_URL;
    });
  }

  const updateUI = async () => {
    if (!convertOptions) return;

    if (state.files.length > 0) {
      if (fileDisplayArea) {
        fileDisplayArea.innerHTML = '';

        for (let index = 0; index < state.files.length; index++) {
          const file = state.files[index];
          const fileDiv = document.createElement('div');
          fileDiv.className =
            'flex items-center justify-between ui-bg-raised p-3 rounded-lg text-sm';

          const infoContainer = document.createElement('div');
          infoContainer.className = 'flex flex-col overflow-hidden';

          const nameSpan = document.createElement('div');
          nameSpan.className =
            'truncate font-medium ui-text-primary text-sm mb-1';
          nameSpan.textContent = file.name;

          const metaSpan = document.createElement('div');
          metaSpan.className = 'text-xs ui-text-secondary';
          metaSpan.textContent = formatBytes(file.size);

          infoContainer.append(nameSpan, metaSpan);

          const removeBtn = document.createElement('button');
          removeBtn.className =
            'ml-4 ui-text-danger ui-hover-text-danger flex-shrink-0';
          removeBtn.innerHTML = '<i data-lucide="trash-2" class="w-4 h-4"></i>';
          removeBtn.onclick = () => {
            state.files = state.files.filter((_, i) => i !== index);
            updateUI();
          };

          fileDiv.append(infoContainer, removeBtn);
          fileDisplayArea.appendChild(fileDiv);
        }

        createIcons({ icons });
      }
      if (fileControls) fileControls.classList.remove('hidden');
      convertOptions.classList.remove('hidden');
    } else {
      if (fileDisplayArea) fileDisplayArea.innerHTML = '';
      if (fileControls) fileControls.classList.add('hidden');
      convertOptions.classList.add('hidden');
    }
  };

  const resetState = () => {
    state.files = [];
    updateUI();
  };

  const convert = async () => {
    if (state.files.length === 0) {
      showAlert(
        translate('alert.noFiles', 'No Files'),
        translate(
          'tools:odpToPdf.dynamic.3f9fd2f58f',
          `Please select at least one ${FILETYPE_NAME} file.`,
          { value0: FILETYPE_NAME }
        )
      );
      return;
    }

    try {
      const converter = getLibreOfficeConverter();

      showLoader(
        translate('tools:odpToPdf.dynamic.bd598b8682', 'Loading engine...')
      );
      await converter.initialize((progress: LoadProgress) => {
        showLoader(
          translate('loader.processing', 'Processing...'),
          progress.percent
        );
      });

      if (state.files.length === 1) {
        const file = state.files[0];
        showLoader(
          translate(
            'tools:odpToPdf.dynamic.9ce08de74a',
            `Converting ${file.name}...`,
            { value0: file.name }
          )
        );
        const pdfBlob = await converter.convertToPdf(file);

        const baseName = file.name.replace(/\.[^/.]+$/, '');
        downloadFile(pdfBlob, `${baseName}.pdf`);

        hideLoader();
        showAlert(
          translate('tools:odpToPdf.dynamic.2db4b50edb', 'Conversion Complete'),
          translate(
            'tools:odpToPdf.dynamic.907967ce32',
            `Successfully converted ${file.name} to PDF.`,
            { value0: file.name }
          ),
          'success',
          () => resetState()
        );
      } else {
        showLoader(
          translate(
            'tools:odpToPdf.dynamic.c1341d5885',
            'Converting multiple files...'
          )
        );
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();

        for (let i = 0; i < state.files.length; i++) {
          const file = state.files[i];
          showLoader(
            translate(
              'tools:odpToPdf.dynamic.a9468949b5',
              `Converting ${i + 1}/${state.files.length}: ${file.name}...`,
              { value0: i + 1, value1: state.files.length, value2: file.name }
            )
          );
          const pdfBlob = await converter.convertToPdf(file);

          const baseName = file.name.replace(/\.[^/.]+$/, '');
          zip.file(`${baseName}.pdf`, pdfBlob);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        downloadFile(zipBlob, `${FILETYPE_NAME.toLowerCase()}-to-pdf.zip`);

        hideLoader();
        showAlert(
          translate('tools:odpToPdf.dynamic.2db4b50edb', 'Conversion Complete'),
          translate(
            'tools:odpToPdf.dynamic.e8192ceb3b',
            `Successfully converted ${state.files.length} files to PDF.`,
            { value0: state.files.length }
          ),
          'success',
          () => resetState()
        );
      }
    } catch (err) {
      hideLoader();
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error(`[${FILETYPE_NAME}ToPDF] Error:`, err);
      showAlert(
        translate('alert.error', 'Error'),
        translate(
          'tools:odpToPdf.dynamic.04b6f5ec3b',
          `An error occurred during conversion. Error: ${message}`,
          { value0: message }
        )
      );
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (files && files.length > 0) {
      const validFiles = Array.from(files).filter((file) => {
        const ext = '.' + file.name.split('.').pop()?.toLowerCase();
        return ACCEPTED_EXTENSIONS.includes(ext);
      });
      if (validFiles.length > 0) {
        state.files = [...state.files, ...validFiles];
        updateUI();
      }
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

  if (addMoreBtn) {
    addMoreBtn.addEventListener('click', () => fileInput.click());
  }

  if (clearFilesBtn) {
    clearFilesBtn.addEventListener('click', resetState);
  }

  if (processBtn) {
    processBtn.addEventListener('click', convert);
  }

  updateUI();
});
