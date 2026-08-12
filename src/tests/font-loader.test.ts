import { describe, expect, it } from 'vitest';

import { getFontAssetFileName } from '../js/config/font-mappings';
import { resolveFontUrl } from '../js/utils/font-loader';

describe('font-loader', () => {
  it('uses same-origin defaults for Chinese OCR and its English fallback font', () => {
    expect(resolveFontUrl('Noto Sans SC', {})).toBe(
      '/wasm/ocr/fonts/NotoSansCJKsc-Regular.otf'
    );
    expect(resolveFontUrl('Noto Sans', {})).toBe(
      '/wasm/ocr/fonts/NotoSans-Regular.ttf'
    );
  });

  it('ignores a configured font URL and keeps fonts same-origin', () => {
    expect(
      resolveFontUrl('Noto Naskh Arabic', {
        VITE_OCR_FONT_BASE_URL: 'https://internal.example.com/wasm/ocr/fonts/',
      })
    ).toBe('/wasm/ocr/fonts/NotoSans-Regular.ttf');
  });

  it('derives the bundled font asset file name from the default font URL', () => {
    expect(getFontAssetFileName('Noto Sans SC')).toBe(
      'NotoSansCJKsc-Regular.otf'
    );
  });
});
