import { t } from '../i18n/i18n';

export type WasmPackage = 'pymupdf' | 'ghostscript' | 'cpdf';

const LOCAL_DEFAULTS: Record<WasmPackage, string> = {
  pymupdf: '/wasm/pymupdf/',
  ghostscript: '/wasm/ghostscript/',
  cpdf: '/wasm/cpdf/',
};

class WasmProviderManager {
  getUrl(packageName: WasmPackage): string {
    return LOCAL_DEFAULTS[packageName];
  }

  isConfigured(_packageName: WasmPackage): boolean {
    return true;
  }

  getAllProviders(): Record<WasmPackage, string> {
    return { ...LOCAL_DEFAULTS };
  }

  getPackageDisplayName(packageName: WasmPackage): string {
    const names: Record<WasmPackage, string> = {
      pymupdf: 'PyMuPDF',
      ghostscript: 'Ghostscript',
      cpdf: 'CoherentPDF',
    };
    return names[packageName];
  }

  getPackageFeatures(packageName: WasmPackage): string[] {
    const features: Record<WasmPackage, string[]> = {
      pymupdf: ['PDF text and image conversion', 'PDF document processing'],
      ghostscript: ['PDF/A conversion', 'Font outlining'],
      cpdf: ['Bookmarks and metadata', 'PDF structure processing'],
    };
    return features[packageName];
  }
}

export const WasmProvider = new WasmProviderManager();

export function showWasmRequiredDialog(packageName: WasmPackage): void {
  const name = WasmProvider.getPackageDisplayName(packageName);
  const message = t('wasmProvider.localAssetMissing', { name });
  window.alert(
    message && message !== 'wasmProvider.localAssetMissing'
      ? message
      : `${name} 本地处理模块未部署。请联系网站开发者。`
  );
}

export function requireWasm(
  packageName: WasmPackage,
  onAvailable?: () => void
): boolean {
  if (WasmProvider.isConfigured(packageName)) {
    onAvailable?.();
    return true;
  }

  showWasmRequiredDialog(packageName);
  return false;
}
