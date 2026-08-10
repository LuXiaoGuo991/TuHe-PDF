import { t } from '../i18n/i18n';

const translate = (
  key: string,
  fallback: string,
  options?: Record<string, unknown>
) => {
  const value = t(key, options);
  return value && value !== key ? value : fallback;
};

import { showLoader, hideLoader, showAlert } from '../ui.js';
import { downloadFile, formatBytes } from '../utils/helpers.js';
import { state } from '../state.js';
import { createIcons, icons } from 'lucide';
import {
  getLibreOfficeConverter,
  type LoadProgress,
} from '../utils/libreoffice-loader.js';
import { deduplicateFileName } from '../utils/deduplicate-filename.js';

const ACCEPTED_EXTENSIONS = ['.wpd'];
const FILETYPE_NAME = 'WPD';

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
            'flex items-center justify-between bg-gray-700 p-3 rounded-lg text-sm';

          const infoContainer = document.createElement('div');
          infoContainer.className = 'flex flex-col overflow-hidden';

          const nameSpan = document.createElement('div');
          nameSpan.className =
            'truncate font-medium text-gray-200 text-sm mb-1';
          nameSpan.textContent = file.name;

          const metaSpan = document.createElement('div');
          metaSpan.className = 'text-xs text-gray-400';
          metaSpan.textContent = formatBytes(file.size);

          infoContainer.append(nameSpan, metaSpan);

          const removeBtn = document.createElement('button');
          removeBtn.className =
            'ml-4 text-red-400 hover:text-red-300 flex-shrink-0';
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
          'tools:wpdToPdf.dynamic.c05b666684',
          `Please select at least one ${FILETYPE_NAME} file.`,
          { value0: FILETYPE_NAME }
        )
      );
      return;
    }

    try {
      const converter = getLibreOfficeConverter();

      showLoader(
        translate('tools:wpdToPdf.dynamic.899e0e00c9', 'Loading engine...')
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
            'tools:wpdToPdf.dynamic.36762d3298',
            `Converting ${file.name}...`,
            { value0: file.name }
          )
        );
        const pdfBlob = await converter.convertToPdf(file);

        const baseName = file.name.replace(/\.[^/.]+$/, '');
        downloadFile(pdfBlob, `${baseName}.pdf`);

        hideLoader();
        showAlert(
          translate('tools:wpdToPdf.dynamic.0b68d9570d', 'Conversion Complete'),
          translate(
            'tools:wpdToPdf.dynamic.9074b76c6a',
            `Successfully converted ${file.name} to PDF.`,
            { value0: file.name }
          ),
          'success',
          () => resetState()
        );
      } else {
        showLoader(
          translate(
            'tools:wpdToPdf.dynamic.3a4cd8b1ef',
            'Converting multiple files...'
          )
        );
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        const usedNames = new Set<string>();

        for (let i = 0; i < state.files.length; i++) {
          const file = state.files[i];
          showLoader(
            translate(
              'tools:wpdToPdf.dynamic.7c9cb61fd7',
              `Converting ${i + 1}/${state.files.length}: ${file.name}...`,
              { value0: i + 1, value1: state.files.length, value2: file.name }
            )
          );
          const pdfBlob = await converter.convertToPdf(file);

          const baseName = file.name.replace(/\.[^/.]+$/, '');
          const zipEntryName = deduplicateFileName(
            `${baseName}.pdf`,
            usedNames
          );
          zip.file(zipEntryName, pdfBlob);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        downloadFile(zipBlob, `${FILETYPE_NAME.toLowerCase()}-to-pdf.zip`);

        hideLoader();
        showAlert(
          translate('tools:wpdToPdf.dynamic.0b68d9570d', 'Conversion Complete'),
          translate(
            'tools:wpdToPdf.dynamic.4452ac5793',
            `Successfully converted ${state.files.length} files to PDF.`,
            { value0: state.files.length }
          ),
          'success',
          () => resetState()
        );
      }
    } catch (e: unknown) {
      hideLoader();
      console.error(`[${FILETYPE_NAME}ToPDF] Error:`, e);
      showAlert(
        translate('alert.error', 'Error'),
        translate('alert.processFailed', 'Processing failed. Please try again.')
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
