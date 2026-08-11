import { WasmProvider } from './wasm-provider.js';
import type {
  PyMuPDFInstance,
  PyMuPDFCompressOptions,
  PyMuPDFExtractTextOptions,
  PyMuPDFRasterizeOptions,
} from '@/types';

let cachedPyMuPDF: PyMuPDFInstance | null = null;
let loadPromise: Promise<PyMuPDFInstance> | null = null;

export interface PyMuPDFInterface {
  load(): Promise<void>;
  compressPdf(
    file: Blob,
    options: PyMuPDFCompressOptions
  ): Promise<{ blob: Blob; compressedSize: number }>;
  convertToPdf(file: Blob, ext: string): Promise<Blob>;
  extractText(file: Blob, options?: PyMuPDFExtractTextOptions): Promise<string>;
  extractImages(file: Blob): Promise<Array<{ data: Uint8Array; ext: string }>>;
  extractTables(file: Blob): Promise<unknown[]>;
  toSvg(file: Blob, pageNum: number): Promise<string>;
  renderPageToImage(file: Blob, pageNum: number, scale: number): Promise<Blob>;
  getPageCount(file: Blob): Promise<number>;
  rasterizePdf(
    file: Blob | File,
    options: PyMuPDFRasterizeOptions
  ): Promise<Blob>;
}

export async function loadPyMuPDF(): Promise<PyMuPDFInstance> {
  if (cachedPyMuPDF) {
    return cachedPyMuPDF;
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    if (!WasmProvider.isConfigured('pymupdf')) {
      throw new Error('PyMuPDF 未配置。请在高级设置中进行配置。');
    }
    if (!WasmProvider.isConfigured('ghostscript')) {
      throw new Error(
        'Ghostscript 未配置。PyMuPDF 部分操作需要 Ghostscript。请在高级设置中同时配置两者。'
      );
    }

    const pymupdfUrl = WasmProvider.getUrl('pymupdf')!;
    const gsUrl = WasmProvider.getUrl('ghostscript')!;
    const normalizedPymupdf = pymupdfUrl.endsWith('/')
      ? pymupdfUrl
      : `${pymupdfUrl}/`;

    try {
      const wrapperUrl = `${normalizedPymupdf}dist/index.js`;
      const module = await import(/* @vite-ignore */ wrapperUrl);

      if (typeof module.PyMuPDF !== 'function') {
        throw new Error('PyMuPDF 模块未导出所需的 PyMuPDF 类。');
      }

      cachedPyMuPDF = new module.PyMuPDF({
        assetPath: `${normalizedPymupdf}assets/`,
        ghostscriptUrl: gsUrl,
      });

      await cachedPyMuPDF.load();

      console.log('[PyMuPDF Loader] Successfully loaded processing module');
      return cachedPyMuPDF;
    } catch (error: unknown) {
      loadPromise = null;
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`加载 PyMuPDF 处理模块失败：${msg}`, {
        cause: error,
      });
    }
  })();

  return loadPromise;
}

export function isPyMuPDFAvailable(): boolean {
  return (
    WasmProvider.isConfigured('pymupdf') &&
    WasmProvider.isConfigured('ghostscript')
  );
}

export function clearPyMuPDFCache(): void {
  cachedPyMuPDF = null;
  loadPromise = null;
}
