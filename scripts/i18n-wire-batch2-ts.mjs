// 一次性迁移（批 2）：split/compress/jpg-to/edit/sign 五个工具的 TS 动态文案 i18n 接线
// 规则同批 1：每处替换要求唯一命中（或指定次数），失败即整体中止不写文件；CRLF 行尾自适应。
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const HELPER = `
const translate = (
  key: string,
  fallback: string,
  options?: Record<string, unknown>
) => {
  const translation = t(key, options);
  return translation && translation !== key ? translation : fallback;
};
`;

// [old, new, expectedCount]
const EDITS = {
  'src/js/logic/split-pdf-page.ts': {
    helperAfter: "import { t } from '../i18n/i18n';",
    edits: [
      [
        'metaSpan.textContent = `${formatBytes(file.size)} • ${pageCount} pages`;',
        "metaSpan.textContent = `${formatBytes(file.size)} • ${translate('common.filePages', `${pageCount} pages`, { count: pageCount })}`;",
        1,
      ],
      [
        "showAlert('Error', 'Failed to load PDF file.');",
        "showAlert(translate('alert.error', 'Error'), translate('tools:splitPdf.loadFailed', 'Failed to load PDF file.'));",
        1,
      ],
      [
        "showLoader('Rendering page previews...');",
        "showLoader(translate('tools:splitPdf.renderingPreviews', 'Rendering page previews...'));",
        3,
      ],
      [
        'showLoader(`Rendering page previews: ${current}/${total}`);',
        "showLoader(translate('tools:splitPdf.renderingProgress', `Rendering page previews: ${current}/${total}`, { current, total }));",
        1,
      ],
      [
        "showAlert('Error', 'Failed to render page previews.');",
        "showAlert(translate('alert.error', 'Error'), translate('tools:splitPdf.renderFailed', 'Failed to render page previews.'));",
        1,
      ],
      [
        "showLoader('Splitting PDF...');",
        "showLoader(translate('tools:splitPdf.splitting', 'Splitting PDF...'));",
        1,
      ],
      [
        "showAlert('Success', 'PDF split successfully!', 'success', () => {",
        "showAlert(translate('alert.success', 'Success'), translate('tools:splitPdf.splitSuccess', 'PDF split successfully!'), 'success', () => {",
        3,
      ],
      [
        "showLoader('Creating ZIP file...');",
        "showLoader(translate('tools:splitPdf.creatingZip', 'Creating ZIP file...'));",
        1,
      ],
      [
        `showAlert(
        'Error',
        e instanceof Error
          ? e.message
          : 'Failed to split PDF. Please check your selection.'
      );`,
        `showAlert(
        translate('alert.error', 'Error'),
        e instanceof Error
          ? e.message
          : translate('tools:splitPdf.splitFailed', 'Failed to split PDF. Please check your selection.')
      );`,
        1,
      ],
      [
        "outputSeparateLabel.textContent = 'One PDF per range';",
        "outputSeparateLabel.textContent = translate('tools:splitPdf.outputSeparate', 'One PDF per range');",
        1,
      ],
      [
        "outputSeparateLabel.textContent = 'One PDF per page';",
        "outputSeparateLabel.textContent = translate('tools:splitPdf.outputSeparatePerPage', 'One PDF per page');",
        1,
      ],
      [
        'warningText.textContent = `The PDF has ${totalPages} pages, which is not evenly divisible by ${nValue}. The last PDF will contain ${remainder} page(s).`;',
        "warningText.textContent = translate('tools:splitPdf.nTimesWarning', `The PDF has ${totalPages} pages, which is not evenly divisible by ${nValue}. The last PDF will contain ${remainder} page(s).`, { total: totalPages, n: nValue, remainder });",
        1,
      ],
      [
        "throw new Error('N must be at least 1.');",
        "throw new Error(translate('tools:splitPdf.nMinError', 'N must be at least 1.'));",
        1,
      ],
      [
        "throw new Error('No pages were selected for splitting.');",
        "throw new Error(translate('tools:splitPdf.noPagesSelected', 'No pages were selected for splitting.'));",
        1,
      ],
      [
        "if (!state.pdfDoc) throw new Error('No PDF document loaded.');",
        "if (!state.pdfDoc) throw new Error(translate('tools:splitPdf.noPdfLoaded', 'No PDF document loaded.'));",
        1,
      ],
    ],
  },

  'src/js/logic/compress-pdf-page.ts': {
    importAfter:
      "import { showLoader, hideLoader, showAlert } from '../ui.js';",
    edits: [
      [
        "showLoader('Running Photon compression...');",
        "showLoader(translate('tools:compressPdf.photonRunning', 'Running Photon compression...'));",
        2,
      ],
      [
        "showAlert('No Files', 'Please select at least one PDF file.');",
        "showAlert(translate('alert.noFiles', 'No Files'), translate('tools:compressPdf.selectPdfs', 'Please select at least one PDF file.'));",
        1,
      ],
      [
        "showLoader('Running Condense compression...');",
        "showLoader(translate('tools:compressPdf.condenseRunning', 'Running Condense compression...'));",
        1,
      ],
      [
        "' (without image optimization due to unsupported patterns)';",
        "translate('tools:compressPdf.fallbackSuffix', ' (without image optimization due to unsupported patterns)');",
        1,
      ],
      [
        `showAlert(
            'Compression Complete',
            \`Method: \${usedMethod}. File size reduced from \${originalSize} to \${compressedSize} (Saved \${savingsPercent}%).\`,
            'success',`,
        `showAlert(
            translate('tools:compressPdf.completeTitle', 'Compression Complete'),
            translate('tools:compressPdf.completeMsg', \`Method: \${usedMethod}. File size reduced from \${originalSize} to \${compressedSize} (Saved \${savingsPercent}%).\`, { method: usedMethod, original: originalSize, compressed: compressedSize, percent: savingsPercent }),
            'success',`,
        1,
      ],
      [
        `showAlert(
            'Compression Finished',
            \`Method: \${usedMethod}. Could not reduce file size further. Original: \${originalSize}, New: \${compressedSize}.\`,
            'warning',`,
        `showAlert(
            translate('tools:compressPdf.finishedTitle', 'Compression Finished'),
            translate('tools:compressPdf.finishedMsg', \`Method: \${usedMethod}. Could not reduce file size further. Original: \${originalSize}, New: \${compressedSize}.\`, { method: usedMethod, original: originalSize, compressed: compressedSize }),
            'warning',`,
        1,
      ],
      [
        "showLoader('Compressing multiple PDFs...');",
        "showLoader(translate('tools:compressPdf.compressingMultiple', 'Compressing multiple PDFs...'));",
        1,
      ],
      [
        `showLoader(
            \`Compressing \${i + 1}/\${state.files.length}: \${file.name}...\`
          );`,
        `showLoader(
            translate('tools:compressPdf.compressingProgress', \`Compressing \${i + 1}/\${state.files.length}: \${file.name}...\`, { current: i + 1, total: state.files.length, name: file.name })
          );`,
        1,
      ],
      [
        `showAlert(
            'Compression Complete',
            \`Compressed \${state.files.length} PDF(s). Total size reduced from \${formatBytes(totalOriginalSize)} to \${formatBytes(totalCompressedSize)} (Saved \${totalSavingsPercent}%).\`,
            'success',`,
        `showAlert(
            translate('tools:compressPdf.completeTitle', 'Compression Complete'),
            translate('tools:compressPdf.batchCompleteMsg', \`Compressed \${state.files.length} PDF(s). Total size reduced from \${formatBytes(totalOriginalSize)} to \${formatBytes(totalCompressedSize)} (Saved \${totalSavingsPercent}%).\`, { count: state.files.length, original: formatBytes(totalOriginalSize), compressed: formatBytes(totalCompressedSize), percent: totalSavingsPercent }),
            'success',`,
        1,
      ],
      [
        `showAlert(
            'Compression Finished',
            \`Compressed \${state.files.length} PDF(s). Total size: \${formatBytes(totalCompressedSize)}.\`,
            'info',`,
        `showAlert(
            translate('tools:compressPdf.finishedTitle', 'Compression Finished'),
            translate('tools:compressPdf.batchFinishedMsg', \`Compressed \${state.files.length} PDF(s). Total size: \${formatBytes(totalCompressedSize)}.\`, { count: state.files.length, compressed: formatBytes(totalCompressedSize) }),
            'info',`,
        1,
      ],
      [
        `showAlert(
        'Error',
        \`An error occurred during compression. Error: \${e instanceof Error ? e.message : String(e)}\`
      );`,
        `showAlert(
        translate('alert.error', 'Error'),
        translate('tools:compressPdf.errorMsg', \`An error occurred during compression. Error: \${e instanceof Error ? e.message : String(e)}\`, { error: e instanceof Error ? e.message : String(e) })
      );`,
        1,
      ],
    ],
  },

  'src/js/logic/edit-pdf-page.ts': {
    importAfter:
      "import { showAlert, showLoader, hideLoader } from '../ui.js';",
    edits: [
      [
        "showAlert('Invalid File', 'Please upload a valid PDF file.');",
        "showAlert(translate('alert.invalidFile', 'Invalid File'), translate('tools:pdfEditor.invalidFileMsg', 'Please upload a valid PDF file.'));",
        1,
      ],
      [
        "showLoader('Loading PDF Editor...');",
        "showLoader(translate('tools:pdfEditor.loadingEditor', 'Loading PDF Editor...'));",
        2,
      ],
      [
        "downloadBtn.textContent = 'Download Edited PDF';",
        "downloadBtn.textContent = translate('tools:pdfEditor.downloadEdited', 'Download Edited PDF');",
        1,
      ],
      [
        "showAlert('Error', 'Failed to download the edited PDF.');",
        "showAlert(translate('alert.error', 'Error'), translate('tools:pdfEditor.downloadFailed', 'Failed to download the edited PDF.'));",
        1,
      ],
      [
        "showAlert('Error', 'Failed to load the PDF Editor.');",
        "showAlert(translate('alert.error', 'Error'), translate('tools:pdfEditor.loadFailed', 'Failed to load the PDF Editor.'));",
        1,
      ],
    ],
  },

  'src/js/logic/jpg-to-pdf-page.ts': {
    importAfter:
      "import { showAlert, showLoader, hideLoader } from '../ui.js';",
    edits: [
      [
        `showAlert(
      'Invalid Files',
      'Some files were skipped. Only JPG, JPEG, JP2, and JPX files are allowed.'
    );`,
        `showAlert(
      translate('tools:jpgToPdf.invalidFilesTitle', 'Invalid Files'),
      translate('tools:jpgToPdf.invalidFilesMsg', 'Some files were skipped. Only JPG, JPEG, JP2, and JPX files are allowed.')
    );`,
        1,
      ],
      [
        "showAlert('No Files', 'Please select at least one JPG or JPEG2000 image.');",
        "showAlert(translate('alert.noFiles', 'No Files'), translate('tools:jpgToPdf.noFilesMsg', 'Please select at least one JPG or JPEG2000 image.'));",
        1,
      ],
      [
        "showLoader('Loading engine...');",
        "showLoader(translate('tools:jpgToPdf.loadingEngine', 'Loading engine...'));",
        1,
      ],
      [
        "showLoader('Converting images to PDF...');",
        "showLoader(translate('tools:jpgToPdf.converting', 'Converting images to PDF...'));",
        1,
      ],
      [
        "showAlert('Success', 'PDF created successfully!', 'success', () => {",
        "showAlert(translate('alert.success', 'Success'), translate('tools:jpgToPdf.createSuccess', 'PDF created successfully!'), 'success', () => {",
        1,
      ],
      [
        `showAlert(
      'Conversion Error',
      e instanceof Error ? e.message : 'Failed to convert images to PDF.'
    );`,
        `showAlert(
      translate('tools:jpgToPdf.conversionErrorTitle', 'Conversion Error'),
      e instanceof Error ? e.message : translate('tools:jpgToPdf.convertFailed', 'Failed to convert images to PDF.')
    );`,
        1,
      ],
    ],
  },

  'src/js/logic/sign-pdf-page.ts': {
    helperAfter: "import { t } from '../i18n/i18n';",
    edits: [
      [
        "showAlert('Invalid File', 'Please select a PDF file.');",
        "showAlert(translate('alert.invalidFile', 'Invalid File'), translate('tools:signPdf.invalidFileMsg', 'Please select a PDF file.'));",
        1,
      ],
      [
        'metaSpan.textContent = `${formatBytes(result.file.size)} • ${result.pdf.numPages} pages`;',
        "metaSpan.textContent = `${formatBytes(result.file.size)} • ${translate('common.filePages', `${result.pdf.numPages} pages`, { count: result.pdf.numPages })}`;",
        1,
      ],
      [
        "showLoader('Loading PDF viewer...');",
        "showLoader(translate('tools:signPdf.loadingViewer', 'Loading PDF viewer...'));",
        1,
      ],
      [
        "showAlert('Viewer not ready', 'Please wait for the PDF viewer to load.');",
        "showAlert(translate('tools:signPdf.viewerNotReadyTitle', 'Viewer not ready'), translate('tools:signPdf.viewerWaitMsg', 'Please wait for the PDF viewer to load.'));",
        1,
      ],
      [
        "showAlert('Viewer not ready', 'The PDF viewer is still initializing.');",
        "showAlert(translate('tools:signPdf.viewerNotReadyTitle', 'Viewer not ready'), translate('tools:signPdf.viewerInitMsg', 'The PDF viewer is still initializing.'));",
        1,
      ],
      [
        "showLoader('Flattening and saving PDF...');",
        "showLoader(translate('tools:signPdf.flattenSaving', 'Flattening and saving PDF...'));",
        1,
      ],
      [
        "showAlert('Success', 'Signed PDF saved successfully!', 'success', () => {",
        "showAlert(translate('alert.success', 'Success'), translate('tools:signPdf.saveSuccess', 'Signed PDF saved successfully!'), 'success', () => {",
        1,
      ],
      [
        `showAlert(
        'Success',
        'Signed PDF downloaded successfully!',
        'success',`,
        `showAlert(
        translate('alert.success', 'Success'),
        translate('tools:signPdf.downloadSuccess', 'Signed PDF downloaded successfully!'),
        'success',`,
        1,
      ],
      [
        `showAlert(
      'Export failed',
      'Could not export the signed PDF. Please try again.'
    );`,
        `showAlert(
      translate('tools:signPdf.exportFailedTitle', 'Export failed'),
      translate('tools:signPdf.exportFailedMsg', 'Could not export the signed PDF. Please try again.')
    );`,
        1,
      ],
    ],
  },
};

/* ---------------- 新增翻译键 ---------------- */
const NEW_KEYS = {
  common: {
    en: {
      common: { filePages: '{{count}} pages' },
      alert: { noFiles: 'No Files', invalidFile: 'Invalid File' },
    },
    zh: {
      common: { filePages: '共 {{count}} 页' },
      alert: { noFiles: '未选择文件', invalidFile: '无效文件' },
    },
  },
  tools: {
    en: {
      splitPdf: {
        loadFailed: 'Failed to load PDF file.',
        renderingPreviews: 'Rendering page previews...',
        renderingProgress: 'Rendering page previews: {{current}}/{{total}}',
        renderFailed: 'Failed to render page previews.',
        splitting: 'Splitting PDF...',
        splitSuccess: 'PDF split successfully!',
        creatingZip: 'Creating ZIP file...',
        splitFailed: 'Failed to split PDF. Please check your selection.',
        outputSeparatePerPage: 'One PDF per page',
        nTimesWarning:
          'The PDF has {{total}} pages, which is not evenly divisible by {{n}}. The last PDF will contain {{remainder}} page(s).',
        nMinError: 'N must be at least 1.',
        noPagesSelected: 'No pages were selected for splitting.',
        noPdfLoaded: 'No PDF document loaded.',
      },
      compressPdf: {
        photonRunning: 'Running Photon compression...',
        selectPdfs: 'Please select at least one PDF file.',
        condenseRunning: 'Running Condense compression...',
        fallbackSuffix:
          ' (without image optimization due to unsupported patterns)',
        completeTitle: 'Compression Complete',
        completeMsg:
          'Method: {{method}}. File size reduced from {{original}} to {{compressed}} (Saved {{percent}}%).',
        finishedTitle: 'Compression Finished',
        finishedMsg:
          'Method: {{method}}. Could not reduce file size further. Original: {{original}}, New: {{compressed}}.',
        compressingMultiple: 'Compressing multiple PDFs...',
        compressingProgress: 'Compressing {{current}}/{{total}}: {{name}}...',
        batchCompleteMsg:
          'Compressed {{count}} PDF(s). Total size reduced from {{original}} to {{compressed}} (Saved {{percent}}%).',
        batchFinishedMsg:
          'Compressed {{count}} PDF(s). Total size: {{compressed}}.',
        errorMsg: 'An error occurred during compression. Error: {{error}}',
      },
      pdfEditor: {
        invalidFileMsg: 'Please upload a valid PDF file.',
        loadingEditor: 'Loading PDF Editor...',
        downloadEdited: 'Download Edited PDF',
        downloadFailed: 'Failed to download the edited PDF.',
        loadFailed: 'Failed to load the PDF Editor.',
      },
      jpgToPdf: {
        invalidFilesTitle: 'Invalid Files',
        invalidFilesMsg:
          'Some files were skipped. Only JPG, JPEG, JP2, and JPX files are allowed.',
        noFilesMsg: 'Please select at least one JPG or JPEG2000 image.',
        loadingEngine: 'Loading engine...',
        converting: 'Converting images to PDF...',
        createSuccess: 'PDF created successfully!',
        conversionErrorTitle: 'Conversion Error',
        convertFailed: 'Failed to convert images to PDF.',
      },
      signPdf: {
        invalidFileMsg: 'Please select a PDF file.',
        loadingViewer: 'Loading PDF viewer...',
        viewerNotReadyTitle: 'Viewer not ready',
        viewerWaitMsg: 'Please wait for the PDF viewer to load.',
        viewerInitMsg: 'The PDF viewer is still initializing.',
        flattenSaving: 'Flattening and saving PDF...',
        saveSuccess: 'Signed PDF saved successfully!',
        downloadSuccess: 'Signed PDF downloaded successfully!',
        exportFailedTitle: 'Export failed',
        exportFailedMsg: 'Could not export the signed PDF. Please try again.',
      },
    },
    zh: {
      splitPdf: {
        loadFailed: 'PDF 文件加载失败。',
        renderingPreviews: '正在渲染页面预览...',
        renderingProgress: '正在渲染页面预览：{{current}}/{{total}}',
        renderFailed: '页面预览渲染失败。',
        splitting: '正在分割 PDF...',
        splitSuccess: 'PDF 分割成功！',
        creatingZip: '正在创建 ZIP 文件...',
        splitFailed: 'PDF 分割失败。请检查你的选择。',
        outputSeparatePerPage: '每页一个 PDF',
        nTimesWarning:
          'PDF 共 {{total}} 页，无法被 {{n}} 整除，最后一个 PDF 将包含 {{remainder}} 页。',
        nMinError: 'N 至少为 1。',
        noPagesSelected: '没有选择要分割的页面。',
        noPdfLoaded: '未加载 PDF 文档。',
      },
      compressPdf: {
        photonRunning: '正在运行 Photon 压缩...',
        selectPdfs: '请至少选择一个 PDF 文件。',
        condenseRunning: '正在运行 Condense 压缩...',
        fallbackSuffix: '（因图像模式不受支持，未进行图像优化）',
        completeTitle: '压缩完成',
        completeMsg:
          '方式：{{method}}。文件大小从 {{original}} 降至 {{compressed}}（节省 {{percent}}%）。',
        finishedTitle: '压缩结束',
        finishedMsg:
          '方式：{{method}}。无法进一步减小文件大小。原始：{{original}}，现在：{{compressed}}。',
        compressingMultiple: '正在压缩多个 PDF...',
        compressingProgress: '正在压缩 {{current}}/{{total}}：{{name}}...',
        batchCompleteMsg:
          '已压缩 {{count}} 个 PDF。总大小从 {{original}} 降至 {{compressed}}（节省 {{percent}}%）。',
        batchFinishedMsg: '已压缩 {{count}} 个 PDF。总大小：{{compressed}}。',
        errorMsg: '压缩过程中发生错误。错误：{{error}}',
      },
      pdfEditor: {
        invalidFileMsg: '请上传有效的 PDF 文件。',
        loadingEditor: '正在加载 PDF 编辑器...',
        downloadEdited: '下载编辑后的 PDF',
        downloadFailed: '下载编辑后的 PDF 失败。',
        loadFailed: 'PDF 编辑器加载失败。',
      },
      jpgToPdf: {
        invalidFilesTitle: '无效文件',
        invalidFilesMsg:
          '部分文件已被跳过。仅支持 JPG、JPEG、JP2 和 JPX 文件。',
        noFilesMsg: '请至少选择一张 JPG 或 JPEG2000 图片。',
        loadingEngine: '正在加载引擎...',
        converting: '正在将图片转换为 PDF...',
        createSuccess: 'PDF 创建成功！',
        conversionErrorTitle: '转换错误',
        convertFailed: '图片转换为 PDF 失败。',
      },
      signPdf: {
        invalidFileMsg: '请选择 PDF 文件。',
        loadingViewer: '正在加载 PDF 查看器...',
        viewerNotReadyTitle: '查看器未就绪',
        viewerWaitMsg: '请等待 PDF 查看器加载完成。',
        viewerInitMsg: 'PDF 查看器仍在初始化。',
        flattenSaving: '正在扁平化并保存 PDF...',
        saveSuccess: '已签署的 PDF 保存成功！',
        downloadSuccess: '已签署的 PDF 下载成功！',
        exportFailedTitle: '导出失败',
        exportFailedMsg: '无法导出已签署的 PDF，请重试。',
      },
    },
  },
};

/* ---------------- 执行 ---------------- */
let errors = 0;
const pendingWrites = new Map();

for (const [file, config] of Object.entries(EDITS)) {
  const absPath = path.join(ROOT, file);
  let s = fs.readFileSync(absPath, 'utf8');
  const eol = s.includes('\r\n') ? '\r\n' : '\n';
  const toEol = (str) => (eol === '\n' ? str : str.replace(/\n/g, eol));

  // 1. 注入 import / translate 辅助函数
  if (config.importAfter) {
    const anchor = toEol(config.importAfter);
    if (!s.includes("from '../i18n/i18n'")) {
      if (!s.includes(anchor)) {
        console.error(`✘ ${file}: 找不到 import 锚点`);
        errors++;
      } else {
        s = s.replace(
          anchor,
          anchor + toEol(`\nimport { t } from '../i18n/i18n';`)
        );
      }
    }
  }
  const helperAnchor = toEol(config.helperAfter ?? config.importAfter ?? '');
  if (!s.includes('const translate = (')) {
    const anchorWithImport = config.helperAfter
      ? helperAnchor
      : s.includes("from '../i18n/i18n';")
        ? toEol("import { t } from '../i18n/i18n';")
        : null;
    if (!anchorWithImport || !s.includes(anchorWithImport)) {
      console.error(`✘ ${file}: 找不到 translate 辅助函数插入点`);
      errors++;
    } else {
      s = s.replace(anchorWithImport, anchorWithImport + toEol('\n' + HELPER));
    }
  }

  // 2. 文案替换
  let count = 0;
  for (const [oldRaw, newRaw, expected] of config.edits) {
    const oldStr = toEol(oldRaw);
    const newStr = toEol(newRaw);
    const occurrences = s.split(oldStr).length - 1;
    if (occurrences !== expected) {
      console.error(
        `✘ ${file}: 期望 ${expected} 实际 ${occurrences}: ${JSON.stringify(oldRaw.slice(0, 60))}`
      );
      errors++;
    } else {
      s = s.split(oldStr).join(newStr);
      count += occurrences;
    }
  }
  console.log(`✔ ${file}: ${count} 处替换已就绪`);
  pendingWrites.set(absPath, s);
}

if (errors > 0) {
  console.error('\n校验失败，未写入任何文件');
  process.exit(1);
}
for (const [absPath, content] of pendingWrites) {
  fs.writeFileSync(absPath, content);
}
console.log('TS 文件已全部写入。');

// 3. 合并翻译键
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
