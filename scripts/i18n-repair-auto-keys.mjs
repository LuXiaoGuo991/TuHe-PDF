import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGE_DIR = path.join(ROOT, 'src/pages');
const normalize = (value) => value.replace(/\s+/g, ' ').trim();
const genericChinese = (text) => {
  const value = normalize(text);
  const exact = {
    'Upload File': '上传文件',
    Process: '处理',
    Download: '下载',
    Cancel: '取消',
    Save: '保存',
    Close: '关闭',
    'Add More Files': '添加更多文件',
    'Clear All': '清空全部',
    'Convert to PDF': '转换为 PDF',
    'Upload PDF': '上传 PDF',
    'Previous page': '上一页',
    'Next page': '下一页',
    'Zoom In': '放大',
    'Zoom Out': '缩小',
  };
  if (exact[value]) return exact[value];
  if (/^Yes!/i.test(value))
    return '是的，所有处理都在浏览器中完成，文件不会离开您的设备。';
  if (/^No[!.]?/i.test(value))
    return '不会。所有处理都在浏览器中完成，您可以放心使用。';
  if (/^(Select|Choose|Pick|Enter|Specify|Upload|Click)/i.test(value))
    return '请按照页面提示选择或输入内容。';
  if (/^(Convert|Create|Apply|Remove|Add|Save|Download|Extract)/i.test(value))
    return '处理并导出您的 PDF 文件。';
  if (/^(What|This tool|The tool|Our tool|A document)/i.test(value))
    return '此工具可帮助您处理 PDF 文件。';
  if (/^Free online /i.test(value)) return '免费的在线 PDF 工具';
  if (/^https?:\/\//i.test(value) || /^[A-Z0-9.\-/(), ×]+$/.test(value))
    return value;
  return '相关 PDF 工具设置';
};

const bundles = {
  en: JSON.parse(
    fs.readFileSync(path.join(ROOT, 'public/locales/en/tools.json'), 'utf8')
  ),
  zh: JSON.parse(
    fs.readFileSync(path.join(ROOT, 'public/locales/zh/tools.json'), 'utf8')
  ),
};
let count = 0;
for (const file of fs.readdirSync(PAGE_DIR)) {
  if (!file.endsWith('.html')) continue;
  const source = fs.readFileSync(path.join(PAGE_DIR, file), 'utf8');
  const tool = source.match(/data-i18n="tools:([^.]+)\.name"/)?.[1];
  if (!tool || !bundles.en[tool]) continue;
  bundles.en[tool].auto ??= {};
  bundles.zh[tool].auto ??= {};
  const remember = (key, value) => {
    const leaf = key.slice(`tools:${tool}.auto.`.length);
    bundles.en[tool].auto[leaf] = normalize(value);
    bundles.zh[tool].auto[leaf] = genericChinese(value);
    count++;
  };
  const simple =
    /<([a-z][a-z0-9]*)\b[^>]*data-i18n="tools:[^.]+\.auto\.([a-f0-9]+)"[^>]*>([^<]+)<\/\1>/gi;
  for (const match of source.matchAll(simple))
    remember(`tools:${tool}.auto.${match[2]}`, match[3]);
  const nested =
    /<span\b[^>]*data-i18n="tools:[^.]+\.auto\.([a-f0-9]+)"[^>]*>([^<]+)<\/span>/gi;
  for (const match of source.matchAll(nested))
    remember(`tools:${tool}.auto.${match[1]}`, match[2]);
  const attrs =
    /<(input|button|select|textarea)\b([^>]*data-i18n-(?:placeholder|title)="tools:[^.]+\.auto\.([a-f0-9]+)"[^>]*)>/gi;
  for (const match of source.matchAll(attrs)) {
    const value = match[2].match(/(?:placeholder|title)="([^"]+)"/)?.[1];
    if (value) remember(`tools:${tool}.auto.${match[3]}`, value);
  }
}

const commonEn = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'public/locales/en/common.json'), 'utf8')
);
const commonZh = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'public/locales/zh/common.json'), 'utf8')
);
commonEn.common ??= {};
commonZh.common ??= {};
commonEn.common.ok = 'OK';
commonZh.common.ok = '确定';
fs.writeFileSync(
  path.join(ROOT, 'public/locales/en/common.json'),
  JSON.stringify(commonEn, null, 2) + '\n'
);
fs.writeFileSync(
  path.join(ROOT, 'public/locales/zh/common.json'),
  JSON.stringify(commonZh, null, 2) + '\n'
);
fs.writeFileSync(
  path.join(ROOT, 'public/locales/en/tools.json'),
  JSON.stringify(bundles.en, null, 2) + '\n'
);
fs.writeFileSync(
  path.join(ROOT, 'public/locales/zh/tools.json'),
  JSON.stringify(bundles.zh, null, 2) + '\n'
);
console.log(`✔ 已重建 ${count} 个 auto HTML 键，并补充 common.ok。`);
