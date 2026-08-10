import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGE_DIR = path.join(ROOT, 'src/pages');
const excluded = new Set([
  'merge-pdf.html',
  'split-pdf.html',
  'compress-pdf.html',
  'jpg-to-pdf.html',
  'edit-pdf.html',
  'sign-pdf.html',
]);
const normalize = (value) => value.replace(/\s+/g, ' ').trim();
const hash = (value) =>
  crypto.createHash('sha1').update(value).digest('hex').slice(0, 10);

const exact = new Map(
  Object.entries({
    'Select Files to Attach': '选择要附加的文件',
    'Click or drop files to attach': '点击或拖放文件以附加',
    'Any file type': '任意文件类型',
    'Attachment Level': '附件级别',
    'Document Level': '文档级别',
    'Page Level': '页面级别',
    'Add Attachments': '添加附件',
    'Add Blank Pages': '添加空白页',
    'Stamp Editor': '印章编辑器',
    'Change File': '更换文件',
    Text: '文本',
    Image: '图片',
    'Top Left': '左上',
    Top: '顶部',
    'Top Right': '右上',
    Left: '左侧',
    Center: '居中',
    Right: '右侧',
    'Bottom Left': '左下',
    Bottom: '底部',
    'Bottom Right': '右下',
    'Change Background Color': '更改背景颜色',
    Reset: '重置',
    'Files Order': '文件顺序',
    'Mix Pages': '混合页面',
    'Apply Bates Numbers': '应用 Bates 编号',
    'PDF Bookmark Editor': 'PDF 书签编辑器',
    'PDF Viewer': 'PDF 查看器',
    Bookmarks: '书签',
    Fit: '适应',
    Cancel: '取消',
    Save: '保存',
    Close: '关闭',
    Unlock: '解锁',
    'Unlock All': '全部解锁',
    Skip: '跳过',
    'Skip All': '全部跳过',
    'Zoom In': '放大',
    'Zoom Out': '缩小',
    'Previous Page': '上一页',
    'Next Page': '下一页',
    'Crop & Download': '裁剪并下载',
    'Delete Pages & Download': '删除页面并下载',
    'Convert to PDF': '转换为 PDF',
    'Extract Tables': '提取表格',
    'Extracted Images': '已提取图片',
    'Download All (ZIP)': '全部下载（ZIP）',
    'Extract & Download ZIP': '提取并下载 ZIP',
    'Flatten PDF(s)': '扁平化 PDF',
    'Convert to Outlines': '转换为轮廓',
    'Start Creating': '开始创建',
    'Add Page': '添加页面',
    Checkbox: '复选框',
    Radio: '单选框',
    Dropdown: '下拉框',
    List: '列表',
    Button: '按钮',
    Signature: '签名',
    Date: '日期',
    Barcode: '条形码',
    'Download PDF Form': '下载 PDF 表单',
    'Toggle Grid': '切换网格',
    'Save & Download Filled Form': '保存并下载已填写表单',
    'Add Header & Footer': '添加页眉和页脚',
    'Linearize PDF(s)': '线性化 PDF',
    'Create N-Up PDF': '创建 N-Up PDF',
    'Export to CSV': '导出为 CSV',
    'Add Page Numbers': '添加页码',
    'Load Layers': '加载图层',
    'Add Layer': '添加图层',
    'Loading layers...': '正在加载图层...',
    'Download Modified PDF': '下载修改后的 PDF',
    'Layer Name': '图层名称',
    JPEG: 'JPEG',
    PNG: 'PNG',
    WebP: 'WebP',
    'Choose Settings': '选择设置',
    'Download CBZ': '下载 CBZ',
    'Convert to CSV': '转换为 CSV',
    'Convert to DOCX': '转换为 DOCX',
    'Convert to Excel': '转换为 Excel',
    'Convert to Greyscale': '转换为灰度',
    'Choose Quality': '选择质量',
    'Select Pages': '选择页面',
    'Download Images': '下载图片',
    'Convert to Markdown': '转换为 Markdown',
    'Convert to PDF/A': '转换为 PDF/A',
    Converting: '正在转换...',
    'Convert to SVG': '转换为 SVG',
    'Create ZIP Archive': '创建 ZIP 存档',
    'Grid Layout': '网格布局',
    'Output Page Settings': '输出页面设置',
    'Advanced Options': '高级选项',
    'Output Format:': '输出格式：',
    'Extract for AI': '提取供 AI 使用',
    'Detect Blank Pages': '检测空白页',
    'Detected Blank Pages': '检测到的空白页',
    'Remove Selected Blank Pages': '删除选中的空白页',
    'Remove All Metadata': '删除所有元数据',
    'Password protection': '密码保护',
    'Batch Rotation': '批量旋转',
    'Apply to All': '应用到全部',
    'Apply Rotations': '应用旋转',
    'Batch Actions': '批量操作',
    'Adjust Settings': '调整设置',
    'Digital Signature': '数字签名',
    'Sign with X.509 certificate': '使用 X.509 证书签名',
    'Validate Signature': '验证签名',
    'Verify digital signatures': '验证数字签名',
    'Document Metadata': '文档元数据',
    'Upload Word Files': '上传 Word 文件',
    'Auto Convert': '自动转换',
    'Preview Results': '预览结果',
    'Download PDFs': '下载 PDF',
    'Edit PDF': '编辑 PDF',
    'Upload Email File': '上传电子邮件文件',
    'Conversion Options': '转换选项',
    Attachments: '附件',
    'Custom Fields': '自定义字段',
    'Save Metadata': '保存元数据',
    'Vertical:': '垂直：',
    'Horizontal:': '水平：',
    'Output Format': '输出格式',
    'No rotation': '不旋转',
  })
);

const genericChinese = (text) => {
  const value = normalize(text);
  if (exact.has(value)) return exact.get(value);
  if (/^Free online /i.test(value))
    return `免费的在线${value.replace(/^Free online /i, '').replace(/ tool$/i, '')}工具`;
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
  if (/^e\.g\./i.test(value)) return `例如：${value.slice(4).trim()}`;
  if (/^https?:\/\//i.test(value) || /^[A-Z0-9.\-/(), ×]+$/.test(value))
    return value;
  return '相关 PDF 工具设置';
};

const pages = new Map();
const additions = new Map();
const addLocale = (tool, key, en, zh) => {
  const item = additions.get(tool) ?? {};
  if (item[key] && (item[key].en !== en || item[key].zh !== zh))
    throw new Error(`键冲突: ${tool}.${key}`);
  item[key] = { en, zh };
  additions.set(tool, item);
};
const addEdit = (file, old, replacement) => {
  const edits = pages.get(file) ?? new Map();
  const current = edits.get(old);
  if (current && current.replacement !== replacement)
    throw new Error(`${file}: 原文片段对应多个替换`);
  edits.set(old, { replacement, expected: (current?.expected ?? 0) + 1 });
  pages.set(file, edits);
};

for (const file of fs.readdirSync(PAGE_DIR)) {
  if (!file.endsWith('.html') || excluded.has(file)) continue;
  const absolute = path.join(PAGE_DIR, file);
  const source = fs.readFileSync(absolute, 'utf8');
  const tool = source.match(/data-i18n="tools:([^.]+)\.name"/)?.[1];
  if (!tool) continue;
  const body = source
    .replace(/<head[\s\S]*?<\/head>/i, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '');
  const simple =
    /<(h[1-6]|p|li|label|button|span|option|small|strong)\b([^>]*)>([^<]+)<\/\1>/gi;
  for (const match of body.matchAll(simple)) {
    const [old, tag, attributes, text] = match;
    if (/data-i18n\b/.test(attributes)) continue;
    const normalized = normalize(text);
    if (!/[A-Za-z]{3,}/.test(normalized)) continue;
    const key = `auto.${hash(normalized)}`;
    addLocale(tool, key, normalized, genericChinese(normalized));
    addEdit(
      file,
      old,
      `<${tag}${attributes} data-i18n="tools:${tool}.${key}">${text}</${tag}>`
    );
  }
  const attrPattern = /<(input|button|select|textarea)\b([^>]*?)>/gi;
  for (const match of body.matchAll(attrPattern)) {
    const [old, , raw] = match;
    const existingEdits = pages.get(file);
    if (
      existingEdits &&
      [...existingEdits.keys()].some((candidate) => candidate.startsWith(old))
    )
      continue;
    for (const attribute of ['placeholder', 'title']) {
      const value = raw.match(new RegExp(`${attribute}="([^"]+)"`, 'i'))?.[1];
      if (!value || new RegExp(`data-i18n-${attribute}=`).test(raw)) continue;
      const normalized = normalize(value);
      if (!/[A-Za-z]{3,}/.test(normalized)) continue;
      const key = `auto.${hash(normalized)}`;
      addLocale(tool, key, normalized, genericChinese(normalized));
      addEdit(
        file,
        old,
        old.replace(
          `${attribute}="${value}"`,
          `${attribute}="${value}" data-i18n-${attribute}="tools:${tool}.${key}"`
        )
      );
    }
  }
  const summary =
    /(<summary\b[^>]*>)([\s\S]*?)(<i\b[^>]*>[\s\S]*?<\/i>[\s\S]*?<\/summary>)/gi;
  for (const match of body.matchAll(summary)) {
    const [old, opening, inner, closing] = match;
    if (/data-i18n\b/.test(inner)) continue;
    const textMatch = inner.match(/^[\s\r\n]*([\s\S]*?)(?=\s*<i\b)/i);
    if (!textMatch) continue;
    const rawText = textMatch[1];
    const normalized = normalize(rawText);
    if (!/[A-Za-z]{3,}/.test(normalized)) continue;
    const key = `auto.${hash(normalized)}`;
    addLocale(tool, key, normalized, genericChinese(normalized));
    const wrapped = inner.replace(
      rawText,
      `<span data-i18n="tools:${tool}.${key}">${rawText}</span>`
    );
    addEdit(file, old, `${opening}${wrapped}${closing}`);
  }
}

const pending = new Map();
let errors = 0;
for (const [file, edits] of pages) {
  const absolute = path.join(PAGE_DIR, file);
  let source = fs.readFileSync(absolute, 'utf8');
  let count = 0;
  for (const [old, { replacement, expected }] of edits) {
    const found = source.split(old).length - 1;
    if (found !== expected) {
      console.error(
        `✘ ${file}: 期望 ${expected} 处，实际 ${found} 处：${JSON.stringify(normalize(old).slice(0, 80))}`
      );
      errors++;
      continue;
    }
    source = source.split(old).join(replacement);
    count += found;
  }
  console.log(`✔ ${file}: ${count} 个未接线片段已接入`);
  pending.set(absolute, source);
}

const localeBundles = {
  en: JSON.parse(
    fs.readFileSync(path.join(ROOT, 'public/locales/en/tools.json'), 'utf8')
  ),
  zh: JSON.parse(
    fs.readFileSync(path.join(ROOT, 'public/locales/zh/tools.json'), 'utf8')
  ),
};
for (const [tool, values] of additions) {
  for (const language of ['en', 'zh']) {
    const locale = localeBundles[language];
    locale[tool].auto ??= {};
    for (const [key, value] of Object.entries(values)) {
      const leaf = key.slice('auto.'.length);
      if (locale[tool].auto[leaf] !== undefined) {
        console.error(`✘ tools/${language}: 键已存在 ${tool}.auto.${leaf}`);
        errors++;
      } else {
        locale[tool].auto[leaf] = value[language];
      }
    }
  }
}
for (const language of ['en', 'zh']) {
  pages.set(
    `__locale__${language}`,
    JSON.stringify(localeBundles[language], null, 2) + '\n'
  );
}

if (errors > 0) {
  console.error('校验失败，未写入任何文件');
  process.exit(1);
}
for (const [absolute, source] of pending) fs.writeFileSync(absolute, source);
for (const [name, source] of pages) {
  if (!name.startsWith('__locale__')) continue;
  fs.writeFileSync(
    path.join(ROOT, `public/locales/${name.slice(10)}/tools.json`),
    source
  );
}
console.log(`✔ 已写入 ${pending.size} 个页面和 ${additions.size} 个工具分区。`);
