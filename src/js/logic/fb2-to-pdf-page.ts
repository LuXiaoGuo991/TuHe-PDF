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
import { loadPyMuPDF } from '../utils/pymupdf-loader.js';

const FILETYPE = 'fb2';
const EXTENSIONS = ['.fb2'];
const TOOL_NAME = 'FB2';

document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  const dropZone = document.getElementById('drop-zone');
  const processBtn = document.getElementById('process-btn');
  const fileDisplayArea = document.getElementById('file-display-area');
  const fileControls = document.getElementById('file-controls');
  const addMoreBtn = document.getElementById('add-more-btn');
  const clearFilesBtn = document.getElementById('clear-files-btn');
  const backBtn = document.getElementById('back-to-tools');

  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.location.href = import.meta.env.BASE_URL;
    });
  }

  const updateUI = async () => {
    if (!fileDisplayArea || !processBtn || !fileControls) return;

    if (state.files.length > 0) {
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
      fileControls.classList.remove('hidden');
      processBtn.classList.remove('hidden');
      (processBtn as HTMLButtonElement).disabled = false;
    } else {
      fileDisplayArea.innerHTML = '';
      fileControls.classList.add('hidden');
      processBtn.classList.add('hidden');
      (processBtn as HTMLButtonElement).disabled = true;
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
            'tools:fb2ToPdf.dynamic.36e0761e1c',
            `Please select at least one ${TOOL_NAME} file.`,
            { value0: TOOL_NAME }
          )
        );
        return;
      }

      showLoader(
        translate('tools:fb2ToPdf.dynamic.fa537f2cfc', 'Loading engine...')
      );
      const pymupdf = await loadPyMuPDF();

      if (state.files.length === 1) {
        const originalFile = state.files[0];
        showLoader(
          translate(
            'tools:fb2ToPdf.dynamic.ae2a0e93af',
            `Converting ${originalFile.name}...`,
            { value0: originalFile.name }
          )
        );

        const pdfBlob = await pymupdf.convertToPdf(originalFile, {
          filetype: FILETYPE,
        });
        const fileName = originalFile.name.replace(/\.[^.]+$/, '') + '.pdf';

        downloadFile(pdfBlob, fileName);
        hideLoader();

        showAlert(
          translate('tools:fb2ToPdf.dynamic.d561d14791', 'Conversion Complete'),
          translate(
            'tools:fb2ToPdf.dynamic.02e192036d',
            `Successfully converted ${originalFile.name} to PDF.`,
            { value0: originalFile.name }
          ),
          'success',
          () => resetState()
        );
      } else {
        showLoader(
          translate('tools:fb2ToPdf.dynamic.f3982fc6f0', 'Converting files...')
        );
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();

        for (let i = 0; i < state.files.length; i++) {
          const file = state.files[i];
          showLoader(
            translate(
              'tools:fb2ToPdf.dynamic.f7df6b470c',
              `Converting ${i + 1}/${state.files.length}: ${file.name}...`,
              { value0: i + 1, value1: state.files.length, value2: file.name }
            )
          );

          const pdfBlob = await pymupdf.convertToPdf(file, {
            filetype: FILETYPE,
          });
          const baseName = file.name.replace(/\.[^.]+$/, '');
          const pdfBuffer = await pdfBlob.arrayBuffer();
          zip.file(`${baseName}.pdf`, pdfBuffer);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        downloadFile(zipBlob, `${FILETYPE}-converted.zip`);

        hideLoader();

        showAlert(
          translate('tools:fb2ToPdf.dynamic.d561d14791', 'Conversion Complete'),
          translate(
            'tools:fb2ToPdf.dynamic.2740ed96cc',
            `Successfully converted ${state.files.length} ${TOOL_NAME} file(s) to PDF.`,
            { value0: state.files.length, value1: TOOL_NAME }
          ),
          'success',
          () => resetState()
        );
      }
    } catch (e: unknown) {
      console.error(`[${TOOL_NAME}2PDF] ERROR:`, e);
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
        const validFiles = Array.from(files).filter((f) => {
          const name = f.name.toLowerCase();
          return EXTENSIONS.some((ext) => name.endsWith(ext));
        });
        if (validFiles.length > 0) {
          const dataTransfer = new DataTransfer();
          validFiles.forEach((f) => dataTransfer.items.add(f));
          handleFileSelect(dataTransfer.files);
        }
      }
    });

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
});
