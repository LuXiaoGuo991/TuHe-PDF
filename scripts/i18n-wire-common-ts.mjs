import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = new Set([
  'compress-pdf-page.ts',
  'edit-pdf-page.ts',
  'jpg-to-pdf-page.ts',
  'merge-pdf-page.ts',
  'sign-pdf-page.ts',
  'split-pdf-page.ts',
  'password-prompt.ts',
  'fileHandler.ts',
  'crop-pdf-page.ts',
]);
const replacements = [
  [
    "showLoader('Loading PDF...');",
    "showLoader(translate('fileHandler.loadingPdf', 'Loading PDF...'));",
  ],
  [
    "showLoader('Loading PDF documents...');",
    "showLoader(translate('fileHandler.loadingDocuments', 'Loading PDF documents...'));",
  ],
  [
    "showLoader('Processing...');",
    "showLoader(translate('loader.processing', 'Processing...'));",
  ],
  ["showAlert('Error',", "showAlert(translate('alert.error', 'Error'),"],
  [
    "showAlert(\n        'Error',",
    "showAlert(\n        translate('alert.error', 'Error'),",
  ],
  [
    "showAlert(\n      'Error',",
    "showAlert(\n      translate('alert.error', 'Error'),",
  ],
  ["showAlert('Success',", "showAlert(translate('alert.success', 'Success'),"],
  [
    "showAlert(\n        'Success',",
    "showAlert(\n        translate('alert.success', 'Success'),",
  ],
  [
    "showAlert(\n      'Success',",
    "showAlert(\n      translate('alert.success', 'Success'),",
  ],
  [
    "showAlert('Invalid File',",
    "showAlert(translate('alert.invalidFile', 'Invalid File'),",
  ],
  [
    "showAlert(\n        'Invalid File',",
    "showAlert(\n        translate('alert.invalidFile', 'Invalid File'),",
  ],
  [
    "showAlert(\n      'Invalid File',",
    "showAlert(\n      translate('alert.invalidFile', 'Invalid File'),",
  ],
  [
    "showAlert('No Files',",
    "showAlert(translate('alert.noFiles', 'No Files'),",
  ],
  [
    "showAlert(\n        'No Files',",
    "showAlert(\n        translate('alert.noFiles', 'No Files'),",
  ],
  [
    "showAlert(\n      'No Files',",
    "showAlert(\n      translate('alert.noFiles', 'No Files'),",
  ],
];
const helper = `
const translate = (
  key: string,
  fallback: string,
  options?: Record<string, unknown>
) => {
  const translation = t(key, options);
  return translation && translation !== key ? translation : fallback;
};
`;
const pending = new Map();
let errors = 0;

const walk = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute);
    else if (entry.name.endsWith('.ts') && !SKIP.has(entry.name))
      processFile(absolute);
  }
};

function processFile(absolute) {
  let source = fs.readFileSync(absolute, 'utf8');
  let changed = false;
  let count = 0;
  for (const [old, replacement] of replacements) {
    const found = source.split(old).length - 1;
    if (found > 0) {
      source = source.split(old).join(replacement);
      changed = true;
      count += found;
    }
  }
  if (!changed) return;
  const relative = path.relative(ROOT, absolute).replaceAll(path.sep, '/');
  if (
    !/import\s*\{[^}]*\bt\b[^}]*\}\s*from\s*['"][^'"]*\/i18n\/(?:index|i18n)/.test(
      source
    )
  ) {
    const importPath =
      relative.startsWith('src/js/logic/') ||
      relative.startsWith('src/js/utils/') ||
      relative.startsWith('src/js/handlers/')
        ? '../i18n/i18n'
        : './i18n/i18n';
    const firstImport = source.match(/^[ \t]*import[\s\S]*?;\r?\n/m)?.[0];
    if (!firstImport) {
      console.error(`✘ ${relative}: 找不到 import 插入点`);
      errors++;
      return;
    }
    source = source.replace(
      firstImport,
      `${firstImport}import { t } from '${importPath}';\n`
    );
  }
  if (!source.includes('const translate = (')) {
    const importMatch = source.match(
      /import \{ t \} from ['"][^'"]+['"];\r?\n/
    );
    if (!importMatch) {
      console.error(`✘ ${relative}: 找不到 translate 插入点`);
      errors++;
      return;
    }
    source = source.replace(importMatch[0], `${importMatch[0]}${helper}`);
  }
  console.log(`✔ ${relative}: ${count} 处通用文案已接线`);
  pending.set(absolute, source);
}

walk(path.join(ROOT, 'src/js'));
if (errors > 0) {
  console.error('校验失败，未写入任何文件');
  process.exit(1);
}
for (const [absolute, source] of pending) fs.writeFileSync(absolute, source);
console.log(`✔ 已写入 ${pending.size} 个 TS 文件。`);
