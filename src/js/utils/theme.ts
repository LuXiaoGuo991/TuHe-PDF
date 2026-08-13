const THEME_KEY = 'tuhe.theme';

export type Theme = 'dark' | 'light';

function isTheme(value: string | null | undefined): value is Theme {
  return value === 'dark' || value === 'light';
}

/**
 * Applies a theme to `<html data-theme="...">` and updates the topbar
 * toggle icon (when present — it only exists on the workbench homepage).
 *
 * This function is intentionally side-effect free with respect to storage:
 * it never reads or writes `localStorage`, so it can be shared by the
 * initial load, the click handler, and the cross-document `storage` listener
 * without triggering write-back loops between the workbench and its iframes.
 */
export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
  const toggle = document.getElementById('topbar-theme-toggle');
  const icon = toggle?.querySelector('i');
  if (icon) {
    icon.className = theme === 'light' ? 'ph ph-sun' : 'ph ph-moon';
  }
}

/**
 * Reads the persisted theme, falling back to `dark` for missing or invalid
 * values. `localStorage` may throw (e.g. disabled or sandboxed), in which
 * case the default is returned.
 */
export function readStoredTheme(): Theme {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(THEME_KEY);
  } catch {
    /* localStorage 不可用时忽略 */
  }
  return isTheme(saved) ? saved : 'dark';
}

/**
 * Bootstraps the theme system for a document:
 *
 * 1. Applies the persisted theme immediately (so a freshly opened iframe or
 *    standalone tool page inherits the user's current preference).
 * 2. Binds the topbar toggle (workbench homepage only) to apply the new theme
 *    and persist it — this is the single write site.
 * 3. Listens for same-origin `storage` events so already-open iframes and
 *    other tabs re-apply the theme without writing back (avoiding loops).
 */
export function initTheme(): void {
  applyTheme(readStoredTheme());

  const toggle = document.getElementById('topbar-theme-toggle');
  toggle?.addEventListener('click', () => {
    const next: Theme =
      document.documentElement.getAttribute('data-theme') === 'light'
        ? 'dark'
        : 'light';
    applyTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* localStorage 不可用时忽略 */
    }
  });

  window.addEventListener('storage', (event) => {
    if (event.key !== THEME_KEY) return;
    if (isTheme(event.newValue)) {
      applyTheme(event.newValue);
    }
  });
}
