import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const tools = [
  ['split-pdf', 'src/pages/split-pdf.html', 'src/js/logic/split-pdf-page.ts'],
  [
    'compress-pdf',
    'src/pages/compress-pdf.html',
    'src/js/logic/compress-pdf-page.ts',
  ],
  [
    'jpg-to-pdf',
    'src/pages/jpg-to-pdf.html',
    'src/js/logic/jpg-to-pdf-page.ts',
  ],
  ['edit-pdf', 'src/pages/edit-pdf.html', 'src/js/logic/edit-pdf-page.ts'],
  ['sign-pdf', 'src/pages/sign-pdf.html', 'src/js/logic/sign-pdf-page.ts'],
  ['ocr-pdf', 'src/pages/ocr-pdf.html', 'src/js/logic/ocr-pdf-page.ts'],
  [
    'pdf-to-word',
    'src/pages/pdf-to-docx.html',
    'src/js/logic/pdf-to-docx-page.ts',
  ],
  [
    'rotate-pdf',
    'src/pages/rotate-pdf.html',
    'src/js/logic/rotate-pdf-page.ts',
  ],
  [
    'add-page-numbers',
    'src/pages/page-numbers.html',
    'src/js/logic/page-numbers-page.ts',
  ],
  [
    'watermark-pdf',
    'src/pages/add-watermark.html',
    'src/js/logic/add-watermark-page.ts',
  ],
];

const pilot = [
  'merge-pdf',
  'src/pages/merge-pdf.html',
  'src/js/logic/merge-pdf-page.ts',
];
const aliases = new Map([
  ['pdf-to-docx', 'pdf-to-word'],
  ['page-numbers', 'add-page-numbers'],
  ['add-watermark', 'watermark-pdf'],
]);

const replacements = new Map([
  ['hover:file:bg-indigo-700', 'ui-file-hover-bg-action'],
  ['file:bg-indigo-600', 'ui-file-bg-action'],
  ['file:text-white', 'ui-file-text-primary'],
  ['focus:ring-indigo-600', 'ui-focus-ring'],
  ['focus:ring-indigo-500', 'ui-focus-ring'],
  ['focus:border-indigo-500', 'ui-focus-ring'],
  ['hover:border-indigo-500', 'ui-hover-border-action'],
  ['border-indigo-400/60', 'ui-border-action-soft'],
  ['border-indigo-500', 'ui-border-action'],
  ['hover:bg-indigo-500', 'ui-hover-bg-action'],
  ['hover:bg-indigo-700', 'ui-hover-bg-action'],
  ['hover:bg-green-700', 'ui-hover-bg-success'],
  ['hover:bg-gray-600', 'ui-hover-bg-raised'],
  ['hover:bg-gray-700', 'ui-hover-bg-raised'],
  ['hover:text-indigo-300', 'ui-hover-text-action'],
  ['hover:text-red-300', 'ui-hover-text-danger'],
  ['hover:text-white', 'ui-hover-text-primary'],
  ['placeholder-gray-500', 'ui-placeholder-muted'],
  ['bg-indigo-600', 'ui-bg-action'],
  ['bg-green-600', 'ui-bg-success'],
  ['bg-gray-900', 'ui-bg-canvas'],
  ['bg-gray-800', 'ui-bg-surface'],
  ['bg-gray-700', 'ui-bg-raised'],
  ['bg-black', 'ui-bg-sunken'],
  ['bg-white', 'ui-bg-light'],
  ['text-indigo-600', 'ui-text-action'],
  ['text-indigo-400', 'ui-text-action'],
  ['text-green-400', 'ui-text-success'],
  ['text-red-400', 'ui-text-danger'],
  ['text-yellow-300', 'ui-text-warning'],
  ['text-yellow-400', 'ui-text-warning'],
  ['text-yellow-500', 'ui-text-warning'],
  ['text-blue-400', 'ui-text-info'],
  ['text-gray-200', 'ui-text-primary'],
  ['text-gray-300', 'ui-text-secondary'],
  ['text-gray-400', 'ui-text-secondary'],
  ['text-gray-500', 'ui-text-tertiary'],
  ['text-white', 'ui-text-primary'],
  ['border-gray-600', 'ui-border'],
  ['border-gray-700', 'ui-border-subtle'],
]);

const legacyPattern =
  /(?:^|\s)(?:[a-z-]+:)*(?:bg|text|border|ring|divide|outline|placeholder|file:bg|file:text)-(?:gray|indigo)(?:-[0-9]+)?(?:\/[0-9]+)?(?=\s|["'`])/g;

function migrate(content, isHtml) {
  let next = content;
  for (const [from, to] of [...replacements].sort(
    (a, b) => b[0].length - a[0].length
  )) {
    next = next.replace(
      new RegExp(
        `(?<![A-Za-z0-9_-])${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-z0-9_/-])`,
        'g'
      ),
      to
    );
  }

  if (isHtml) {
    next = next.replace(
      /<body class="(?![^"]*\bphase2-tool-page\b)/,
      '<body class="phase2-tool-page '
    );
    next = next.replace(
      /<(input|select|textarea)(\s[^>]*?)class="(?![^"]*\bui-input\b)/g,
      '<$1$2class="ui-input '
    );
    next = next.replace(
      /<button(\s[^>]*?)class="(?![^"]*\bui-button-primary\b)([^"]*\bui-bg-action\b[^"]*)"/g,
      '<button$1class="ui-button-primary $2"'
    );
    next = next.replace(
      /<button(\s[^>]*?)class="([^"]*\bui-text-danger\b[^"]*)"/g,
      '<button$1class="ui-button-danger $2"'
    );
    next = next.replace(
      /<button(\s[^>]*?)class="(?![^"]*\bui-button-)([^"]*)"/g,
      '<button$1class="ui-button-secondary $2"'
    );
    next = next.replace(
      /id="([^"]*(?:drop-zone|upload-area|upload-zone)[^"]*)"\s+class="(?![^"]*\bui-drop-zone\b)/g,
      'id="$1" class="ui-panel ui-drop-zone '
    );
  }
  next = next.replace(
    /\b(ui-button-primary|ui-button-secondary|ui-button-danger|ui-input)(?:\s+\1)+/g,
    '$1'
  );
  return next;
}

const args = process.argv.slice(2);
const write = args.includes('--write');
const check = args.includes('--check') || !write;
const toolArg = args.find((arg) => arg.startsWith('--tool='))?.slice(7);
let selected = tools;
if (toolArg) {
  const requested = toolArg.split(',').map((item) => aliases.get(item) || item);
  selected = [...tools, pilot].filter(([slug]) => requested.includes(slug));
  const missing = requested.filter(
    (slug) => !selected.some(([item]) => item === slug)
  );
  if (missing.length)
    throw new Error(`Unknown tool slug(s): ${missing.join(', ')}`);
}

let changed = 0;
let unresolved = 0;
for (const [slug, ...relativeFiles] of selected) {
  for (const relativeFile of relativeFiles) {
    const absolute = path.join(ROOT, relativeFile);
    const original = fs.readFileSync(absolute, 'utf8');
    const migrated = migrate(original, relativeFile.endsWith('.html'));
    if (migrated !== original) {
      changed++;
      if (write) fs.writeFileSync(absolute, migrated);
      console.log(
        `${write ? 'updated' : 'would update'} ${slug}: ${relativeFile}`
      );
    }
    const source = write ? migrated : original;
    const matches = source.match(legacyPattern) || [];
    if (matches.length) {
      unresolved += matches.length;
      console.error(`unresolved ${slug}: ${relativeFile} (${matches.length})`);
    }
  }
}

console.log(
  `${selected.length} tool(s), ${changed} file(s) ${write ? 'updated' : 'need migration'}, ${unresolved} unresolved legacy token(s).`
);
if (check && (changed > 0 || unresolved > 0)) process.exitCode = 1;
