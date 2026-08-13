import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyTheme, initTheme, readStoredTheme } from '../js/utils/theme';

const THEME_KEY = 'tuhe.theme';

function mountToggle(): HTMLButtonElement {
  const toggle = document.createElement('button');
  toggle.id = 'topbar-theme-toggle';
  const icon = document.createElement('i');
  icon.className = 'ph ph-moon';
  toggle.appendChild(icon);
  document.body.appendChild(toggle);
  return toggle;
}

/** Captures the `storage` listener `initTheme` registers on `window`. */
function captureStorageListener(): {
  fire: (event: { key: string | null; newValue: string | null }) => void;
} {
  let handler:
    | ((event: { key: string | null; newValue: string | null }) => void)
    | undefined;
  vi.spyOn(window, 'addEventListener').mockImplementation(((
    type: string,
    listener: (event: { key: string | null; newValue: string | null }) => void
  ) => {
    if (type === 'storage') handler = listener;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any);
  return {
    fire(event) {
      handler?.(event);
    },
  };
}

describe('theme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('applyTheme', () => {
    it('updates data-theme and toggle icon without touching storage', () => {
      const setItem = vi.spyOn(Storage.prototype, 'setItem');
      const toggle = mountToggle();
      applyTheme('light');

      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      expect(toggle.querySelector('i')?.className).toBe('ph ph-sun');
      expect(setItem).not.toHaveBeenCalled();
    });

    it('applies dark icon for the dark theme', () => {
      const toggle = mountToggle();
      applyTheme('dark');
      expect(toggle.querySelector('i')?.className).toBe('ph ph-moon');
    });
  });

  describe('readStoredTheme', () => {
    it('defaults to dark when nothing is stored', () => {
      expect(readStoredTheme()).toBe('dark');
    });

    it('returns a valid stored light theme', () => {
      localStorage.setItem(THEME_KEY, 'light');
      expect(readStoredTheme()).toBe('light');
    });

    it('falls back to dark for invalid values', () => {
      localStorage.setItem(THEME_KEY, 'sepia');
      expect(readStoredTheme()).toBe('dark');
    });

    it('falls back to dark when localStorage is unavailable', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('denied');
      });
      expect(readStoredTheme()).toBe('dark');
    });
  });

  describe('initTheme', () => {
    it('initializes from persisted theme', () => {
      localStorage.setItem(THEME_KEY, 'light');
      initTheme();
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('initializes to dark when localStorage is unavailable', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('denied');
      });
      const setItem = vi.spyOn(Storage.prototype, 'setItem');
      expect(() => initTheme()).not.toThrow();
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      expect(setItem).not.toHaveBeenCalled();
    });

    it('toggles and persists on click', () => {
      const toggle = mountToggle();
      localStorage.setItem(THEME_KEY, 'dark');
      initTheme();

      toggle.click();
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      expect(localStorage.getItem(THEME_KEY)).toBe('light');

      toggle.click();
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      expect(localStorage.getItem(THEME_KEY)).toBe('dark');
    });

    it('applies a valid storage event without writing back', () => {
      const { fire } = captureStorageListener();
      const setItem = vi.spyOn(Storage.prototype, 'setItem');
      initTheme();

      fire({ key: THEME_KEY, newValue: 'light' });

      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      expect(setItem).not.toHaveBeenCalled();
    });

    it('ignores storage events for other keys or invalid values', () => {
      const { fire } = captureStorageListener();
      initTheme();

      fire({ key: 'collapsedCategories', newValue: 'light' });
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

      fire({ key: THEME_KEY, newValue: 'sepia' });
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });
  });
});
