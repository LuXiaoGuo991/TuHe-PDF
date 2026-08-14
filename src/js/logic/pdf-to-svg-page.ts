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
import { createIcons, icons } from 'lucide';
import JSZip from 'jszip';
import { loadPyMuPDF, isPyMuPDFAvailable } from '../utils/pymupdf-loader.js';
import type { PyMuPDFInstance } from '@/types';
import { batchDecryptIfNeeded } from '../utils/password-prompt.js';
import { showWasmRequiredDialog } from '../utils/wasm-provider.js';

let pymupdf: PyMuPDFInstance | null = null;
let files: File[] = [];

const updateUI = () => {
  const fileDisplayArea = document.getElementById('file-display-area');
  const optionsPanel = document.getElementById('options-panel');
  const fileControls = document.getElementById('file-controls');

  if (!fileDisplayArea || !optionsPanel) return;

  fileDisplayArea.innerHTML = '';

  if (files.length > 0) {
    optionsPanel.classList.remove('hidden');
    if (fileControls) fileControls.classList.remove('hidden');

    files.forEach((file, index) => {
      const fileDiv = document.createElement('div');
      fileDiv.className =
        'flex items-center justify-between ui-bg-raised p-3 rounded-lg text-sm';

      const infoContainer = document.createElement('div');
      infoContainer.className = 'flex flex-col overflow-hidden';

      const nameSpan = document.createElement('div');
      nameSpan.className = 'truncate font-medium ui-text-primary text-sm mb-1';
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
        files = files.filter((_, i) => i !== index);
        updateUI();
      };

      fileDiv.append(infoContainer, removeBtn);
      fileDisplayArea.appendChild(fileDiv);
    });

    createIcons({ icons });
  } else {
    optionsPanel.classList.add('hidden');
    if (fileControls) fileControls.classList.add('hidden');
  }
};

const resetState = () => {
  files = [];
  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  if (fileInput) fileInput.value = '';
  updateUI();
};

async function convert() {
  if (files.length === 0) {
    showAlert(
      translate('alert.noFiles', 'No Files'),
      translate(
        'tools:pdfToSvg.dynamic.d03c2fba20',
        'Please upload at least one PDF file.'
      )
    );
    return;
  }

  // Check if PyMuPDF is configured
  if (!isPyMuPDFAvailable()) {
    showWasmRequiredDialog('pymupdf');
    return;
  }

  showLoader(
    translate('tools:pdfToSvg.dynamic.67967aa49b', 'Loading Engine...')
  );

  try {
    // Load PyMuPDF dynamically if not already loaded
    if (!pymupdf) {
      pymupdf = await loadPyMuPDF();
    }

    hideLoader();
    files = await batchDecryptIfNeeded(files);
    showLoader(
      translate('tools:pdfToSvg.dynamic.733ccaa9fb', 'Converting to SVG...')
    );

    const isSingleFile = files.length === 1;

    if (isSingleFile) {
      const doc = await pymupdf.open(files[0]);
      const pageCount = doc.pageCount;
      const baseName = files[0].name.replace(/\.[^/.]+$/, '');

      if (pageCount === 1) {
        showLoader(
          translate('tools:pdfToSvg.dynamic.733ccaa9fb', 'Converting to SVG...')
        );
        const page = doc.getPage(0);
        const svgContent = page.toSvg();
        const svgBlob = new Blob([svgContent], { type: 'image/svg+xml' });
        downloadFile(svgBlob, `${baseName}.svg`);
        showAlert(
          translate('alert.success', 'Success'),
          translate(
            'tools:pdfToSvg.dynamic.2f5799382c',
            'PDF converted to SVG successfully!'
          ),
          'success',
          () => resetState()
        );
      } else {
        const zip = new JSZip();
        for (let i = 0; i < pageCount; i++) {
          showLoader(
            translate(
              'tools:pdfToSvg.dynamic.d44228a493',
              `Converting page ${i + 1} of ${pageCount}...`,
              { value0: i + 1, value1: pageCount }
            )
          );
          const page = doc.getPage(i);
          const svgContent = page.toSvg();
          zip.file(`page_${i + 1}.svg`, svgContent);
        }
        showLoader(
          translate('tools:pdfToSvg.dynamic.03241b7aa3', 'Creating ZIP file...')
        );
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        downloadFile(zipBlob, `${baseName}_svg.zip`);
        showAlert(
          translate('alert.success', 'Success'),
          translate(
            'tools:pdfToSvg.dynamic.a2a5b261d2',
            `Converted ${pageCount} pages to SVG!`,
            { value0: pageCount }
          ),
          'success',
          () => resetState()
        );
      }
    } else {
      const zip = new JSZip();
      let totalPages = 0;

      for (let f = 0; f < files.length; f++) {
        const file = files[f];
        showLoader(
          translate(
            'tools:pdfToSvg.dynamic.58ae11ce3f',
            `Processing file ${f + 1} of ${files.length}...`,
            { value0: f + 1, value1: files.length }
          )
        );
        const doc = await pymupdf.open(file);
        const pageCount = doc.pageCount;
        const baseName = file.name.replace(/\.[^/.]+$/, '');

        for (let i = 0; i < pageCount; i++) {
          showLoader(
            translate(
              'tools:pdfToSvg.dynamic.8deeef3d8a',
              `File ${f + 1}/${files.length}: Page ${i + 1}/${pageCount}`,
              {
                value0: f + 1,
                value1: files.length,
                value2: i + 1,
                value3: pageCount,
              }
            )
          );
          const page = doc.getPage(i);
          const svgContent = page.toSvg();
          const fileName =
            pageCount === 1
              ? `${baseName}.svg`
              : `${baseName}_page_${i + 1}.svg`;
          zip.file(fileName, svgContent);
          totalPages++;
        }
      }

      showLoader(
        translate('tools:pdfToSvg.dynamic.03241b7aa3', 'Creating ZIP file...')
      );
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadFile(zipBlob, 'pdf_to_svg.zip');
      showAlert(
        translate('alert.success', 'Success'),
        translate(
          'tools:pdfToSvg.dynamic.98e4c4daf3',
          `Converted ${files.length} files (${totalPages} pages) to SVG!`,
          { value0: files.length, value1: totalPages }
        ),
        'success',
        () => resetState()
      );
    }
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : 'Unknown error';
    showAlert(
      translate('alert.error', 'Error'),
      translate(
        'tools:pdfToSvg.dynamic.6e3c2cd056',
        `Failed to convert PDF to SVG. ${message}`,
        { value0: message }
      )
    );
  } finally {
    hideLoader();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  const dropZone = document.getElementById('drop-zone');
  const processBtn = document.getElementById('process-btn');
  const addMoreBtn = document.getElementById('add-more-btn');
  const clearFilesBtn = document.getElementById('clear-files-btn');

  const handleFileSelect = (newFiles: FileList | null, replace = false) => {
    if (!newFiles || newFiles.length === 0) return;
    const validFiles = Array.from(newFiles).filter(
      (file) => file.type === 'application/pdf'
    );

    if (validFiles.length === 0) {
      showAlert(
        translate('tools:pdfToSvg.dynamic.1d741530ab', 'Invalid Files'),
        translate(
          'tools:pdfToSvg.dynamic.de155d6aee',
          'Please upload PDF files.'
        )
      );
      return;
    }

    if (replace) {
      files = validFiles;
    } else {
      files = [...files, ...validFiles];
    }
    updateUI();
  };

  if (fileInput && dropZone) {
    fileInput.addEventListener('change', (e) => {
      handleFileSelect(
        (e.target as HTMLInputElement).files,
        files.length === 0
      );
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
      handleFileSelect(e.dataTransfer?.files ?? null, files.length === 0);
    });

    fileInput.addEventListener('click', () => {
      fileInput.value = '';
    });
  }

  if (addMoreBtn)
    addMoreBtn.addEventListener('click', () => fileInput?.click());
  if (clearFilesBtn) clearFilesBtn.addEventListener('click', resetState);
  if (processBtn) processBtn.addEventListener('click', convert);
});
