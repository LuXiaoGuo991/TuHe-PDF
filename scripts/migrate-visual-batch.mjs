import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import postcss from 'postcss';
import { parse } from 'parse5';

// True only when executed directly (`node scripts/migrate-visual-batch.mjs`),
// false when imported (e.g. by the unit tests).
const isMain =
  !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Normalize a relative path to POSIX separators (`/`), so that Windows
 *  `path.relative()` output (`\\`) matches the `/`-based exemption keys. */
export const toPosix = (relativePath) => relativePath.split(path.sep).join('/');

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
  ['focus:ring-indigo-400', 'ui-focus-ring'],
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

// ---------------------------------------------------------------------------
// 豁免表：逐条登记「文件 + 选择器/token + 原因」，禁止整文件跳过。
//
// 唯一例外是 `wholeFile: true`，且仅允许用于**不进入构建、自带固定色板的
// 独立开发工具页**（`svg-repair.html`）。站点面（`src/pages/**`、
// `src/partials/**`）与已发布的根站点页一律不得整文件豁免——这是 2026-09
// 旧色板长期漏检的教训，测试 `migrate-visual-batch.test.ts` 会守住这条边界。
// ---------------------------------------------------------------------------
export const EXEMPTIONS = [
  {
    file: 'svg-repair.html',
    wholeFile: true,
    reason:
      '本地 SVG 修整台：不参与 vite 构建、不引用 styles.css，自带固定浅色 paper 色板（--ink/--paper/--side/--line/--green/--red），不跟随站点主题',
  },
  {
    file: 'src/pages/compare-pdfs.html',
    customProperty: '--compare-',
    reason: 'PDF 纸张与差异叠加/图例为业务语义色，固定不变，不跟随主题',
  },
  {
    file: 'src/pages/pdf-workflow.html',
    customProperty: '--wf-socket-color',
    reason: 'socket/连接线颜色为页面级业务变量，不跟随主题',
  },
  {
    file: 'src/pages/pdf-workflow.html',
    customProperty: '--cat-color',
    reason: '节点类别色为页面级业务变量，不跟随主题',
  },
  {
    file: 'src/pages/form-creator.html',
    selector: '#pdfCanvasWrapper',
    reason: 'PDF 表单预览画布边框为文档内容，不跟随主题',
  },
  {
    file: 'src/js/logic/form-creator.ts',
    colorFamily: 'gray',
    reason: 'PDF 表单字段的灰色边框/文字属于文档内容，不跟随主题',
  },
  {
    file: 'src/js/logic/pdf-workflow-page.ts',
    colorFamily: 'violet',
    reason: '工作流节点类别色为业务语义，不跟随主题',
  },
  {
    file: 'src/js/logic/pdf-workflow-page.ts',
    colorFamily: 'rose',
    reason: '工作流节点类别色为业务语义，不跟随主题',
  },
  {
    file: 'src/js/logic/pdf-workflow-page.ts',
    colorFamily: 'teal',
    reason: '工作流节点类别色为业务语义，不跟随主题',
  },
  {
    file: 'src/js/types/bookmark-pdf-type.ts',
    colorFamily: 'purple',
    reason: '书签类别紫色属于 PDF 文档内容，不跟随主题',
  },
];

function matchingExemptions(file) {
  return EXEMPTIONS.filter((ex) => ex.file === file);
}

function isCustomPropertyExempt(file, prop) {
  return matchingExemptions(file).some(
    (ex) => ex.customProperty && prop.startsWith(ex.customProperty)
  );
}

function isSelectorExempt(file, selector) {
  return matchingExemptions(file).some(
    (ex) => ex.selector && ex.selector === selector
  );
}

function isColorFamilyExempt(file, colorFamily) {
  return matchingExemptions(file).some(
    (ex) => ex.colorFamily && ex.colorFamily === colorFamily
  );
}

/** 整文件豁免（仅限非构建产物的独立开发工具页，见 EXEMPTIONS 注释）。 */
export function isWholeFileExempt(file) {
  return matchingExemptions(file).some((ex) => ex.wholeFile);
}

// ---------------------------------------------------------------------------
// 颜色检测
// ---------------------------------------------------------------------------

const COLOR_LITERAL_RE =
  /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b|rgba?\(\s*[\d.\s,%]+\)|hsla?\([\d.\s,%deg]+\)/g;

const COLOR_FAMILY =
  'gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';

// 会消费调色板的 Tailwind 工具族。早期版本漏了 `ring-offset` 与 `shadow`，
// 于是 `focus:ring-offset-gray-900`、`hover:shadow-indigo-500/30` 这类色相泄漏
// 既不报警、也不在迁移范围内。`ring|ring-offset` 的顺序保证长前缀先被尝试。
const COLOR_UTILITY_PREFIXES =
  'bg|text|border|divide|ring|ring-offset|outline|placeholder|accent|fill|stroke|from|via|to|shadow|decoration|caret';

// 尾界定必须同时接受「分隔符」与「串尾」：`tailwindIssues()` 收到的是
// `class` 属性值本身（不含引号），因此每个类属性里最后一个颜色类永远以
// 字符串结尾收尾。旧版只认 `[\s"'\x60]`，导致 `class="… text-gray-400"`
// 这类尾部 token 被系统性漏检（每个属性恰好漏 1 个）。
const TAILWIND_COLOR_RE = new RegExp(
  `(?:^|[\\s"'\\x60])((?:[a-z-]+:)*(?:${COLOR_UTILITY_PREFIXES})-(${COLOR_FAMILY})(?:-\\d+)?(?:\\/\\d+)?)(?=[\\s"'\\x60]|$)`,
  'g'
);

function findColorLiterals(value) {
  return value.match(COLOR_LITERAL_RE) || [];
}

/** Strip `var(--exempted, <fallback>)` fallbacks for an exempted custom
 *  property, so fallback colors are not reported as unapproved. */
function stripExemptedVarFallbacks(file, value) {
  let next = value;
  for (const ex of matchingExemptions(file)) {
    if (!ex.customProperty) continue;
    const name = ex.customProperty.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    next = next.replace(
      new RegExp(`var\\(${name}[^)]*\\)`, 'g'),
      `var(${ex.customProperty})`
    );
  }
  return next;
}

function cssIssues(file, cssText) {
  const issues = [];
  let root;
  try {
    root = postcss.parse(cssText);
  } catch {
    return issues;
  }
  root.walkDecls((decl) => {
    if (isCustomPropertyExempt(file, decl.prop)) return;
    const value = stripExemptedVarFallbacks(file, decl.value);
    for (const color of findColorLiterals(value)) {
      issues.push({ kind: 'css-color', value: color, prop: decl.prop });
    }
  });
  return issues;
}

function tailwindIssues(file, text) {
  const issues = [];
  for (const match of text.matchAll(TAILWIND_COLOR_RE)) {
    const token = match[1];
    const colorFamily = match[2];
    if (isColorFamilyExempt(file, colorFamily)) continue;
    issues.push({ kind: 'tailwind-class', value: token });
  }
  return issues;
}

/** Collect unapproved legacy colors for a file's (post-migration) content. */
export function collectIssues(file, content) {
  const rel = toPosix(file);
  const issues = [];
  if (isWholeFileExempt(rel)) return issues;
  const isHtml = rel.endsWith('.html');

  if (isHtml) {
    let doc;
    try {
      doc = parse(content);
    } catch {
      return issues;
    }
    const walk = (node) => {
      if (node.tagName === 'style') {
        const text = node.childNodes?.map((n) => n.value || '').join('') || '';
        issues.push(...cssIssues(rel, text));
      } else if (node.attrs) {
        const styleAttr = node.attrs.find((a) => a.name === 'style');
        const classAttr = node.attrs.find((a) => a.name === 'class');
        const idAttr = node.attrs.find((a) => a.name === 'id');

        if (styleAttr) {
          if (!isSelectorExempt(rel, idAttr ? `#${idAttr.value}` : '')) {
            issues.push(...cssIssues(rel, styleAttr.value));
          }
        }
        if (classAttr) {
          issues.push(...tailwindIssues(rel, classAttr.value));
        }
      }
      if (node.childNodes) for (const child of node.childNodes) walk(child);
    };
    walk(doc);
  } else {
    issues.push(...tailwindIssues(rel, content));
  }

  return issues;
}

// ---------------------------------------------------------------------------
// 迁移（apply）
// ---------------------------------------------------------------------------

/**
 * 迁移一个文件的旧色板用法。
 *
 * `toolPage` 控制「工具页专属的结构性注入」（`<body>` 加 `phase2-tool-page`、
 * 给 input/button/drop-zone 补 `ui-*` 组件类）。这些注入只对
 * `src/pages/**` 的 115 个工具页成立；站点页、partial 与首页共用同一套
 * `ui-*` 语义类，但不接受工具页标记，否则 `<body>` 会被加上多余的
 * `phase2-tool-page`。默认 `false`（只做颜色替换，绝不改动结构）。
 */
export function migrate(content, isHtml, { toolPage = false } = {}) {
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

  // 语义色通配 token 化
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

  if (isHtml && toolPage) {
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

/** 递归收集目录下所有 .html 文件。 */
function walkHtml(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkHtml(full, out);
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

/**
 * 门控 HTML 扫描范围 = 三者并集：
 *   1. `src/pages/**`     —— 115 个工具页（递归，兼容未来子目录）
 *   2. `src/partials/**`  —— 站点 partial（footer / footer-simple / navbar-simple 等）
 *   3. 仓库根 `*.html`    —— 站点页与首页（404 / about / contact / index /
 *                            licensing / privacy / terms / svg-repair）
 *
 * 历史缺陷：v1 只 `readdirSync(src/pages)` 取顶层 `.html`，于是
 * `src/partials/**`、根目录 `*.html`（含 `index.html`）全在门控之外，
 * 站点页与页脚的旧调色板类长期无人看守。回归用例见
 * `src/tests/migrate-visual-batch.test.ts`。
 */
export function collectHtmlFiles() {
  return [
    ...walkHtml(path.join(ROOT, 'src', 'pages'), []),
    ...walkHtml(path.join(ROOT, 'src', 'partials'), []),
    ...fs
      .readdirSync(ROOT, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
      .map((entry) => path.join(ROOT, entry.name)),
  ].sort();
}

if (isMain) {
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
  let unapprovedTotal = 0;
  let exemptSkipped = 0;
  const unapprovedByFile = [];

  for (const { file, isHtml } of targets) {
    const original = fs.readFileSync(file, 'utf8');
    const relative = toPosix(path.relative(ROOT, file));

    // 整文件豁免（非构建产物的独立开发工具页）：既不迁移，也不计入未批准。
    if (isWholeFileExempt(relative)) {
      exemptSkipped++;
      continue;
    }

    // 结构性注入只对工具页成立；partial 与站点页只做颜色替换。
    const toolPage = relative.startsWith('src/pages/');
    const migrated = migrate(original, isHtml, { toolPage });

    if (migrated !== original) {
      changed++;
      if (write) fs.writeFileSync(file, migrated);
      console.log(`${write ? 'updated' : 'would update'} ${relative}`);
    }

    const issues = collectIssues(relative, migrated);
    if (issues.length) {
      unapprovedTotal += issues.length;
      unapprovedByFile.push([relative, issues.length]);
      console.error(
        `unapproved ${relative} (${issues.length})${issues[0] ? ` e.g. ${issues[0].value}` : ''}`
      );
    }
  }

  console.log(
    `${targets.length} file(s) (${exemptSkipped} whole-file exempt), ${changed} file(s) ${write ? 'updated' : 'need migration'}, ${unapprovedTotal} unapproved legacy color(s) in ${unapprovedByFile.length} file(s).`
  );
  if (check && (changed > 0 || unapprovedTotal > 0)) process.exitCode = 1;
}
