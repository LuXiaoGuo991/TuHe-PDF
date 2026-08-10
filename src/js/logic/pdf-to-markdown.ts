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
import {
  downloadFile,
  readFileAsArrayBuffer,
  getPDFDocument,
} from '../utils/helpers.js';
import { state } from '../state.js';

export async function pdfToMarkdown() {
  showLoader(
    translate(
      'tools:pdfToMarkdown.dynamic.e98ede1f9b',
      'Converting to Markdown...'
    )
  );
  try {
    const file = state.files[0];
    const arrayBuffer = await readFileAsArrayBuffer(file);
    const pdf = await getPDFDocument({ data: arrayBuffer }).promise;
    let markdown = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      // This is a simple text extraction. For more advanced formatting, more complex logic is needed.
      const text = content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ');
      markdown += text + '\n\n'; // Add double newline for paragraph breaks between pages
    }

    const blob = new Blob([markdown], { type: 'text/markdown' });
    downloadFile(blob, file.name.replace(/\.pdf$/i, '.md'));
  } catch (e) {
    console.error(e);
    showAlert(
      translate('tools:pdfToMarkdown.dynamic.223165f5fd', 'Conversion Error'),
      translate(
        'tools:pdfToMarkdown.dynamic.9a68de9cfd',
        'Failed to convert PDF. It may be image-based or corrupted.'
      )
    );
  } finally {
    hideLoader();
  }
}
