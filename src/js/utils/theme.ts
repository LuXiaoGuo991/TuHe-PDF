const THEME_KEY = 'tuhe.theme';

/**
 * Applies the saved theme to `<html data-theme="...">`, updates the
 * topbar toggle icon, and binds the toggle button (when present — it only
 * exists on the workbench homepage). Called once from main.ts so both the
 * workbench and every tool page (iframe) pick up the same persisted theme.
 */
export function initTheme(): void {
  const toggle = document.getElementById('topbar-theme-toggle');

  const applyTheme = (theme: 'dark' | 'light'): void => {
    document.documentElement.setAttribute('data-theme', theme);
    const icon = toggle?.querySelector('i');
    if (icon) {
      icon.className = theme === 'light' ? 'ph ph-sun' : 'ph ph-moon';
    }
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* localStorage 不可用时忽略 */
    }
  };

  toggle?.addEventListener('click', () => {
    applyTheme(
      document.documentElement.getAttribute('data-theme') === 'light'
        ? 'dark'
        : 'light'
    );
  });

  let savedTheme: string | null = null;
  try {
    savedTheme = localStorage.getItem(THEME_KEY);
  } catch {
    /* localStorage 不可用时忽略 */
  }
  applyTheme(savedTheme === 'light' ? 'light' : 'dark');
}
