// 一次性迁移：merge-pdf-page.ts 动态文案 i18n 接线
// 每处替换要求唯一命中（或指定次数），失败即整体中止不写文件。
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'src/js/logic/merge-pdf-page.ts');

const EDITS = [
  [
    'showLoader(`Rendering page previews...`)',
    "showLoader(translate('tools:mergePdf.renderingPreviews', 'Rendering page previews...'))",
    1,
  ],
  [
    "showAlert('Error', 'Failed to render page thumbnails')",
    "showAlert(translate('alert.error', 'Error'), translate('tools:mergePdf.renderFailed', 'Failed to render page thumbnails'))",
    1,
  ],
  [
    "showLoader('Merging PDFs...')",
    "showLoader(translate('tools:mergePdf.merging', 'Merging PDFs...'))",
    1,
  ],
  [
    "showAlert('Error', 'No files or pages selected to merge.')",
    "showAlert(translate('alert.error', 'Error'), translate('tools:mergePdf.nothingSelected', 'No files or pages selected to merge.'))",
    1,
  ],
  [
    `showAlert(
          'Success',
          'PDFs merged successfully!',
          'success',`,
    `showAlert(
          translate('alert.success', 'Success'),
          translate('tools:mergePdf.mergeSuccess', 'PDFs merged successfully!'),
          'success',`,
    1,
  ],
  [
    "showAlert('Error', e.data.message || 'Failed to merge PDFs.')",
    "showAlert(translate('alert.error', 'Error'), e.data.message || translate('tools:mergePdf.mergeFailed', 'Failed to merge PDFs.'))",
    1,
  ],
  [
    "showAlert('Error', 'An unexpected error occurred in the merge worker.')",
    "showAlert(translate('alert.error', 'Error'), translate('tools:mergePdf.workerError', 'An unexpected error occurred in the merge worker.'))",
    1,
  ],
  [
    `showAlert(
      'Error',
      'Failed to merge PDFs. Please check that all files are valid and not password-protected.'
    )`,
    `showAlert(
      translate('alert.error', 'Error'),
      translate('tools:mergePdf.invalidFiles', 'Failed to merge PDFs. Please check that all files are valid and not password-protected.')
    )`,
    1,
  ],
  [
    "showLoader('Loading PDF documents...')",
    "showLoader(translate('tools:mergePdf.loadingPdfs', 'Loading PDF documents...'))",
    2,
  ],
  [
    "showAlert('Error', 'Failed to load one or more PDF files')",
    "showAlert(translate('alert.error', 'Error'), translate('tools:mergePdf.loadFailed', 'Failed to load one or more PDF files'))",
    1,
  ],
  [
    'label.textContent = `Pages (e.g., 1-3, 5) - Total: ${pageCount}`;',
    "label.textContent = translate('tools:mergePdf.pagesRangeLabel', `Pages (e.g., 1-3, 5) - Total: ${pageCount}`, { total: pageCount });",
    1,
  ],
  [
    "input.placeholder = 'Leave blank for all pages';",
    "input.placeholder = translate('tools:mergePdf.rangePlaceholder', 'Leave blank for all pages');",
    1,
  ],
  [
    "deleteBtn.title = 'Remove file';",
    "deleteBtn.title = translate('tools:mergePdf.removeFile', 'Remove file');",
    1,
  ],
];

let s = fs.readFileSync(FILE, 'utf8');
// 文件是 CRLF 行尾：替换模式中的 \n 统一转换为 \r\n 以精确匹配
const eol = s.includes('\r\n') ? '\r\n' : '\n';
const toEol = (str) => (eol === '\n' ? str : str.replace(/\n/g, eol));
let errors = 0;
for (const [oldRaw, newRaw, expected] of EDITS) {
  const oldStr = toEol(oldRaw);
  const newStr = toEol(newRaw);
  const count = s.split(oldStr).length - 1;
  if (count !== expected) {
    console.error(
      `✘ 期望 ${expected} 实际 ${count}: ${JSON.stringify(oldStr.slice(0, 60))}`
    );
    errors++;
  } else {
    s = s.split(oldStr).join(newStr);
  }
}
if (errors > 0) {
  console.error('中止，未写入任何文件');
  process.exit(1);
}
fs.writeFileSync(FILE, s);
console.log(`✔ merge-pdf-page.ts 完成 ${EDITS.length} 组替换`);

// 合并 en/zh 翻译键
const NEW_KEYS = {
  common: {
    en: { alert: { error: 'Error', success: 'Success' } },
    zh: { alert: { error: '错误', success: '成功' } },
  },
  tools: {
    en: {
      mergePdf: {
        renderingPreviews: 'Rendering page previews...',
        renderFailed: 'Failed to render page thumbnails',
        merging: 'Merging PDFs...',
        nothingSelected: 'No files or pages selected to merge.',
        mergeSuccess: 'PDFs merged successfully!',
        mergeFailed: 'Failed to merge PDFs.',
        workerError: 'An unexpected error occurred in the merge worker.',
        invalidFiles:
          'Failed to merge PDFs. Please check that all files are valid and not password-protected.',
        loadingPdfs: 'Loading PDF documents...',
        loadFailed: 'Failed to load one or more PDF files',
        pagesRangeLabel: 'Pages (e.g., 1-3, 5) - Total: {{total}}',
        rangePlaceholder: 'Leave blank for all pages',
        removeFile: 'Remove file',
        pageLabel: 'Page {{page}}',
        filePageTitle: '{{name}} (page {{page}})',
      },
    },
    zh: {
      mergePdf: {
        renderingPreviews: '正在渲染页面预览...',
        renderFailed: '页面缩略图渲染失败',
        merging: '正在合并 PDF...',
        nothingSelected: '没有选择要合并的文件或页面。',
        mergeSuccess: 'PDF 合并成功！',
        mergeFailed: 'PDF 合并失败。',
        workerError: '合并 worker 发生意外错误。',
        invalidFiles: 'PDF 合并失败。请检查所有文件是否有效且未加密。',
        loadingPdfs: '正在加载 PDF 文档...',
        loadFailed: '一个或多个 PDF 文件加载失败',
        pagesRangeLabel: '页码（如 1-3, 5）- 共 {{total}} 页',
        rangePlaceholder: '留空表示全部页面',
        removeFile: '移除文件',
        pageLabel: '第 {{page}} 页',
        filePageTitle: '{{name}}（第 {{page}} 页）',
      },
    },
  },
};

const mergeInto = (target, addition, keyPath, label) => {
  for (const [key, value] of Object.entries(addition)) {
    const current = keyPath ? `${keyPath}.${key}` : key;
    if (value && typeof value === 'object') {
      if (target[key] === undefined) target[key] = {};
      mergeInto(target[key], value, current, label);
    } else if (target[key] !== undefined) {
      console.error(`✘ ${label}: 键已存在 ${current}`);
      errors++;
    } else {
      target[key] = value;
    }
  }
};

for (const ns of ['common', 'tools']) {
  for (const lang of ['en', 'zh']) {
    const p = path.join(ROOT, `public/locales/${lang}/${ns}.json`);
    const json = JSON.parse(fs.readFileSync(p, 'utf8'));
    mergeInto(json, NEW_KEYS[ns][lang], '', `${lang}/${ns}.json`);
    fs.writeFileSync(p, JSON.stringify(json, null, 2) + '\n');
  }
}
if (errors > 0) {
  console.error('翻译键合并出错');
  process.exit(1);
}
console.log('✔ en/zh 翻译键已合并');
