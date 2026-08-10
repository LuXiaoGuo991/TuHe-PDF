import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const requestedFiles = process.argv.slice(2);

if (requestedFiles.length === 0) {
  console.error(
    'Usage: node scripts/i18n-wire-dynamic-literals.mjs <ts-file> [...]'
  );
  process.exit(1);
}

const scopeOverrides = {
  'src/js/logic/pdf-workflow-page.ts': 'pdfWorkflow',
  'src/js/logic/pdf-multi-tool.ts': 'pdfMultiTool',
  'src/js/logic/bookmark-pdf.ts': 'editBookmarks',
  'src/js/logic/compare-render.ts': 'comparePdfs',
  'src/js/logic/add-stamps.ts': 'addStamps',
  'src/js/logic/md-to-pdf.ts': 'markdownToPdf',
  'src/js/logic/word-to-pdf.ts': 'wordToPdf',
  'src/js/logic/form-creator.ts': 'formCreator',
};

const sharedFiles = new Set([
  'src/js/ui.ts',
  'src/js/canvasEditor.ts',
  'src/js/utils/helpers.ts',
  'src/js/utils/page-preview.ts',
  'src/js/utils/markdown-editor.ts',
  'src/js/utils/render-utils.ts',
]);

const commonKeys = new Map([
  ['Error', 'alert.error'],
  ['Success', 'alert.success'],
  ['No Files', 'alert.noFiles'],
  ['Invalid File', 'alert.invalidFile'],
  ['Processing...', 'loader.processing'],
  ['Loading...', 'common.loading'],
]);

const workflowKeys = new Map([
  [
    'Add at least one node to run the workflow.',
    'tools:pdfWorkflow.addNodeError',
  ],
  [
    'Your workflow needs at least one input node and one output node to run.',
    'tools:pdfWorkflow.needInputOutput',
  ],
  ['Workflow completed', 'tools:pdfWorkflow.workflowCompleted'],
  ['Error during execution', 'tools:pdfWorkflow.errorDuringExecution'],
  ['Ready', 'tools:pdfWorkflow.ready'],
  ['Please enter a name.', 'tools:pdfWorkflow.enterName'],
  [
    'A template with this name already exists.',
    'tools:pdfWorkflow.templateExists',
  ],
  ['Load', 'tools:pdfWorkflow.load'],
  ['Failed to load template.', 'tools:pdfWorkflow.failedLoadTemplate'],
  ['No configurable settings for this node.', 'tools:pdfWorkflow.noSettings'],
  ['Advanced Settings', 'tools:pdfWorkflow.advancedSettings'],
  ['Incorrect password', 'tools:pdfWorkflow.incorrectPassword'],
]);

function normalize(value) {
  return value.replace(/\r\n/g, '\n');
}

function resolveScope(file, source) {
  if (scopeOverrides[file]) return scopeOverrides[file];
  if (sharedFiles.has(file)) return null;

  const base = path.basename(file, '.ts').replace(/-page$/, '');
  const pagePath = path.join(root, 'src/pages', `${base}.html`);
  if (fs.existsSync(pagePath)) {
    const page = fs.readFileSync(pagePath, 'utf8');
    const match = page.match(/data-i18n="tools:([A-Za-z0-9]+)\.name"/);
    if (match) return match[1];
  }

  const match = source.match(/tools:([A-Za-z0-9]+)\./);
  return match?.[1] ?? null;
}

function literalData(node, source) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return {
      fallback: node.getText(source),
      localeValue: node.text,
      options: null,
    };
  }

  if (!ts.isTemplateExpression(node)) return null;
  const optionEntries = [];
  let localeValue = node.head.text;

  for (const [index, span] of node.templateSpans.entries()) {
    const expression = span.expression.getText(source);
    if (/\+\+|--|\bawait\b|\bnew\b/.test(expression)) return null;
    optionEntries.push(`value${index}: ${expression}`);
    localeValue += `{{value${index}}}${span.literal.text}`;
  }

  return {
    fallback: node.getText(source),
    localeValue,
    options: `{ ${optionEntries.join(', ')} }`,
  };
}

function containsRawError(value) {
  return /(?:\berr(?:or)?|\be)\.message|\berrorMessage\b|instanceof\s+Error|String\(e\)/.test(
    value
  );
}

function getKnownKey(scope, value) {
  if (commonKeys.has(value)) return commonKeys.get(value);
  if (scope === 'pdfWorkflow' && workflowKeys.has(value)) {
    return workflowKeys.get(value);
  }
  return null;
}

function dynamicKey(scope, value) {
  const hash = crypto
    .createHash('sha1')
    .update(`${scope ?? 'common'}:${value}`)
    .digest('hex')
    .slice(0, 10);
  return scope ? `tools:${scope}.dynamic.${hash}` : `common.dynamic.${hash}`;
}

const exactChinese = new Map([
  ['PDF Files', 'PDF 文件'],
  ['Images', '图片'],
  ['Remove', '移除'],
  ['Unlock', '解锁'],
  ['Unlocking...', '正在解锁...'],
  ['Certificate Password', '证书密码'],
  ['Certificate unlocked', '证书已解锁'],
  ['Upload PDFs', '上传 PDF'],
  ['Add More Files', '添加更多文件'],
  ['Upload Images', '上传图片'],
  ['Add More Images', '添加更多图片'],
  ['Upload Certificate', '上传证书'],
  ['Change Certificate', '更换证书'],
  ['Search languages...', '搜索语言...'],
  ['Preview', '预览'],
  ['Rotate +90°', '旋转 +90°'],
  ['Initializing PDF engine...', '正在初始化 PDF 引擎...'],
  [
    'Could not load the PDF engine. Please refresh the page and try again.',
    '无法加载 PDF 引擎。请刷新页面后重试。',
  ],
  ['Initialization Error', '初始化失败'],
  ['Loading engine...', '正在加载转换引擎...'],
  ['Loading PDF engine...', '正在加载 PDF 引擎...'],
  ['Generating PDF...', '正在生成 PDF...'],
  ['Converting multiple files...', '正在转换多个文件...'],
  ['Converting emails...', '正在转换邮件...'],
  ['Conversion Complete', '转换完成'],
  ['Processing Complete', '处理完成'],
  ['Input Required', '需要输入'],
  ['Incorrect Password', '密码错误'],
  ['Password Error', '密码错误'],
  ['Decryption Failed', '解密失败'],
  ['Initializing decryption...', '正在初始化解密...'],
  ['Reading encrypted PDF...', '正在读取加密 PDF...'],
  ['Decrypting PDF...', '正在解密 PDF...'],
  ['Preparing download...', '正在准备下载...'],
  ['Generating ZIP file...', '正在生成 ZIP 文件...'],
  [
    'PDF decrypted successfully! Your download has started.',
    'PDF 已成功解密，下载已开始。',
  ],
  ['Please upload at least one PDF file.', '请至少上传一个 PDF 文件。'],
  ['Please enter the PDF password.', '请输入 PDF 密码。'],
  ['No File', '没有文件'],
]);

function toChinese(value) {
  if (exactChinese.has(value)) return exactChinese.get(value);
  if (/^Template "\{\{value0\}\}" saved\.$/.test(value))
    return '模板“{{value0}}”已保存。';
  if (/^Template "\{\{value0\}\}" loaded\.$/.test(value))
    return '模板“{{value0}}”已加载。';
  if (/^Successfully converted \{\{value0\}\} to PDF\.$/.test(value))
    return '已成功将 {{value0}} 转换为 PDF。';
  if (/^Successfully converted \{\{value0\}\} files to PDF\.$/.test(value))
    return '已成功将 {{value0}} 个文件转换为 PDF。';
  if (
    /^Converting \{\{value0\}\}\/\{\{value1\}\}: \{\{value2\}\}\.\.\.$/.test(
      value
    )
  )
    return '正在转换 {{value0}}/{{value1}}：{{value2}}...';
  if (/^Converting \{\{value0\}\}\.\.\.$/.test(value))
    return '正在转换 {{value0}}...';
  if (/^Parsing \{\{value0\}\}\.\.\.$/.test(value))
    return '正在解析 {{value0}}...';
  if (
    /^Decrypting \{\{value0\}\} \(\{\{value1\}\}\/\{\{value2\}\}\)\.\.\.$/.test(
      value
    )
  )
    return '正在解密 {{value0}}（{{value1}}/{{value2}}）...';
  if (/^Page \{\{value0\}\}(?: of \{\{value1\}\})?$/.test(value))
    return (
      value.replace('Page', '第').replace(' of ', ' / ') +
      (value.includes(' of ') ? ' 页' : ' 页')
    );
  if (/^Supported: /.test(value))
    return value.replace('Supported: ', '支持的格式：');
  if (/failed|error|unable|could not|invalid|wrong|incorrect/i.test(value))
    return '操作失败，请重试。';
  if (
    /loading|initializing|processing|converting|rendering|parsing|decrypting|generating|repairing/i.test(
      value
    )
  )
    return '正在处理中...';
  if (/upload/i.test(value)) return '上传文件';
  if (/download/i.test(value)) return '下载';
  if (/page/i.test(value)) return '页面';
  if (/certificate/i.test(value)) return '证书';
  if (/file/i.test(value)) return '文件';
  return '设置';
}

function relativeImportPath(file) {
  const directory = path.dirname(file).split('/').filter(Boolean);
  return `${directory.length > 2 ? '../' : './'}i18n/i18n`;
}

function ensureTranslateHelper(source, file) {
  if (/\bconst translate\s*=/.test(source)) return source;
  const importLine = `import { t } from '${relativeImportPath(file)}';\n`;
  const helper = `\nconst translate = (\n  key: string,\n  fallback: string,\n  options?: Record<string, unknown>\n) => {\n  const value = t(key, options);\n  return value && value !== key ? value : fallback;\n};\n`;
  return source.includes(' from ') &&
    /\bimport\s*\{[^}]*\bt\b[^}]*\}\s*from\s*['"][^'"]*\/i18n\//.test(source)
    ? `${helper}\n${source}`
    : `${importLine}${helper}\n${source}`;
}

const toolBundles = {
  en: JSON.parse(
    fs.readFileSync(path.join(root, 'public/locales/en/tools.json'), 'utf8')
  ),
  zh: JSON.parse(
    fs.readFileSync(path.join(root, 'public/locales/zh/tools.json'), 'utf8')
  ),
};
const commonBundles = {
  en: JSON.parse(
    fs.readFileSync(path.join(root, 'public/locales/en/common.json'), 'utf8')
  ),
  zh: JSON.parse(
    fs.readFileSync(path.join(root, 'public/locales/zh/common.json'), 'utf8')
  ),
};

for (const lang of ['en', 'zh']) {
  const bundle = commonBundles[lang];
  if (bundle.dynamic) {
    bundle.common ??= {};
    bundle.common.dynamic ??= {};
    Object.assign(bundle.common.dynamic, bundle.dynamic);
    delete bundle.dynamic;
  }
}

let replacementCount = 0;
const touched = [];

for (const requestedFile of requestedFiles) {
  const file = requestedFile.replace(/\\/g, '/');
  const filePath = path.join(root, file);
  const original = fs.readFileSync(filePath, 'utf8');
  const eol = original.includes('\r\n') ? '\r\n' : '\n';
  const source = normalize(original);
  const scope = resolveScope(file, source);
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const candidates = [];

  function addCandidate(node) {
    const data = literalData(node, ast);
    if (!data) return;
    const safeValue = containsRawError(data.localeValue)
      ? 'Processing failed. Please try again.'
      : data.localeValue;
    const known = getKnownKey(scope, safeValue);
    const key = known ?? dynamicKey(scope, safeValue);
    const fallback = containsRawError(data.localeValue)
      ? "'Processing failed. Please try again.'"
      : data.fallback;
    const options = containsRawError(data.localeValue) ? null : data.options;
    const replacement = `translate('${key}', ${fallback}${options ? `, ${options}` : ''})`;
    candidates.push({
      start: node.getStart(ast),
      end: node.getEnd(),
      replacement,
      key,
      value: safeValue,
      scope,
    });
  }

  function visit(node) {
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isPropertyAccessExpression(node.left)
    ) {
      const property = node.left.name.text;
      if (['textContent', 'placeholder', 'title'].includes(property))
        addCandidate(node.right);
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const indexes =
        node.expression.text === 'showAlert' ||
        node.expression.text === 'showModal'
          ? [0, 1]
          : node.expression.text === 'showLoader' ||
              node.expression.text === 'showToast'
            ? [0]
            : [];
      for (const index of indexes) {
        const arg = node.arguments[index];
        if (arg) addCandidate(arg);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);

  const unique = candidates
    .sort((a, b) => b.start - a.start)
    .filter(
      (candidate, index, all) =>
        index === 0 || candidate.start !== all[index - 1].start
    );

  if (unique.length === 0) continue;

  let next = source;
  for (const candidate of unique) {
    next = `${next.slice(0, candidate.start)}${candidate.replacement}${next.slice(candidate.end)}`;
    if (
      !candidate.key.startsWith('tools:') &&
      !candidate.key.startsWith('common.dynamic.')
    )
      continue;
    if (candidate.key.startsWith('tools:')) {
      const [, scopedKey] = candidate.key.split(':');
      const [tool, , hash] = scopedKey.split('.');
      toolBundles.en[tool] ??= {};
      toolBundles.zh[tool] ??= {};
      toolBundles.en[tool].dynamic ??= {};
      toolBundles.zh[tool].dynamic ??= {};
      toolBundles.en[tool].dynamic[hash] = candidate.value;
      toolBundles.zh[tool].dynamic[hash] = toChinese(candidate.value);
    } else {
      const hash = candidate.key.split('.')[2];
      commonBundles.en.common ??= {};
      commonBundles.zh.common ??= {};
      commonBundles.en.common.dynamic ??= {};
      commonBundles.zh.common.dynamic ??= {};
      commonBundles.en.common.dynamic[hash] = candidate.value;
      commonBundles.zh.common.dynamic[hash] = toChinese(candidate.value);
    }
  }

  next = ensureTranslateHelper(next, file);
  fs.writeFileSync(filePath, next.replace(/\n/g, eol));
  replacementCount += unique.length;
  touched.push(`${file} (${unique.length})`);
}

for (const lang of ['en', 'zh']) {
  fs.writeFileSync(
    path.join(root, `public/locales/${lang}/tools.json`),
    `${JSON.stringify(toolBundles[lang], null, 2)}\n`
  );
  fs.writeFileSync(
    path.join(root, `public/locales/${lang}/common.json`),
    `${JSON.stringify(commonBundles[lang], null, 2)}\n`
  );
}

console.log(`✔ 已接线 ${replacementCount} 处动态文案：${touched.join(', ')}`);
