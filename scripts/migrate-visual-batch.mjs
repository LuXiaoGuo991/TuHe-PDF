import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// 精确的颜色类替换映射：从 Tailwind gray/indigo/green/red/yellow/blue
// 迁移到 styles.css 中定义的 `.ui-*` 语义组件类。
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
  // 浅色 UI 类与未覆盖色阶 → 深色 token（bookmark 等页面的浅色编辑区）
  ['hover:bg-gray-200', 'ui-hover-bg-raised'],
  ['hover:bg-gray-500', 'ui-hover-bg-raised'],
  ['hover:border-gray-500', 'ui-hover-border-action'],
  ['focus:ring-gray-300', 'ui-focus-ring'],
  ['placeholder-gray-400', 'ui-placeholder-muted'],
  ['ring-indigo-400', 'ui-focus-ring'],
  ['bg-gray-600', 'ui-bg-raised'],
  ['bg-gray-500', 'ui-bg-raised'],
  ['bg-gray-100', 'ui-bg-raised'],
  ['bg-gray-50', 'ui-bg-surface'],
  ['text-gray-800', 'ui-text-primary'],
  ['text-gray-700', 'ui-text-secondary'],
  ['border-gray-500', 'ui-border'],
  ['border-gray-200', 'ui-border-subtle'],
  // 透明度变体 → 实色 ui-*（深色主题下差异可接受）
  ['peer-focus:ring-indigo-500', 'ui-focus-ring'],
  ['focus:ring-indigo-500/30', 'ui-focus-ring'],
  ['border-indigo-700/40', 'ui-border-action-soft'],
  ['bg-indigo-900/20', 'ui-bg-sunken'],
  ['bg-indigo-500/10', 'ui-bg-sunken'],
  ['bg-gray-900/80', 'ui-bg-canvas'],
  ['bg-gray-800/95', 'ui-bg-surface'],
  ['bg-gray-700/80', 'ui-bg-raised'],
  ['bg-gray-700/50', 'ui-bg-raised'],
  ['border-gray-600/60', 'ui-border'],
  ['border-gray-600/50', 'ui-border'],
  ['border-slate-200', 'ui-border'],
]);

// 语义色通配映射：red→danger, green→success, yellow/amber/orange→warning,
// blue→info, indigo→action。用于把工作台 UI 的功能色 token 化。
const semanticColorMap = [
  ['red', 'danger'],
  ['green', 'success'],
  ['yellow', 'warning'],
  ['amber', 'warning'],
  ['orange', 'warning'],
  ['blue', 'info'],
  ['indigo', 'action'],
];

// 这些文件的颜色是 PDF 文档内容（书签颜色、表单字段色），不跟随主题，跳过语义色 token 化。
const semanticColorExclude = new Set([
  'src/js/types/bookmark-pdf-type.ts',
  'src/js/logic/form-creator.ts',
]);

// 检测替换后仍残留的 legacy 颜色类（含任意色阶和透明度变体）。
const legacyPattern =
  /(?:^|\s)(?:[a-z-]+:)*(?:bg|text|border|ring|divide|outline|placeholder|file:bg|file:text)-(?:gray|indigo)(?:-[0-9]+)?(?:\/[0-9]+)?(?=\s|["'`])/g;

function migrate(content, isHtml, relativePath) {
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

  // 语义色通配 token 化（PDF 内容文件跳过）
  if (relativePath && !semanticColorExclude.has(relativePath)) {
    for (const [color, semantic] of semanticColorMap) {
      next = next.replace(
        new RegExp(`hover:bg-${color}-\\d+(?:/\\d+)?`, 'g'),
        `ui-hover-bg-${semantic}`
      );
      next = next.replace(
        new RegExp(`hover:border-${color}-\\d+(?:/\\d+)?`, 'g'),
        `ui-hover-border-${semantic}`
      );
      next = next.replace(
        new RegExp(`(?<!:)bg-${color}-\\d+(?:/\\d+)?`, 'g'),
        `ui-bg-${semantic}`
      );
      next = next.replace(
        new RegExp(`(?<!:)text-${color}-\\d+(?:/\\d+)?`, 'g'),
        `ui-text-${semantic}`
      );
      next = next.replace(
        new RegExp(`(?<!:)border-${color}-\\d+(?:/\\d+)?`, 'g'),
        `ui-border-${semantic}`
      );
      next = next.replace(
        new RegExp(`(?<!:)ring-${color}-\\d+(?:/\\d+)?`, 'g'),
        `ui-ring-${semantic}`
      );
      next = next.replace(
        new RegExp(`focus:ring-${color}-\\d+(?:/\\d+)?`, 'g'),
        'ui-focus-ring'
      );
      next = next.replace(
        new RegExp(`accent-${color}-\\d+(?:/\\d+)?`, 'g'),
        'ui-accent-action'
      );
    }
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

  // 去重：连续重复的 ui-* 类名合并为一个。
  next = next.replace(
    /\b(ui-button-primary|ui-button-secondary|ui-button-danger|ui-input)(?:\s+\1)+/g,
    '$1'
  );
  return next;
}

// 递归发现 src/js 下所有 TS 文件（排除测试与 i18n 目录）。
function collectTsFiles() {
  const jsDir = path.join(ROOT, 'src', 'js');
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'tests' || entry.name === 'i18n') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.ts')) out.push(full);
    }
  };
  walk(jsDir);
  return out;
}

function collectHtmlFiles() {
  const pagesDir = path.join(ROOT, 'src', 'pages');
  return fs
    .readdirSync(pagesDir)
    .filter((f) => f.endsWith('.html'))
    .map((f) => path.join(pagesDir, f));
}

const args = process.argv.slice(2);
const write = args.includes('--write');
const check = args.includes('--check') || !write;
const htmlOnly = args.includes('--html');
const tsOnly = args.includes('--ts');
const toolArg = args.find((arg) => arg.startsWith('--tool='))?.slice(7);

const targets = [];
if (!tsOnly) {
  for (const html of collectHtmlFiles()) {
    if (toolArg && !html.includes(toolArg)) continue;
    targets.push({ file: html, isHtml: true, slug: path.basename(html) });
  }
}
if (!htmlOnly) {
  for (const ts of collectTsFiles()) {
    if (toolArg && !ts.includes(toolArg)) continue;
    targets.push({ file: ts, isHtml: false, slug: path.basename(ts) });
  }
}

let changed = 0;
let unresolvedTotal = 0;
const unresolvedByFile = [];

for (const { file, isHtml, slug } of targets) {
  const original = fs.readFileSync(file, 'utf8');
  const relative = path.relative(ROOT, file);
  const migrated = migrate(original, isHtml, relative);

  if (migrated !== original) {
    changed++;
    if (write) fs.writeFileSync(file, migrated);
    console.log(`${write ? 'updated' : 'would update'} ${relative}`);
  }

  const matches = migrated.match(legacyPattern) || [];
  if (matches.length) {
    unresolvedTotal += matches.length;
    unresolvedByFile.push([relative, matches.length]);
    console.error(`unresolved ${relative} (${matches.length})`);
  }
}

console.log(
  `${targets.length} file(s), ${changed} file(s) ${write ? 'updated' : 'need migration'}, ${unresolvedTotal} unresolved legacy token(s) in ${unresolvedByFile.length} file(s).`
);
if (check && (changed > 0 || unresolvedTotal > 0)) process.exitCode = 1;
