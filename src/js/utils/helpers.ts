import { t } from '../i18n/i18n';
import i18next from 'i18next';

const translate = (
  key: string,
  fallback: string,
  options?: Record<string, unknown>
) => {
  const value = t(key, options);
  return value && value !== key ? value : fallback;
};

import createModule from '@neslinesli93/qpdf-wasm';
import type { QpdfInstanceExtended } from '@/types';
import { showLoader, hideLoader, showAlert } from '../ui.js';
import { createIcons } from 'lucide';
import { state, resetState } from '../state.js';
import * as pdfjsLib from 'pdfjs-dist';
import DOMPurify from 'dompurify';
import type { DocumentInitParameters } from 'pdfjs-dist/types/src/display/api';

const STANDARD_SIZES = {
  A4: { width: 595.28, height: 841.89 },
  Letter: { width: 612, height: 792 },
  Legal: { width: 612, height: 1008 },
  Tabloid: { width: 792, height: 1224 },
  A3: { width: 841.89, height: 1190.55 },
  A5: { width: 419.53, height: 595.28 },
};

export function getStandardPageName(width: number, height: number) {
  const tolerance = 1; // Allow for minor floating point variations
  for (const [name, size] of Object.entries(STANDARD_SIZES)) {
    if (
      (Math.abs(width - size.width) < tolerance &&
        Math.abs(height - size.height) < tolerance) ||
      (Math.abs(width - size.height) < tolerance &&
        Math.abs(height - size.width) < tolerance)
    ) {
      return name;
    }
  }
  return translate('helpers.custom', '自定义');
}

export function convertPoints(points: number, unit: string) {
  let result: number;
  switch (unit) {
    case 'in':
      result = points / 72;
      break;
    case 'mm':
      result = (points / 72) * 25.4;
      break;
    case 'px':
      result = points * (96 / 72); // Assuming 96 DPI
      break;
    default: // 'pt'
      result = points;
      break;
  }
  return result.toFixed(2);
}

// Convert hex color to RGB
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : { r: 0, g: 0, b: 0 };
}

export const formatBytes = (bytes: number, decimals = 1) => {
  if (bytes === 0) return '0 ' + translate('helpers.bytes', 'Bytes');
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = [translate('helpers.bytes', 'Bytes'), 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const downloadFile = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const readFileAsArrayBuffer = (
  file: Blob
): Promise<ArrayBuffer | null> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer | null);
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

export function parsePageRanges(
  rangeString: string,
  totalPages: number
): number[] {
  if (!rangeString || rangeString.trim() === '') {
    return Array.from({ length: totalPages }, (_, i) => i);
  }

  const indices = new Set<number>();
  const parts = rangeString.split(',');

  for (const part of parts) {
    const trimmedPart = part.trim();
    if (!trimmedPart) continue;

    if (trimmedPart.includes('-')) {
      const [start, end] = trimmedPart.split('-').map(Number);
      if (
        isNaN(start) ||
        isNaN(end) ||
        start < 1 ||
        end > totalPages ||
        start > end
      ) {
        console.warn(`Invalid range skipped: ${trimmedPart}`);
        continue;
      }

      for (let i = start; i <= end; i++) {
        indices.add(i - 1);
      }
    } else {
      const pageNum = Number(trimmedPart);

      if (isNaN(pageNum) || pageNum < 1 || pageNum > totalPages) {
        console.warn(`Invalid page number skipped: ${trimmedPart}`);
        continue;
      }
      indices.add(pageNum - 1);
    }
  }

  return Array.from(indices).sort((a, b) => a - b);
}

/**
 * Formats an ISO 8601 date string (e.g., "2008-02-21T17:15:56-08:00")
 * into a localized, human-readable string.
 * @param {string} isoDateString - The ISO 8601 date string.
 * @returns {string} A localized date and time string, or the original string if parsing fails.
 */
export function formatIsoDate(isoDateString: string) {
  if (!isoDateString || typeof isoDateString !== 'string') {
    return isoDateString; // Return original value if it's not a valid string
  }
  try {
    const date = new Date(isoDateString);
    // Check if the date object is valid
    if (isNaN(date.getTime())) {
      return isoDateString; // Return original string if the date is invalid
    }
    return date.toLocaleString();
  } catch (e) {
    console.error('Could not parse ISO date:', e);
    return isoDateString; // Return original string on any error
  }
}

let qpdfInstance: QpdfInstanceExtended | null = null;

/**
 * Initialize qpdf-wasm singleton.
 * Subsequent calls return the same instance.
 */
export async function initializeQpdf(): Promise<QpdfInstanceExtended> {
  if (qpdfInstance) return qpdfInstance;

  showLoader(
    translate('common.dynamic.fc9c0065db', 'Initializing PDF engine...')
  );
  try {
    qpdfInstance = (await createModule({
      locateFile: () => import.meta.env.BASE_URL + 'qpdf.wasm',
    })) as unknown as QpdfInstanceExtended;
  } catch (error) {
    console.error('Failed to initialize qpdf-wasm:', error);
    showAlert(
      translate('common.dynamic.c73b34e569', 'Initialization Error'),
      translate(
        'common.dynamic.105f867cd3',
        'Could not load the PDF engine. Please refresh the page and try again.'
      )
    );
    throw error;
  } finally {
    hideLoader();
  }

  return qpdfInstance;
}

export function initializeIcons(): void {
  createIcons({
    attrs: {
      class: 'bento-icon',
      'stroke-width': '1.5',
    },
  });
}

export function formatStars(num: number) {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + translate('helpers.k', 'K');
  }
  return num.toLocaleString();
}

/**
 * Truncates a filename to a maximum length, adding ellipsis if needed.
 * Preserves the file extension.
 * @param filename - The filename to truncate
 * @param maxLength - Maximum length (default: 30)
 * @returns Truncated filename with ellipsis if needed
 */
export function truncateFilename(
  filename: string,
  maxLength: number = 25
): string {
  if (filename.length <= maxLength) {
    return filename;
  }

  const lastDotIndex = filename.lastIndexOf('.');
  const extension = lastDotIndex !== -1 ? filename.substring(lastDotIndex) : '';
  const nameWithoutExt =
    lastDotIndex !== -1 ? filename.substring(0, lastDotIndex) : filename;

  const availableLength = maxLength - extension.length - 3; // 3 for '...'

  if (availableLength <= 0) {
    return filename.substring(0, maxLength - 3) + '...';
  }

  return nameWithoutExt.substring(0, availableLength) + '...' + extension;
}

export function formatShortcutDisplay(
  shortcut: string,
  isMac: boolean
): string {
  if (!shortcut) return '';
  return shortcut
    .replace('mod', isMac ? '⌘' : 'Ctrl')
    .replace('ctrl', isMac ? '^' : 'Ctrl') // Control key on Mac shows as ^
    .replace('alt', isMac ? '⌥' : 'Alt')
    .replace('shift', 'Shift')
    .split('+')
    .map((k) => k.charAt(0).toUpperCase() + k.slice(1))
    .join(isMac ? '' : '+');
}

export function resetAndReloadTool(preResetCallback?: () => void) {
  const toolid = state.activeTool;

  if (preResetCallback) {
    preResetCallback();
  }

  resetState();

  if (toolid) {
    const element = document.querySelector(
      `[data-tool-id="${toolid}"]`
    ) as HTMLElement;
    if (element) element.click();
  }
}

/**
 * Wrapper for pdfjsLib.getDocument that adds the required wasmUrl configuration.
 * Use this instead of calling pdfjsLib.getDocument directly.
 * @param src The source to load (url string, typed array, or parameters object)
 * @returns The PDF loading task
 */
export function getPDFDocument(
  src: string | Uint8Array | ArrayBuffer | DocumentInitParameters
) {
  let params: DocumentInitParameters;

  if (typeof src === 'string') {
    params = { url: src };
  } else if (src instanceof Uint8Array || src instanceof ArrayBuffer) {
    params = { data: src };
  } else {
    params = src;
  }

  return pdfjsLib.getDocument({
    ...params,
    wasmUrl: import.meta.env.BASE_URL + 'pdfjs-viewer/wasm/',
  });
}

/**
 * Escape HTML special characters to prevent XSS
 * @param text - The text to escape
 * @returns The escaped text
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  const CHUNK_SIZE = 0x8000;
  const chunks: string[] = [];
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, bytes.length));
    chunks.push(String.fromCharCode(...chunk));
  }
  return btoa(chunks.join(''));
}

export function sanitizeEmailHtml(html: string): string {
  if (!html) return html;

  let sanitized = DOMPurify.sanitize(html, {
    FORBID_TAGS: ['style', 'link', 'script', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['style'],
    ALLOW_DATA_ATTR: false,
  });

  sanitized = sanitized.replace(
    /href=["']https?:\/\/[^"']*safelinks\.protection\.outlook\.com[^"']*url=([^&"']+)[^"']*["']/gi,
    (match, encodedUrl) => {
      try {
        const decodedUrl = decodeURIComponent(encodedUrl);
        let parsed: URL;
        try {
          parsed = new URL(decodedUrl);
        } catch {
          return match;
        }
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          return match;
        }
        return `href="${escapeHtml(decodedUrl)}"`;
      } catch {
        return match;
      }
    }
  );
  sanitized = sanitized.replace(
    /href=["']([^"']{500,})["']/gi,
    (_match, url: string) => {
      const baseUrl = url.split('?')[0];
      if (baseUrl && baseUrl.length < 200) {
        return `href="${baseUrl}"`;
      }
      return `href="${url.substring(0, 200)}"`;
    }
  );
  sanitized = sanitized.replace(
    /<img[^>]*(?:width=["']1["'][^>]*height=["']1["']|height=["']1["'][^>]*width=["']1["'])[^>]*\/?>/gi,
    ''
  );
  sanitized = sanitized.replace(/<\/?table[^>]*>/gi, '<div>');
  sanitized = sanitized.replace(/<\/?(tbody|thead|tfoot)[^>]*>/gi, '');
  sanitized = sanitized.replace(/<tr[^>]*>/gi, '<div>');
  sanitized = sanitized.replace(/<\/tr>/gi, '</div>');
  sanitized = sanitized.replace(/<td[^>]*>/gi, '<span> ');
  sanitized = sanitized.replace(/<\/td>/gi, ' </span>');
  sanitized = sanitized.replace(/<th[^>]*>/gi, '<strong> ');
  sanitized = sanitized.replace(/<\/th>/gi, ' </strong>');
  sanitized = sanitized.replace(/<div>\s*<\/div>/gi, '');
  sanitized = sanitized.replace(/<span>\s*<\/span>/gi, '');
  sanitized = sanitized.replace(/(<div>)+/gi, '<div>');
  sanitized = sanitized.replace(/(<\/div>)+/gi, '</div>');

  const MAX_HTML_SIZE = 100000;
  if (sanitized.length > MAX_HTML_SIZE) {
    const truncateAt = sanitized.lastIndexOf('</div>', MAX_HTML_SIZE);
    if (truncateAt > MAX_HTML_SIZE / 2) {
      sanitized = sanitized.substring(0, truncateAt) + '</div></body></html>';
    } else {
      sanitized = sanitized.substring(0, MAX_HTML_SIZE) + '...</body></html>';
    }
  }

  return sanitized;
}

/**
 * Formats a raw RFC 2822 date string into a nicer human-readable format,
 * while preserving the original timezone and time.
 * Example input: "Sun, 8 Jan 2017 20:37:44 +0200"
 * Example output: "Sunday, January 8, 2017 at 8:37 PM (+0200)"
 */
export function formatRawDate(raw: string): string {
  try {
    const date = new Date(raw);
    if (!isNaN(date.getTime())) {
      const locale = i18next.language || 'zh-CN';
      const tzMatch = raw.match(/([+-]\d{4})/);
      const tz = tzMatch ? tzMatch[1] : '';
      const formattedTz = tz
        ? `UTC${tz.substring(0, 1)}${tz.substring(1, 3)}:${tz.substring(3, 5)}`
        : '';
      const dateStr = date.toLocaleString(locale, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: false,
      });
      return formattedTz ? `${dateStr} (${formattedTz})` : dateStr;
    }
  } catch {
    console.error('Error parsing date string:', raw);
  }
  return raw;
}

/**
 * Returns a sanitized PDF filename.
 *
 * The provided filename is processed as follows:
 * - Removes a trailing `.pdf` file extension (case-insensitive)
 * - Trims leading and trailing whitespace
 * - Truncates the name to a maximum of 80 characters
 *
 * @param filename The original filename (including extension)
 * @returns The sanitized filename without the `.pdf` extension, limited to 80 characters
 */
export function getCleanPdfFilename(filename: string): string {
  let clean = filename.replace(/\.pdf$/i, '').trim();
  if (clean.length > 80) {
    clean = clean.slice(0, 80);
  }
  return clean;
}
