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
import { downloadFile } from '../utils/helpers.js';
import { state } from '../state.js';

import type { RedactionRect } from '@/types';

// @ts-expect-error TS(2339) FIXME: Property 'PDFLib' does not exist on type 'Window &... Remove this comment to see the full error message
const { rgb } = window.PDFLib;

export async function redact(redactions: RedactionRect[], canvasScale: number) {
  showLoader(translate('common.dynamic.11102f021f', 'Applying redactions...'));
  try {
    const pdfPages = state.pdfDoc.getPages();
    const conversionScale = 1 / canvasScale;

    redactions.forEach((r: RedactionRect) => {
      const page = pdfPages[r.pageIndex];
      const { height: pageHeight } = page.getSize();

      // Convert canvas coordinates back to PDF coordinates
      const pdfX = r.canvasX * conversionScale;
      const pdfWidth = r.canvasWidth * conversionScale;
      const pdfHeight = r.canvasHeight * conversionScale;
      const pdfY = pageHeight - r.canvasY * conversionScale - pdfHeight;

      page.drawRectangle({
        x: pdfX,
        y: pdfY,
        width: pdfWidth,
        height: pdfHeight,
        color: rgb(0, 0, 0),
      });
    });

    const redactedBytes = await state.pdfDoc.save();
    downloadFile(
      new Blob([new Uint8Array(redactedBytes)], { type: 'application/pdf' }),
      state.files[0]?.name || 'document.pdf'
    );
  } catch (e) {
    console.error(e);
    showAlert(
      translate('alert.error', 'Error'),
      translate('common.dynamic.50db715701', 'Failed to apply redactions.')
    );
  } finally {
    hideLoader();
  }
}
