import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createWorker } = vi.hoisted(() => ({
  createWorker: vi.fn(),
}));

vi.mock('tesseract.js', () => ({
  default: {
    createWorker,
  },
}));

import {
  buildTesseractWorkerOptions,
  createConfiguredTesseractWorker,
  getIncompleteTesseractOverrideKeys,
  hasCompleteTesseractOverrides,
  hasConfiguredTesseractOverrides,
  resolveTesseractAssetConfig,
} from '../js/utils/tesseract-runtime';
import {
  assertTesseractLanguagesAvailable,
  getAvailableTesseractLanguageEntries,
  getUnavailableTesseractLanguages,
  UnsupportedOcrLanguageError,
} from '../js/utils/tesseract-language-availability';

describe('tesseract-runtime', () => {
  beforeEach(() => {
    createWorker.mockReset();
  });

  it('ignores configured OCR asset URLs and uses same-origin assets', () => {
    const config = resolveTesseractAssetConfig({
      VITE_TESSERACT_WORKER_URL:
        'https://internal.example.com/ocr/worker.min.js/',
      VITE_TESSERACT_CORE_URL: 'https://internal.example.com/ocr/core/',
      VITE_TESSERACT_LANG_URL: 'https://internal.example.com/ocr/lang-data/',
    });

    expect(config).toEqual({
      workerPath: '/wasm/tesseract/worker.min.js',
      corePath: '/wasm/tesseract/core',
      langPath: '/wasm/tesseract/lang',
    });
    expect(hasConfiguredTesseractOverrides(config)).toBe(true);
    expect(hasCompleteTesseractOverrides(config)).toBe(true);
  });

  it('always configures same-origin OCR assets', () => {
    const logger = vi.fn();

    expect(buildTesseractWorkerOptions(logger, {})).toEqual({
      logger,
      workerPath: '/wasm/tesseract/worker.min.js',
      corePath: '/wasm/tesseract/core',
      langPath: '/wasm/tesseract/lang',
      gzip: true,
    });
    expect(
      hasConfiguredTesseractOverrides(resolveTesseractAssetConfig({}))
    ).toBe(true);
  });

  it('does not accept partial OCR asset configuration', () => {
    const env = {
      VITE_TESSERACT_WORKER_URL:
        'https://internal.example.com/ocr/worker.min.js',
      VITE_TESSERACT_CORE_URL: 'https://internal.example.com/ocr/core',
    };

    expect(
      getIncompleteTesseractOverrideKeys(resolveTesseractAssetConfig(env))
    ).toEqual([]);
    expect(buildTesseractWorkerOptions(undefined, env)).toMatchObject({
      workerPath: '/wasm/tesseract/worker.min.js',
      corePath: '/wasm/tesseract/core',
      langPath: '/wasm/tesseract/lang',
    });
  });

  it('passes same-origin OCR asset URLs to Tesseract.createWorker', async () => {
    const logger = vi.fn();
    createWorker.mockResolvedValue({ id: 'worker' });

    await createConfiguredTesseractWorker('eng', 1, logger, {
      VITE_TESSERACT_WORKER_URL:
        'https://internal.example.com/ocr/worker.min.js',
      VITE_TESSERACT_CORE_URL: 'https://internal.example.com/ocr/core',
      VITE_TESSERACT_LANG_URL: 'https://internal.example.com/ocr/lang-data',
    });

    expect(createWorker).toHaveBeenCalledWith('eng', 1, {
      logger,
      workerPath: '/wasm/tesseract/worker.min.js',
      corePath: '/wasm/tesseract/core',
      langPath: '/wasm/tesseract/lang',
      gzip: true,
    });
  });

  it('filters OCR language entries when the build restricts bundled languages', () => {
    expect(
      getAvailableTesseractLanguageEntries({
        VITE_TESSERACT_AVAILABLE_LANGUAGES: 'eng,deu',
      }).map(([code]) => code)
    ).toEqual(['eng', 'deu']);
  });

  it('reports unavailable OCR languages for restricted air-gap builds', () => {
    expect(
      getUnavailableTesseractLanguages('eng+fra', {
        VITE_TESSERACT_AVAILABLE_LANGUAGES: 'eng,deu',
      })
    ).toEqual(['fra']);

    expect(() =>
      assertTesseractLanguagesAvailable('eng+fra', {
        VITE_TESSERACT_AVAILABLE_LANGUAGES: 'eng,deu',
      })
    ).toThrow(UnsupportedOcrLanguageError);
  });

  it('blocks worker creation when OCR requests an unbundled language', async () => {
    await expect(
      createConfiguredTesseractWorker('fra', 1, undefined, {
        VITE_TESSERACT_AVAILABLE_LANGUAGES: 'eng,deu',
      })
    ).rejects.toThrow('This TuHe PDF build only bundles OCR data for');

    expect(createWorker).not.toHaveBeenCalled();
  });
});
