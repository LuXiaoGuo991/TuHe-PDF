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
import {
  downloadFile,
  readFileAsArrayBuffer,
  formatBytes,
  getPDFDocument,
} from '../utils/helpers.js';
import { state } from '../state.js';
import { createIcons, icons } from 'lucide';
import { convertFileToPdfA, type PdfALevel } from '../utils/ghostscript-loader';
import { loadPyMuPDF, isPyMuPDFAvailable } from '../utils/pymupdf-loader.js';
import type { PyMuPDFInstance } from '@/types';
import { showWasmRequiredDialog } from '../utils/wasm-provider.js';
import { batchDecryptIfNeeded } from '../utils/password-prompt.js';
import { deduplicateFileName } from '../utils/deduplicate-filename.js';

document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  const dropZone = document.getElementById('drop-zone');
  const processBtn = document.getElementById('process-btn');
  const fileDisplayArea = document.getElementById('file-display-area');
  const optionsContainer = document.getElementById('options-container');
  const fileControls = document.getElementById('file-controls');
  const addMoreBtn = document.getElementById('add-more-btn');
  const clearFilesBtn = document.getElementById('clear-files-btn');
  const pdfaLevelSelect = document.getElementById(
    'pdfa-level'
  ) as HTMLSelectElement;

  const updateUI = async () => {
    if (!fileDisplayArea || !optionsContainer || !processBtn || !fileControls)
      return;

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
        metaSpan.textContent = translate(
          'tools:pdfToPdfa.dynamic.1ebf7b22d2',
          `${formatBytes(file.size)} • ${t('common.loadingPageCount')}`,
          {
            value0: formatBytes(file.size),
            value1: t('common.loadingPageCount'),
          }
        );

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

        try {
          const arrayBuffer = await readFileAsArrayBuffer(file);
          const pdfDoc = await getPDFDocument({ data: arrayBuffer }).promise;
          metaSpan.textContent = translate(
            'tools:pdfToPdfa.dynamic.7fdcb51569',
            `${formatBytes(file.size)} • ${pdfDoc.numPages} pages`,
            { value0: formatBytes(file.size), value1: pdfDoc.numPages }
          );
        } catch (error) {
          console.error('Error loading PDF:', error);
          metaSpan.textContent = translate(
            'tools:pdfToPdfa.dynamic.5c1931ff9b',
            `${formatBytes(file.size)} • Could not load page count`,
            { value0: formatBytes(file.size) }
          );
        }
      }

      createIcons({ icons });
      fileControls.classList.remove('hidden');
      optionsContainer.classList.remove('hidden');
      (processBtn as HTMLButtonElement).disabled = false;
    } else {
      fileDisplayArea.innerHTML = '';
      fileControls.classList.add('hidden');
      optionsContainer.classList.add('hidden');
      (processBtn as HTMLButtonElement).disabled = true;
    }
  };

  const resetState = () => {
    state.files = [];
    state.pdfDoc = null;

    if (pdfaLevelSelect) pdfaLevelSelect.value = 'PDF/A-2b';

    updateUI();
  };

  const convertToPdfA = async () => {
    const level = pdfaLevelSelect.value as PdfALevel;

    try {
      if (state.files.length === 0) {
        showAlert(
          translate('alert.noFiles', 'No Files'),
          translate(
            'tools:pdfToPdfa.dynamic.b4d3f1eaca',
            'Please select at least one PDF file.'
          )
        );
        return;
      }

      state.files = await batchDecryptIfNeeded(state.files);

      if (state.files.length === 1) {
        const originalFile = state.files[0];
        const preFlattenCheckbox = document.getElementById(
          'pre-flatten'
        ) as HTMLInputElement;
        const shouldPreFlatten = preFlattenCheckbox?.checked || false;

        let fileToConvert = originalFile;

        // Pre-flatten using PyMuPDF rasterization if checkbox is checked
        if (shouldPreFlatten) {
          if (!isPyMuPDFAvailable()) {
            showWasmRequiredDialog('pymupdf');
            return;
          }

          showLoader(
            translate(
              'tools:pdfToPdfa.dynamic.86822cd801',
              'Pre-flattening PDF...'
            )
          );
          const pymupdf = await loadPyMuPDF();

          // Rasterize PDF to images and back to PDF (300 DPI for quality)
          const flattenedBlob = await (pymupdf as PyMuPDFInstance).rasterizePdf(
            originalFile,
            {
              dpi: 300,
              format: 'png',
            }
          );

          fileToConvert = new File([flattenedBlob], originalFile.name, {
            type: 'application/pdf',
          });
        }

        showLoader(
          translate(
            'tools:pdfToPdfa.dynamic.7f598ce1b2',
            'Initializing Ghostscript...'
          )
        );

        const convertedBlob = await convertFileToPdfA(
          fileToConvert,
          level,
          (msg) => showLoader(msg)
        );

        const fileName = originalFile.name.replace(/\.pdf$/i, '') + '_pdfa.pdf';

        downloadFile(convertedBlob, fileName);

        hideLoader();

        showAlert(
          translate(
            'tools:pdfToPdfa.dynamic.9c1d9b0762',
            'Conversion Complete'
          ),
          translate(
            'tools:pdfToPdfa.dynamic.68390fdb3e',
            `Successfully converted ${originalFile.name} to ${level}.`,
            { value0: originalFile.name, value1: level }
          ),
          'success',
          () => resetState()
        );
      } else {
        showLoader(
          translate(
            'tools:pdfToPdfa.dynamic.7c0a96310b',
            'Converting multiple PDFs to PDF/A...'
          )
        );
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        const usedNames = new Set<string>();

        for (let i = 0; i < state.files.length; i++) {
          const file = state.files[i];
          showLoader(
            translate(
              'tools:pdfToPdfa.dynamic.1a64674925',
              `Converting ${i + 1}/${state.files.length}: ${file.name}...`,
              { value0: i + 1, value1: state.files.length, value2: file.name }
            )
          );

          const convertedBlob = await convertFileToPdfA(file, level, (msg) =>
            showLoader(msg)
          );

          const baseName = file.name.replace(/\.pdf$/i, '');
          const blobBuffer = await convertedBlob.arrayBuffer();
          const zipEntryName = deduplicateFileName(
            `${baseName}_pdfa.pdf`,
            usedNames
          );
          zip.file(zipEntryName, blobBuffer);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });

        downloadFile(zipBlob, 'pdfa-converted.zip');

        hideLoader();

        showAlert(
          translate(
            'tools:pdfToPdfa.dynamic.9c1d9b0762',
            'Conversion Complete'
          ),
          translate(
            'tools:pdfToPdfa.dynamic.a35ab56af2',
            `Successfully converted ${state.files.length} PDF(s) to ${level}.`,
            { value0: state.files.length, value1: level }
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
        const pdfFiles = Array.from(files).filter(
          (f) =>
            f.type === 'application/pdf' ||
            f.name.toLowerCase().endsWith('.pdf')
        );
        if (pdfFiles.length > 0) {
          const dataTransfer = new DataTransfer();
          pdfFiles.forEach((f) => dataTransfer.items.add(f));
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
    processBtn.addEventListener('click', convertToPdfA);
  }
});
