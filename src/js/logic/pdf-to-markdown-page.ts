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
import { batchDecryptIfNeeded } from '../utils/password-prompt.js';
import { deduplicateFileName } from '../utils/deduplicate-filename.js';

document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  const dropZone = document.getElementById('drop-zone');
  const processBtn = document.getElementById('process-btn');
  const fileDisplayArea = document.getElementById('file-display-area');
  const convertOptions = document.getElementById('convert-options');
  const fileControls = document.getElementById('file-controls');
  const addMoreBtn = document.getElementById('add-more-btn');
  const clearFilesBtn = document.getElementById('clear-files-btn');
  const backBtn = document.getElementById('back-to-tools');
  const includeImagesCheckbox = document.getElementById(
    'include-images'
  ) as HTMLInputElement;

  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.location.href = import.meta.env.BASE_URL;
    });
  }

  const updateUI = async () => {
    if (!fileDisplayArea || !convertOptions || !processBtn || !fileControls)
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
          'tools:pdfToMarkdown.dynamic.c22fc17c8e',
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
          state.files = state.files.filter((_: File, i: number) => i !== index);
          updateUI();
        };

        fileDiv.append(infoContainer, removeBtn);
        fileDisplayArea.appendChild(fileDiv);

        try {
          const arrayBuffer = await readFileAsArrayBuffer(file);
          const pdfDoc = await getPDFDocument({ data: arrayBuffer }).promise;
          metaSpan.textContent = translate(
            'tools:pdfToMarkdown.dynamic.a91a90531d',
            `${formatBytes(file.size)} • ${pdfDoc.numPages} pages`,
            { value0: formatBytes(file.size), value1: pdfDoc.numPages }
          );
        } catch {
          metaSpan.textContent = translate(
            'tools:pdfToMarkdown.dynamic.36dc12cdf2',
            `${formatBytes(file.size)} • Could not load page count`,
            { value0: formatBytes(file.size) }
          );
        }
      }

      createIcons({ icons });
      fileControls.classList.remove('hidden');
      convertOptions.classList.remove('hidden');
      (processBtn as HTMLButtonElement).disabled = false;
    } else {
      fileDisplayArea.innerHTML = '';
      fileControls.classList.add('hidden');
      convertOptions.classList.add('hidden');
      (processBtn as HTMLButtonElement).disabled = true;
    }
  };

  const resetState = () => {
    state.files = [];
    state.pdfDoc = null;
    updateUI();
  };

  const convert = async () => {
    try {
      if (state.files.length === 0) {
        showAlert(
          translate('alert.noFiles', 'No Files'),
          translate(
            'tools:pdfToMarkdown.dynamic.514702f7a2',
            'Please select at least one PDF file.'
          )
        );
        return;
      }

      showLoader(
        translate(
          'tools:pdfToMarkdown.dynamic.0beadcf720',
          'Loading PDF converter...'
        )
      );
      const pymupdf = await loadPyMuPDF();

      const includeImages = includeImagesCheckbox?.checked ?? false;

      hideLoader();
      state.files = await batchDecryptIfNeeded(state.files);
      showLoader(
        translate('tools:pdfToMarkdown.dynamic.9ab0c4bc34', 'Converting...')
      );

      if (state.files.length === 1) {
        const file = state.files[0];
        showLoader(
          translate(
            'tools:pdfToMarkdown.dynamic.a1124f961b',
            `Converting ${file.name}...`,
            { value0: file.name }
          )
        );

        const markdown = await pymupdf.pdfToMarkdown(file, { includeImages });
        const outName = file.name.replace(/\.pdf$/i, '') + '.md';
        const blob = new Blob([markdown], { type: 'text/markdown' });

        downloadFile(blob, outName);
        hideLoader();

        showAlert(
          translate(
            'tools:pdfToMarkdown.dynamic.794de0ca49',
            'Conversion Complete'
          ),
          translate(
            'tools:pdfToMarkdown.dynamic.c70ab352e3',
            `Successfully converted ${file.name} to Markdown.`,
            { value0: file.name }
          ),
          'success',
          () => resetState()
        );
      } else {
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        const usedNames = new Set<string>();

        for (let i = 0; i < state.files.length; i++) {
          const file = state.files[i];
          showLoader(
            translate(
              'tools:pdfToMarkdown.dynamic.1556bdf597',
              `Converting ${i + 1}/${state.files.length}: ${file.name}...`,
              { value0: i + 1, value1: state.files.length, value2: file.name }
            )
          );

          const markdown = await pymupdf.pdfToMarkdown(file, { includeImages });
          const baseName = file.name.replace(/\.pdf$/i, '');
          const zipEntryName = deduplicateFileName(`${baseName}.md`, usedNames);
          zip.file(zipEntryName, markdown);
        }

        showLoader(
          translate(
            'tools:pdfToMarkdown.dynamic.5178f580d6',
            'Creating ZIP archive...'
          )
        );
        const zipBlob = await zip.generateAsync({ type: 'blob' });

        downloadFile(zipBlob, 'markdown-files.zip');
        hideLoader();

        showAlert(
          translate(
            'tools:pdfToMarkdown.dynamic.794de0ca49',
            'Conversion Complete'
          ),
          translate(
            'tools:pdfToMarkdown.dynamic.b6ada8ef5f',
            `Successfully converted ${state.files.length} PDF(s) to Markdown.`,
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
      const pdfFiles = Array.from(files).filter(
        (f) =>
          f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
      );
      state.files = [...state.files, ...pdfFiles];
      updateUI();
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
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        handleFileSelect(files);
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
    processBtn.addEventListener('click', convert);
  }
});
