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
import { loadPyMuPDF } from '../utils/pymupdf-loader.js';
import type { PyMuPDFInstance } from '@/types';
import { batchDecryptIfNeeded } from '../utils/password-prompt.js';
import { deduplicateFileName } from '../utils/deduplicate-filename.js';

document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  const dropZone = document.getElementById('drop-zone');
  const processBtn = document.getElementById('process-btn');
  const fileDisplayArea = document.getElementById('file-display-area');
  const extractOptions = document.getElementById('extract-options');
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
    if (!fileDisplayArea || !extractOptions || !processBtn || !fileControls)
      return;

    if (state.files.length > 0) {
      fileDisplayArea.innerHTML = '';

      for (let index = 0; index < state.files.length; index++) {
        const file = state.files[index];
        const fileDiv = document.createElement('div');
        fileDiv.className =
          'flex items-center justify-between bg-gray-700 p-3 rounded-lg text-sm';

        const infoContainer = document.createElement('div');
        infoContainer.className = 'flex flex-col overflow-hidden';

        const nameSpan = document.createElement('div');
        nameSpan.className = 'truncate font-medium text-gray-200 text-sm mb-1';
        nameSpan.textContent = file.name;

        const metaSpan = document.createElement('div');
        metaSpan.className = 'text-xs text-gray-400';
        metaSpan.textContent = translate(
          'tools:preparePdfForAi.dynamic.570fd297dc',
          `${formatBytes(file.size)} • ${t('common.loadingPageCount')}`,
          {
            value0: formatBytes(file.size),
            value1: t('common.loadingPageCount'),
          }
        );

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

        try {
          const arrayBuffer = await readFileAsArrayBuffer(file);
          const pdfDoc = await getPDFDocument({ data: arrayBuffer }).promise;
          metaSpan.textContent = translate(
            'tools:preparePdfForAi.dynamic.a807df92a6',
            `${formatBytes(file.size)} • ${pdfDoc.numPages} pages`,
            { value0: formatBytes(file.size), value1: pdfDoc.numPages }
          );
        } catch (error) {
          console.error('Error loading PDF:', error);
          metaSpan.textContent = translate(
            'tools:preparePdfForAi.dynamic.e06864fb5a',
            `${formatBytes(file.size)} • Could not load page count`,
            { value0: formatBytes(file.size) }
          );
        }
      }

      createIcons({ icons });
      fileControls.classList.remove('hidden');
      extractOptions.classList.remove('hidden');
      (processBtn as HTMLButtonElement).disabled = false;
    } else {
      fileDisplayArea.innerHTML = '';
      fileControls.classList.add('hidden');
      extractOptions.classList.add('hidden');
      (processBtn as HTMLButtonElement).disabled = true;
    }
  };

  const resetState = () => {
    state.files = [];
    state.pdfDoc = null;
    updateUI();
  };

  const extractForAI = async () => {
    try {
      if (state.files.length === 0) {
        showAlert(
          translate('alert.noFiles', 'No Files'),
          translate(
            'tools:preparePdfForAi.dynamic.c088c28b80',
            'Please select at least one PDF file.'
          )
        );
        return;
      }

      showLoader(
        translate(
          'tools:preparePdfForAi.dynamic.af11d57398',
          'Loading engine...'
        )
      );
      const pymupdf = await loadPyMuPDF();

      hideLoader();
      state.files = await batchDecryptIfNeeded(state.files);
      showLoader(
        translate('tools:preparePdfForAi.dynamic.10e7294ea2', 'Extracting...')
      );

      const total = state.files.length;
      let completed = 0;
      let failed = 0;

      if (total === 1) {
        const file = state.files[0];
        showLoader(
          translate(
            'tools:preparePdfForAi.dynamic.cd0eb912f2',
            `Extracting ${file.name} for AI...`,
            { value0: file.name }
          )
        );

        const llamaDocs = await (pymupdf as PyMuPDFInstance).pdfToLlamaIndex(
          file
        );
        const outName = file.name.replace(/\.pdf$/i, '') + '_llm.json';
        const jsonContent = JSON.stringify(llamaDocs, null, 2);
        downloadFile(
          new Blob([jsonContent], { type: 'application/json' }),
          outName
        );

        hideLoader();
        showAlert(
          translate(
            'tools:preparePdfForAi.dynamic.68f4ee2e54',
            'Extraction Complete'
          ),
          translate(
            'tools:preparePdfForAi.dynamic.81666e637a',
            `Successfully extracted PDF for AI/LLM use.`
          ),
          'success',
          () => resetState()
        );
      } else {
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        const usedNames = new Set<string>();

        for (let fi = 0; fi < state.files.length; fi++) {
          try {
            const file = state.files[fi];
            showLoader(
              translate(
                'tools:preparePdfForAi.dynamic.fdee42364e',
                `Extracting ${file.name} for AI (${completed + 1}/${total})...`,
                { value0: file.name, value1: completed + 1, value2: total }
              )
            );

            const llamaDocs = await (
              pymupdf as PyMuPDFInstance
            ).pdfToLlamaIndex(file);
            const outName = file.name.replace(/\.pdf$/i, '') + '_llm.json';
            const jsonContent = JSON.stringify(llamaDocs, null, 2);
            const zipEntryName = deduplicateFileName(outName, usedNames);
            zip.file(zipEntryName, jsonContent);

            completed++;
          } catch (error) {
            console.error(`Failed to extract ${state.files[fi].name}:`, error);
            failed++;
          }
        }

        showLoader(
          translate(
            'tools:preparePdfForAi.dynamic.0c98912c52',
            'Creating ZIP archive...'
          )
        );
        const zipBlob = await zip.generateAsync({ type: 'blob' });

        downloadFile(zipBlob, 'pdf-for-ai.zip');

        hideLoader();

        if (failed === 0) {
          showAlert(
            translate(
              'tools:preparePdfForAi.dynamic.68f4ee2e54',
              'Extraction Complete'
            ),
            translate(
              'tools:preparePdfForAi.dynamic.a1df979002',
              `Successfully extracted ${completed} PDF(s) for AI/LLM use.`,
              { value0: completed }
            ),
            'success',
            () => resetState()
          );
        } else {
          showAlert(
            translate(
              'tools:preparePdfForAi.dynamic.8a1f9370be',
              'Extraction Partial'
            ),
            translate(
              'tools:preparePdfForAi.dynamic.e38c16fa0d',
              `Extracted ${completed} PDF(s), failed ${failed}.`,
              { value0: completed, value1: failed }
            ),
            'warning',
            () => resetState()
          );
        }
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
      const pdfFiles = Array.from(files).filter(
        (f) =>
          f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
      );
      if (pdfFiles.length > 0) {
        state.files = [...state.files, ...pdfFiles];
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
    addMoreBtn.addEventListener('click', () => {
      fileInput.click();
    });
  }

  if (clearFilesBtn) {
    clearFilesBtn.addEventListener('click', resetState);
  }

  if (processBtn) {
    processBtn.addEventListener('click', extractForAI);
  }
});
