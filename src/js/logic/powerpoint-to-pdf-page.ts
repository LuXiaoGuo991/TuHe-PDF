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
import { deduplicateFileName } from '../utils/deduplicate-filename.js';

document.addEventListener('DOMContentLoaded', () => {
  state.files = [];

  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  const dropZone = document.getElementById('drop-zone');
  const convertOptions = document.getElementById('convert-options');
  const fileDisplayArea = document.getElementById('file-display-area');
  const fileControls = document.getElementById('file-controls');
  const addMoreBtn = document.getElementById('add-more-btn');
  const clearFilesBtn = document.getElementById('clear-files-btn');
  const processBtn = document.getElementById('process-btn');

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
    state.pdfDoc = null;
    updateUI();
  };

  const convertToPdf = async () => {
    try {
      if (state.files.length === 0) {
        showAlert(
          translate('alert.noFiles', 'No Files'),
          translate(
            'tools:powerpointToPdf.dynamic.af1899e4e6',
            'Please select at least one PowerPoint file.'
          )
        );
        hideLoader();
        return;
      }

      const converter = getLibreOfficeConverter();

      // Initialize LibreOffice if not already done
      await converter.initialize((progress: LoadProgress) => {
        showLoader(
          translate('loader.processing', 'Processing...'),
          progress.percent
        );
      });

      if (state.files.length === 1) {
        const originalFile = state.files[0];

        showLoader(translate('loader.processing', 'Processing...'));

        const pdfBlob = await converter.convertToPdf(originalFile);

        const fileName =
          originalFile.name.replace(/\.(ppt|pptx|odp)$/i, '') + '.pdf';

        downloadFile(pdfBlob, fileName);

        hideLoader();

        showAlert(
          translate(
            'tools:powerpointToPdf.dynamic.f3b510faff',
            'Conversion Complete'
          ),
          translate(
            'tools:powerpointToPdf.dynamic.94609a8cae',
            `Successfully converted ${originalFile.name} to PDF.`,
            { value0: originalFile.name }
          ),
          'success',
          () => resetState()
        );
      } else {
        showLoader(translate('loader.processing', 'Processing...'));
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        const usedNames = new Set<string>();

        for (let i = 0; i < state.files.length; i++) {
          const file = state.files[i];
          showLoader(
            translate(
              'tools:powerpointToPdf.dynamic.ec950a4de2',
              `Converting ${i + 1}/${state.files.length}: ${file.name}...`,
              { value0: i + 1, value1: state.files.length, value2: file.name }
            )
          );

          const pdfBlob = await converter.convertToPdf(file);

          const baseName = file.name.replace(/\.(ppt|pptx|odp)$/i, '');
          const pdfBuffer = await pdfBlob.arrayBuffer();
          const zipEntryName = deduplicateFileName(
            `${baseName}.pdf`,
            usedNames
          );
          zip.file(zipEntryName, pdfBuffer);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });

        downloadFile(zipBlob, 'powerpoint-converted.zip');

        hideLoader();

        showAlert(
          translate(
            'tools:powerpointToPdf.dynamic.f3b510faff',
            'Conversion Complete'
          ),
          translate(
            'tools:powerpointToPdf.dynamic.d937ebcd47',
            `Successfully converted ${state.files.length} PowerPoint file(s) to PDF.`,
            { value0: state.files.length }
          ),
          'success',
          () => resetState()
        );
      }
    } catch (e: unknown) {
      hideLoader();
      showAlert(
        translate('alert.error', 'Error'),
        translate('alert.processFailed', 'Processing failed. Please try again.')
      );
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (files && files.length > 0) {
      state.files = [...state.files, ...Array.from(files)];
      updateUI();
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
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        const pptFiles = Array.from(files).filter((f) => {
          const name = f.name.toLowerCase();
          return (
            name.endsWith('.ppt') ||
            name.endsWith('.pptx') ||
            name.endsWith('.odp')
          );
        });
        if (pptFiles.length > 0) {
          const dataTransfer = new DataTransfer();
          pptFiles.forEach((f) => dataTransfer.items.add(f));
          handleFileSelect(dataTransfer.files);
        }
      }
    });

    // Clear value on click to allow re-selecting the same file
    fileInput.addEventListener('click', () => {
      fileInput.value = '';
    });
  }

  if (addMoreBtn) {
    addMoreBtn.addEventListener('click', () => {
      fileInput.click();
    });
  }

  if (clearFilesBtn) {
    clearFilesBtn.addEventListener('click', () => {
      resetState();
    });
  }

  if (processBtn) {
    processBtn.addEventListener('click', convertToPdf);
  }

  updateUI();
});
