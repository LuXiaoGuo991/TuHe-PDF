import { WasmProvider } from './wasm-provider';
import type { WindowWithCoherentPdf, CpdfInstance } from '@/types';

let cpdfLoaded = false;
let cpdfLoadPromise: Promise<void> | null = null;

function getCpdfUrl(): string | undefined {
  const userUrl = WasmProvider.getUrl('cpdf');
  if (userUrl) {
    const baseUrl = userUrl.endsWith('/') ? userUrl : `${userUrl}/`;
    return `${baseUrl}coherentpdf.browser.min.js`;
  }
  return undefined;
}

export function isCpdfAvailable(): boolean {
  return WasmProvider.isConfigured('cpdf');
}

export async function isCpdfLoaded(): Promise<void> {
  if (cpdfLoaded) return;

  if (cpdfLoadPromise) {
    return cpdfLoadPromise;
  }

  const cpdfUrl = getCpdfUrl();
  if (!cpdfUrl) {
    throw new Error('CoherentPDF 未配置。请在 WASM 设置中进行配置。');
  }

  cpdfLoadPromise = new Promise((resolve, reject) => {
    if (typeof (window as WindowWithCoherentPdf).coherentpdf !== 'undefined') {
      cpdfLoaded = true;
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = cpdfUrl;
    script.onload = () => {
      cpdfLoaded = true;
      console.log('[CPDF] Loaded from:', script.src);
      resolve();
    };
    script.onerror = () => {
      reject(new Error('无法加载 CoherentPDF 库：' + cpdfUrl));
    };
    document.head.appendChild(script);
  });

  return cpdfLoadPromise;
}

export async function getCpdf(): Promise<CpdfInstance> {
  await isCpdfLoaded();
  return (window as WindowWithCoherentPdf).coherentpdf as CpdfInstance;
}
