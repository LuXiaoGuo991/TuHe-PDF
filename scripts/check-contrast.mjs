import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Pure-Node WCAG AA contrast gate for the TuHe design tokens.
 *
 * Parses the actual `--color-*` values from `src/css/styles.css` (both the
 * dark `:root` block and the warm-white `[data-theme='light']` block) and
 * computes contrast ratios for the button + status-text pairs that the
 * purpose-specific tokens are expected to satisfy:
 *
 *   - normal text (button labels, status text)  → ≥ 4.5:1
 *   - non-text UI component boundaries          → ≥ 3:1
 *
 * This does not rely on screenshots or human judgement.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CSS_PATH = path.join(ROOT, 'src', 'css', 'styles.css');

const TEXT_MIN = 4.5;
const NON_TEXT_MIN = 3.0;

// Purpose-specific token pairings that must meet WCAG AA.
const TEXT_CHECKS = [
  ['--color-on-action', '--color-action', 'primary button label'],
  ['--color-on-danger', '--color-button-danger', 'danger button label'],
  [
    '--color-status-success-text',
    '--color-surface-sunken',
    'success status text',
  ],
  [
    '--color-status-warning-text',
    '--color-surface-sunken',
    'warning status text',
  ],
  [
    '--color-status-danger-text',
    '--color-surface-sunken',
    'danger status text',
  ],
  ['--color-status-info-text', '--color-surface-sunken', 'info status text'],
];

const NON_TEXT_CHECKS = [
  ['--color-action', '--color-surface', 'action button boundary'],
];

function relativeLuminance(hex) {
  const value = hex.replace('#', '');
  if (value.length === 3) {
    return relativeLuminance(
      `#${value
        .split('')
        .map((c) => c + c)
        .join('')}`
    );
  }
  if (value.length !== 6) {
    throw new Error(`unsupported color value: ${hex}`);
  }
  const channel = (start) => {
    const raw = parseInt(value.slice(start, start + 2), 16);
    if (Number.isNaN(raw)) throw new Error(`unsupported color value: ${hex}`);
    const c = raw / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

function contrastRatio(fg, bg) {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function parseTokens(css, blockStart) {
  const start = css.indexOf(blockStart);
  if (start === -1) throw new Error(`block not found: ${blockStart}`);
  const brace = css.indexOf('{', start);
  const end = css.indexOf('}', brace);
  if (brace === -1 || end === -1)
    throw new Error(`malformed block: ${blockStart}`);
  const body = css.slice(brace + 1, end);
  const tokens = new Map();
  for (const match of body.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) {
    tokens.set(`--${match[1]}`, match[2].trim());
  }
  return tokens;
}

function requireHex(tokens, name, theme) {
  const value = tokens.get(name);
  if (!value) throw new Error(`${name} missing from ${theme} block`);
  if (!value.startsWith('#')) {
    throw new Error(`${name} is not a hex color in ${theme}: ${value}`);
  }
  return value;
}

const css = fs.readFileSync(CSS_PATH, 'utf8');
const themes = [
  ['dark', parseTokens(css, ':root')],
  ['light', parseTokens(css, "[data-theme='light']")],
];

const failures = [];
const results = [];

for (const [theme, tokens] of themes) {
  for (const [fgName, bgName, label] of TEXT_CHECKS) {
    const fg = requireHex(tokens, fgName, theme);
    const bg = requireHex(tokens, bgName, theme);
    const ratio = contrastRatio(fg, bg);
    results.push({ theme, label, fg, bg, ratio, min: TEXT_MIN });
    if (ratio < TEXT_MIN) {
      failures.push(
        `${theme} ${label}: ${fgName} on ${bgName} = ${ratio.toFixed(2)}:1 < ${TEXT_MIN}:1`
      );
    }
  }
  for (const [fgName, bgName, label] of NON_TEXT_CHECKS) {
    const fg = requireHex(tokens, fgName, theme);
    const bg = requireHex(tokens, bgName, theme);
    const ratio = contrastRatio(fg, bg);
    results.push({ theme, label, fg, bg, ratio, min: NON_TEXT_MIN });
    if (ratio < NON_TEXT_MIN) {
      failures.push(
        `${theme} ${label}: ${fgName} on ${bgName} = ${ratio.toFixed(2)}:1 < ${NON_TEXT_MIN}:1`
      );
    }
  }
}

for (const { theme, label, fg, bg, ratio, min } of results) {
  const ok = ratio >= min;
  console.log(
    `${ok ? '✔' : '✘'} [${theme}] ${label}: ${fg} on ${bg} = ${ratio.toFixed(2)}:1 (≥ ${min}:1)`
  );
}

if (failures.length) {
  console.error(`\n${failures.length} contrast check(s) failed:`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('\nWCAG AA contrast checks passed.');
