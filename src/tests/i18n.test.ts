import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import i18next from 'i18next';
import {
  applyTranslations,
  getLanguageFromUrl,
  rewriteLinks,
} from '@/js/i18n/i18n';

describe('getLanguageFromUrl', () => {
  const originalLocation = window.location;
  const originalNavigator = window.navigator;

  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, pathname: '/' },
      writable: true,
      configurable: true,
    });

    localStorage.clear();

    // Reset navigator
    Object.defineProperty(window, 'navigator', {
      value: { ...originalNavigator },
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window.navigator, 'languages', {
      value: [],
      configurable: true,
    });

    // Reset import.meta.env
    vi.stubEnv('BASE_URL', '/');
    vi.stubEnv('VITE_DEFAULT_LANGUAGE', 'en');
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
    vi.unstubAllEnvs();
  });

  it('should return language from URL path', () => {
    window.location.pathname = '/de/about';
    expect(getLanguageFromUrl()).toBe('de');
  });

  it('should prioritize URL path over localStorage', () => {
    window.location.pathname = '/fr/';
    localStorage.setItem('i18nextLng', 'es');
    expect(getLanguageFromUrl()).toBe('fr');
  });

  it('should return language from localStorage if URL has no language', () => {
    window.location.pathname = '/about';
    localStorage.setItem('i18nextLng', 'it');
    expect(getLanguageFromUrl()).toBe('it');
  });

  it('should return exact match from navigator.languages', () => {
    window.location.pathname = '/';
    Object.defineProperty(window.navigator, 'languages', {
      value: ['zh-TW', 'en-US', 'en'],
      configurable: true,
    });
    expect(getLanguageFromUrl()).toBe('zh-TW');
  });

  it('should return primary language match from navigator.languages', () => {
    window.location.pathname = '/';
    // 'de-AT' is not in supportedLanguages, but we should match its primary 'de'
    Object.defineProperty(window.navigator, 'languages', {
      value: ['de-AT', 'en-US', 'en'],
      configurable: true,
    });
    expect(getLanguageFromUrl()).toBe('de');
  });

  it('should return first matched language from navigator.languages', () => {
    window.location.pathname = '/';
    Object.defineProperty(window.navigator, 'languages', {
      value: ['fr-CA', 'de-DE', 'en'],
      configurable: true,
    });
    expect(getLanguageFromUrl()).toBe('fr');
  });

  it('should ignore unsupported languages in navigator.languages', () => {
    window.location.pathname = '/';
    Object.defineProperty(window.navigator, 'languages', {
      value: ['xx-XX', 'es-ES'],
      configurable: true,
    });
    expect(getLanguageFromUrl()).toBe('es');
  });

  it('should fallback to env variable if no earlier match', () => {
    window.location.pathname = '/';
    Object.defineProperty(window.navigator, 'languages', {
      value: ['xx'],
      configurable: true,
    }); // unsupported
    vi.stubEnv('VITE_DEFAULT_LANGUAGE', 'vi');
    expect(getLanguageFromUrl()).toBe('vi');
  });

  it('should fallback to en if everything else fails', () => {
    window.location.pathname = '/';
    Object.defineProperty(window.navigator, 'languages', {
      value: [],
      configurable: true,
    });
    vi.stubEnv('VITE_DEFAULT_LANGUAGE', '');
    expect(getLanguageFromUrl()).toBe('en');
  });

  it('should handle missing navigator object gracefully', () => {
    window.location.pathname = '/';
    Object.defineProperty(window, 'navigator', {
      value: undefined,
      writable: true,
    });
    expect(getLanguageFromUrl()).toBe('en');
  });
});

describe('applyTranslations', () => {
  afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it('interpolates data-i18n-options for text translations', () => {
    document.body.innerHTML =
      '<span data-i18n="tools:pdfWorkflow.nodeCount" data-i18n-options=\'{"count":0}\'>0 nodes</span>';
    const translate = vi.spyOn(i18next, 't').mockImplementation(((
      key: string,
      options?: Record<string, unknown>
    ) => {
      return key === 'tools:pdfWorkflow.nodeCount'
        ? `${options?.count} nodes`
        : key;
    }) as typeof i18next.t);

    applyTranslations();

    expect(document.body.textContent).toBe('0 nodes');
    expect(translate).toHaveBeenCalledWith('tools:pdfWorkflow.nodeCount', {
      count: 0,
    });
  });
});

describe('rewriteLinks', () => {
  const originalLocation = window.location;

  const setPath = (pathname: string) => {
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, pathname },
      writable: true,
      configurable: true,
    });
  };

  const renderLinks = (html: string) => {
    document.body.replaceChildren();
    const container = document.createElement('div');
    container.innerHTML = html;
    document.body.appendChild(container);
    rewriteLinks();
    return Array.from(container.querySelectorAll('a')).map((a) => ({
      href: a.getAttribute('href'),
      text: a.textContent,
    }));
  };

  beforeEach(() => {
    localStorage.clear();
    vi.stubEnv('BASE_URL', '/');
  });

  afterEach(() => {
    document.body.replaceChildren();
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('keeps /docs/ untouched (docs subsite is language-neutral)', () => {
    setPath('/zh/');
    expect(renderLinks('<a href="/docs/">文档</a>')).toEqual([
      { href: '/docs/', text: '文档' },
    ]);
  });

  it('keeps /docs without trailing slash untouched', () => {
    setPath('/zh/');
    expect(renderLinks('<a href="/docs">文档</a>')).toEqual([
      { href: '/docs', text: '文档' },
    ]);
  });

  it('still prefixes other root-absolute links with the language', () => {
    setPath('/zh/');
    expect(renderLinks('<a href="/merge-pdf">合并</a>')).toEqual([
      { href: '/zh/merge-pdf', text: '合并' },
    ]);
  });

  it('still prefixes relative links with the language', () => {
    setPath('/de/');
    expect(renderLinks('<a href="about.html">关于</a>')).toEqual([
      { href: '/de/about.html', text: '关于' },
    ]);
  });

  it('does nothing for the English site', () => {
    setPath('/en/');
    expect(renderLinks('<a href="/docs/">Docs</a>')).toEqual([
      { href: '/docs/', text: 'Docs' },
    ]);
  });
});
