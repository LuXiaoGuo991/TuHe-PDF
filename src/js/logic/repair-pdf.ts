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
  initializeQpdf,
  readFileAsArrayBuffer,
} from '../utils/helpers.js';
import { state } from '../state.js';
import JSZip from 'jszip';
import { deduplicateFileName } from '../utils/deduplicate-filename.js';
import { batchDecryptIfNeeded } from '../utils/password-prompt.js';
import type { QpdfInstanceExtended } from '@/types';

export async function repairPdfFile(file: File): Promise<Uint8Array | null> {
  const inputPath = '/input.pdf';
  const outputPath = '/repaired_form.pdf';
  let qpdf: QpdfInstanceExtended;

  try {
    qpdf = await initializeQpdf();
    const fileBuffer = await readFileAsArrayBuffer(file);
    const uint8Array = new Uint8Array(fileBuffer as ArrayBuffer);

    qpdf.FS.writeFile(inputPath, uint8Array);

    const args = [inputPath, '--decrypt', outputPath];

    try {
      qpdf.callMain(args);
    } catch (e) {
      console.warn(`QPDF execution warning for ${file.name}:`, e);
    }

    let repairedData: Uint8Array | null = null;
    try {
      repairedData = qpdf.FS.readFile(outputPath, { encoding: 'binary' });
    } catch (e) {
      console.warn(`Failed to read output for ${file.name}:`, e);
    }

    try {
      try {
        qpdf.FS.unlink(inputPath);
      } catch (e) {
        console.warn(e);
      }
      try {
        qpdf.FS.unlink(outputPath);
      } catch (e) {
        console.warn(e);
      }
    } catch (cleanupError) {
      console.warn('Cleanup error:', cleanupError);
    }

    return repairedData;
  } catch (error) {
    console.error(`Error repairing ${file.name}:`, error);
    return null;
  }
}

export async function repairPdf() {
  if (state.files.length === 0) {
    showAlert(
      translate('alert.noFiles', 'No Files'),
      translate(
        'tools:repairPdf.dynamic.a8baf6f1f3',
        'Please select one or more PDF files.'
      )
    );
    return;
  }

  const successfulRepairs: { name: string; data: Uint8Array }[] = [];
  const failedRepairs: string[] = [];

  try {
    const decryptedFiles = await batchDecryptIfNeeded(state.files);
    showLoader(
      translate(
        'tools:repairPdf.dynamic.2fd1eb15f7',
        'Initializing repair engine...'
      )
    );
    state.files = decryptedFiles;

    for (let i = 0; i < state.files.length; i++) {
      const file = state.files[i];
      showLoader(
        translate(
          'tools:repairPdf.dynamic.f63b91416a',
          `Repairing ${file.name} (${i + 1}/${state.files.length})...`,
          { value0: file.name, value1: i + 1, value2: state.files.length }
        )
      );

      const repairedData = await repairPdfFile(file);

      if (repairedData && repairedData.length > 0) {
        successfulRepairs.push({
          name: `repaired-${file.name}`,
          data: repairedData,
        });
      } else {
        failedRepairs.push(file.name);
      }
    }

    hideLoader();

    if (successfulRepairs.length === 0) {
      showAlert(
        translate('tools:repairPdf.dynamic.bf0e2061e3', 'Repair Failed'),
        translate(
          'tools:repairPdf.dynamic.b2d8ad7247',
          'Unable to repair any of the uploaded PDF files.'
        )
      );
      return;
    }

    if (failedRepairs.length > 0) {
      const failedList = failedRepairs.join(', ');
      showAlert(
        translate('tools:repairPdf.dynamic.5d6875a66c', 'Partial Success'),
        translate(
          'tools:repairPdf.dynamic.1830bb6dfe',
          `Repaired ${successfulRepairs.length} file(s). Failed to repair: ${failedList}`,
          { value0: successfulRepairs.length, value1: failedList }
        )
      );
    }

    if (successfulRepairs.length === 1) {
      const file = successfulRepairs[0];
      const blob = new Blob([new Uint8Array(file.data)], {
        type: 'application/pdf',
      });
      downloadFile(blob, file.name);
    } else {
      showLoader(
        translate(
          'tools:repairPdf.dynamic.911ea8455c',
          'Creating ZIP archive...'
        )
      );
      const zip = new JSZip();
      const usedNames = new Set<string>();
      successfulRepairs.forEach((file) => {
        const zipEntryName = deduplicateFileName(file.name, usedNames);
        zip.file(zipEntryName, file.data);
      });

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadFile(zipBlob, 'repaired_pdfs.zip');
      hideLoader();
    }

    if (failedRepairs.length === 0) {
      showAlert(
        translate('alert.success', 'Success'),
        translate(
          'tools:repairPdf.dynamic.f76dce6e24',
          'All files repaired successfully!'
        )
      );
    }
  } catch (error: unknown) {
    console.error('Critical error during repair:', error);
    hideLoader();
    showAlert(
      translate('alert.error', 'Error'),
      translate(
        'tools:repairPdf.dynamic.eeab60e5f2',
        'An unexpected error occurred during the repair process.'
      )
    );
  }
}
