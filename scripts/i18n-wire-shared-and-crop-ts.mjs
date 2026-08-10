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

const EDITS = {
  'src/js/utils/password-prompt.ts': [
    [
      "import type { LoadedPdf } from '@/types';",
      "import type { LoadedPdf } from '@/types';\nimport { t } from '../i18n/i18n';" +
        HELPER,
      1,
    ],
    [
      '            <h3 id="password-modal-title" class="text-xl font-bold text-white mb-1">Password Required</h3>',
      '            <h3 id="password-modal-title" class="text-xl font-bold text-white mb-1">${translate(\'passwordPrompt.required\', \'Password Required\')}</h3>',
      1,
    ],
    [
      'placeholder="Enter password" autocomplete="off"',
      'placeholder="${translate(\'passwordPrompt.enterPassword\', \'Enter password\')}" autocomplete="off"',
      1,
    ],
    [
      '          Skip\n        </button>',
      "          ${translate('passwordPrompt.skip', 'Skip')}\n        </button>",
      1,
    ],
    [
      '          Unlock\n        </button>',
      "          ${translate('passwordPrompt.unlock', 'Unlock')}\n        </button>",
      1,
    ],
    [
      '            <p class="text-gray-400 text-sm">Enter passwords for each encrypted file</p>',
      "            <p class=\"text-gray-400 text-sm\">${translate('passwordPrompt.enterEach', 'Enter passwords for each encrypted file')}</p>",
      1,
    ],
    [
      '<label for="batch-modal-same-pw" class="text-sm text-gray-300 cursor-pointer select-none">Use same password for all files</label>',
      '<label for="batch-modal-same-pw" class="text-sm text-gray-300 cursor-pointer select-none">${translate(\'passwordPrompt.useSame\', \'Use same password for all files\')}</label>',
      1,
    ],
    [
      'placeholder="Password for all files" autocomplete="off"',
      'placeholder="${translate(\'passwordPrompt.passwordForAll\', \'Password for all files\')}" autocomplete="off"',
      1,
    ],
    [
      '          Skip All\n        </button>',
      "          ${translate('passwordPrompt.skipAll', 'Skip All')}\n        </button>",
      1,
    ],
    [
      '          Unlock All\n        </button>',
      "          ${translate('passwordPrompt.unlockAll', 'Unlock All')}\n        </button>",
      1,
    ],
    [
      "if (titleEl) titleEl.textContent = 'Password Required';",
      "if (titleEl) titleEl.textContent = translate('passwordPrompt.required', 'Password Required');",
      1,
    ],
    [
      "submitBtn.textContent = 'Unlock';\n  submitBtn.dataset.originalText = 'Unlock';",
      "submitBtn.textContent = translate('passwordPrompt.unlock', 'Unlock');\n  submitBtn.dataset.originalText = translate('passwordPrompt.unlock', 'Unlock');",
      1,
    ],
    [
      "cancelBtn.textContent = 'Skip';",
      "cancelBtn.textContent = translate('passwordPrompt.skip', 'Skip');",
      1,
    ],
    [
      "errorEl.textContent = 'Please enter a password';",
      "errorEl.textContent = translate('passwordPrompt.enterRequired', 'Please enter a password');",
      1,
    ],
    [
      "progressEl.textContent = 'Validating...';",
      "progressEl.textContent = translate('passwordPrompt.validating', 'Validating...');",
      1,
    ],
    [
      "errorEl.textContent = 'Incorrect password. Please try again.';",
      "errorEl.textContent = translate('passwordPrompt.incorrect', 'Incorrect password. Please try again.');",
      1,
    ],
    [
      "if (progressEl) progressEl.textContent = 'Decrypting...';",
      "if (progressEl) progressEl.textContent = translate('passwordPrompt.decrypting', 'Decrypting...');",
      1,
    ],
    [
      "'Failed to decrypt. Try the Decrypt tool instead.';",
      "translate('passwordPrompt.decryptFailed', 'Failed to decrypt. Try the Decrypt tool instead.');",
      1,
    ],
    [
      'titleEl.textContent = `${fileNames.length} Files Need a Password`;',
      "titleEl.textContent = translate('passwordPrompt.filesNeedPassword', `${fileNames.length} Files Need a Password`, { count: fileNames.length });",
      1,
    ],
    [
      'placeholder="Password"',
      "placeholder=\"${translate('passwordPrompt.password', 'Password')}\"",
      1,
    ],
    [
      'title="Skip this file"',
      "title=\"${translate('passwordPrompt.skipFile', 'Skip this file')}\"",
      1,
    ],
    [
      "submitBtn.textContent = 'Unlock All';\n  submitBtn.dataset.originalText = 'Unlock All';",
      "submitBtn.textContent = translate('passwordPrompt.unlockAll', 'Unlock All');\n  submitBtn.dataset.originalText = translate('passwordPrompt.unlockAll', 'Unlock All');",
      1,
    ],
    [
      "cancelBtn.textContent = hasSucceeded ? 'Skip Remaining' : 'Skip All';",
      "cancelBtn.textContent = hasSucceeded\n        ? translate('passwordPrompt.skipRemaining', 'Skip Remaining')\n        : translate('passwordPrompt.skipAll', 'Skip All');",
      1,
    ],
    [
      'submitBtn.textContent = `Unlock Remaining (${remaining})`;',
      "submitBtn.textContent = translate('passwordPrompt.unlockRemaining', `Unlock Remaining (${remaining})`, { count: remaining });",
      1,
    ],
    [
      "btn.title = 'Skip this file';",
      "btn.title = translate('passwordPrompt.skipFile', 'Skip this file');",
      1,
    ],
    [
      "btn.title = 'Include this file';",
      "btn.title = translate('passwordPrompt.includeFile', 'Include this file');",
      1,
    ],
    [
      "? 'Please enter a password'\n              : `Please enter a password for ${fileNames[i]} or skip it`;",
      "? translate('passwordPrompt.enterRequired', 'Please enter a password')\n              : translate('passwordPrompt.enterForFile', `Please enter a password for ${fileNames[i]} or skip it`, { name: fileNames[i] });",
      1,
    ],
    [
      'progressEl.textContent = `Validating ${i + 1} of ${toProcess.length}: ${files[realIdx].name}`;',
      "progressEl.textContent = translate('passwordPrompt.validatingFile', `Validating ${i + 1} of ${toProcess.length}: ${files[realIdx].name}`, { current: i + 1, total: toProcess.length, name: files[realIdx].name });",
      1,
    ],
    [
      'progressEl.textContent = `Decrypting ${i + 1} of ${toProcess.length}: ${files[realIdx].name}`;',
      "progressEl.textContent = translate('passwordPrompt.decryptingFile', `Decrypting ${i + 1} of ${toProcess.length}: ${files[realIdx].name}`, { current: i + 1, total: toProcess.length, name: files[realIdx].name });",
      1,
    ],
    [
      "errorEl.textContent = `Wrong password for: ${failedNames.join(', ')}`;",
      "errorEl.textContent = translate('passwordPrompt.wrongForFiles', `Wrong password for: ${failedNames.join(', ')}`, { names: failedNames.join(', ') });",
      1,
    ],
    [
      "submitBtn.textContent = 'Retry Failed';",
      "submitBtn.textContent = translate('passwordPrompt.retryFailed', 'Retry Failed');",
      1,
    ],
  ],
  'src/js/handlers/fileHandler.ts': [
    [
      "import { loadPdfDocument } from '../utils/load-pdf-document.js';",
      "import { loadPdfDocument } from '../utils/load-pdf-document.js';\nimport { t } from '../i18n/i18n';" +
        HELPER,
      1,
    ],
    [
      "showLoader('Loading PDF...');",
      "showLoader(translate('fileHandler.loadingPdf', 'Loading PDF...'));",
      1,
    ],
    [
      "showLoader('Analyzing full PDF metadata...');",
      "showLoader(translate('fileHandler.analyzingMetadata', 'Analyzing full PDF metadata...'));",
      1,
    ],
    [
      "const infoSection = createSection('Info Dictionary');",
      "const infoSection = createSection(translate('fileHandler.infoDictionary', 'Info Dictionary'));",
      1,
    ],
    [
      "displayValue = '- Not Set -';",
      "displayValue = translate('fileHandler.notSet', '- Not Set -');",
      1,
    ],
    [
      '`<li><span class="text-gray-500 italic">- No Info Dictionary data found -</span></li>`',
      "(`<li><span class=\"text-gray-500 italic\">${translate('fileHandler.noInfoData', '- No Info Dictionary data found -')}</span></li>`)",
      1,
    ],
    [
      "const fieldsSection = createSection('Interactive Form Fields');",
      "const fieldsSection = createSection(translate('fileHandler.formFields', 'Interactive Form Fields'));",
      1,
    ],
    [
      "const value = field.fieldValue || '- Not Set -';",
      "const value = field.fieldValue || translate('fileHandler.notSet', '- Not Set -');",
      1,
    ],
    [
      '`<li><span class="text-gray-500 italic">- No interactive form fields found -</span></li>`',
      "(`<li><span class=\"text-gray-500 italic\">${translate('fileHandler.noFormFields', '- No interactive form fields found -')}</span></li>`)",
      1,
    ],
    [
      "key = '(alt container)';",
      "key = translate('fileHandler.altContainer', '(alt container)');",
      1,
    ],
    [
      "createXmpListItem(key, '(Empty Resource)', indentLevel)",
      "createXmpListItem(key, translate('fileHandler.emptyResource', '(Empty Resource)'), indentLevel)",
      1,
    ],
    [
      "const xmpSection = createSection('XMP Metadata');",
      "const xmpSection = createSection(translate('fileHandler.xmpMetadata', 'XMP Metadata'));",
      1,
    ],
    [
      '`<li><span class="text-gray-500 italic">- No parseable XMP properties found -</span></li>`',
      "(`<li><span class=\"text-gray-500 italic\">${translate('fileHandler.noXmpProperties', '- No parseable XMP properties found -')}</span></li>`)",
      1,
    ],
    [
      '`<li><span class="text-red-500 italic">- Error parsing XMP XML. Displaying raw. -</span></li>`',
      "(`<li><span class=\"text-red-500 italic\">${translate('fileHandler.xmpParseFailed', '- Unable to parse XMP metadata. -')}</span></li>`)",
      1,
    ],
    [
      '`<li><span class="text-gray-500 italic">- No XMP metadata found -</span></li>`',
      "(`<li><span class=\"text-gray-500 italic\">${translate('fileHandler.noXmpMetadata', '- No XMP metadata found -')}</span></li>`)",
      1,
    ],
    [
      "'Error',\n          'Could not fully analyze the PDF. It may be corrupted or have an unusual structure.'",
      "translate('alert.error', 'Error'),\n          translate('fileHandler.metadataAnalyzeFailed', 'Could not fully analyze the PDF. It may be corrupted or have an unusual structure.')",
      1,
    ],
    [
      "keyInput.placeholder = 'Key (e.g., Department)';",
      "keyInput.placeholder = translate('fileHandler.metadataKeyPlaceholder', 'Key (e.g., Department)');",
      1,
    ],
    [
      "valueInput.placeholder = 'Value (e.g., Marketing)';",
      "valueInput.placeholder = translate('fileHandler.metadataValuePlaceholder', 'Value (e.g., Marketing)');",
      1,
    ],
    [
      "'Error',\n      'Could not load PDF. The file may be invalid, corrupted, or password-protected.'",
      "translate('alert.error', 'Error'),\n      translate('fileHandler.loadFailed', 'Could not load PDF. The file may be invalid, corrupted, or password-protected.')",
      1,
    ],
    [
      "showLoader('Loading PDF documents...');",
      "showLoader(translate('fileHandler.loadingDocuments', 'Loading PDF documents...'));",
      2,
    ],
    [
      "'Invalid Files',\n          'Some files were skipped because they are not supported images.'",
      "translate('fileHandler.invalidFilesTitle', 'Invalid Files'),\n          translate('fileHandler.unsupportedImages', 'Some files were skipped because they are not supported images.')",
      1,
    ],
  ],
  'src/js/logic/crop-pdf-page.ts': [
    [
      "import { loadPdfDocument } from '../utils/load-pdf-document.js';",
      "import { loadPdfDocument } from '../utils/load-pdf-document.js';\nimport { t } from '../i18n/i18n';" +
        HELPER,
      1,
    ],
    [
      "showAlert('Invalid File', 'Please select a PDF file.');",
      "showAlert(translate('alert.invalidFile', 'Invalid File'), translate('tools:cropPdf.invalidFile', 'Please select a PDF file.'));",
      1,
    ],
    [
      "showLoader('Loading PDF...');",
      "showLoader(translate('tools:cropPdf.loadingPdf', 'Loading PDF...'));",
      1,
    ],
    [
      "showAlert('Error', 'Failed to load PDF file.');",
      "showAlert(translate('alert.error', 'Error'), translate('tools:cropPdf.loadFailed', 'Failed to load PDF file.'));",
      1,
    ],
    [
      'metaSpan.textContent = `${formatBytes(cropperState.file.size)} • ${cropperState.pdfDoc?.numPages || 0} pages`;',
      "metaSpan.textContent = `${formatBytes(cropperState.file.size)} • ${translate('common.filePages', `${cropperState.pdfDoc?.numPages || 0} pages`, { count: cropperState.pdfDoc?.numPages || 0 })}`;",
      1,
    ],
    [
      'showLoader(`Rendering Page ${num}...`);',
      "showLoader(translate('tools:cropPdf.renderingPage', `Rendering Page ${num}...`, { page: num }));",
      1,
    ],
    [
      "showAlert('Error', 'Failed to render page.');",
      "showAlert(translate('alert.error', 'Error'), translate('tools:cropPdf.renderFailed', 'Failed to render page.'));",
      1,
    ],
    [
      'pageInfo.textContent = `Page ${cropperState.currentPageNum} of ${cropperState.pdfDoc.numPages}`;',
      "pageInfo.textContent = translate('tools:cropPdf.pageInfo', `Page ${cropperState.currentPageNum} of ${cropperState.pdfDoc.numPages}`, { current: cropperState.currentPageNum, total: cropperState.pdfDoc.numPages });",
      1,
    ],
    [
      "showAlert('No Crop Area', 'Please select an area to crop first.');",
      "showAlert(translate('tools:cropPdf.noCropArea', 'No Crop Area'), translate('tools:cropPdf.selectAreaFirst', 'Please select an area to crop first.'));",
      1,
    ],
    [
      "'No Crop Area',\n      'Please select an area on at least one page to crop.'",
      "translate('tools:cropPdf.noCropArea', 'No Crop Area'),\n      translate('tools:cropPdf.selectArea', 'Please select an area on at least one page to crop.')",
      1,
    ],
    [
      "showLoader('Applying crop...');",
      "showLoader(translate('tools:cropPdf.applyingCrop', 'Applying crop...'));",
      1,
    ],
    [
      "'Success',\n      'Crop complete! Your download has started.'",
      "translate('alert.success', 'Success'),\n      translate('tools:cropPdf.cropComplete', 'Crop complete! Your download has started.')",
      1,
    ],
    [
      "showAlert('Error', 'An error occurred during cropping.');",
      "showAlert(translate('alert.error', 'Error'), translate('tools:cropPdf.cropFailed', 'An error occurred during cropping.'));",
      1,
    ],
    [
      'showLoader(`Processing page ${pageNum} of ${totalPages}...`);',
      "showLoader(translate('tools:cropPdf.processingPage', `Processing page ${pageNum} of ${totalPages}...`, { current: pageNum, total: totalPages }));",
      1,
    ],
  ],
};

const NEW_KEYS = {
  common: {
    en: {
      passwordPrompt: {
        required: 'Password Required',
        enterPassword: 'Enter password',
        skip: 'Skip',
        unlock: 'Unlock',
        enterEach: 'Enter passwords for each encrypted file',
        useSame: 'Use same password for all files',
        passwordForAll: 'Password for all files',
        skipAll: 'Skip All',
        unlockAll: 'Unlock All',
        enterRequired: 'Please enter a password',
        validating: 'Validating...',
        incorrect: 'Incorrect password. Please try again.',
        decrypting: 'Decrypting...',
        decryptFailed: 'Failed to decrypt. Try the Decrypt tool instead.',
        filesNeedPassword: '{{count}} Files Need a Password',
        password: 'Password',
        skipFile: 'Skip this file',
        skipRemaining: 'Skip Remaining',
        unlockRemaining: 'Unlock Remaining ({{count}})',
        includeFile: 'Include this file',
        enterForFile: 'Please enter a password for {{name}} or skip it',
        validatingFile: 'Validating {{current}} of {{total}}: {{name}}',
        decryptingFile: 'Decrypting {{current}} of {{total}}: {{name}}',
        wrongForFiles: 'Wrong password for: {{names}}',
        retryFailed: 'Retry Failed',
      },
      fileHandler: {
        loadingPdf: 'Loading PDF...',
        analyzingMetadata: 'Analyzing full PDF metadata...',
        infoDictionary: 'Info Dictionary',
        notSet: '- Not Set -',
        noInfoData: '- No Info Dictionary data found -',
        formFields: 'Interactive Form Fields',
        noFormFields: '- No interactive form fields found -',
        altContainer: '(alt container)',
        emptyResource: '(Empty Resource)',
        xmpMetadata: 'XMP Metadata',
        noXmpProperties: '- No parseable XMP properties found -',
        xmpParseFailed: '- Unable to parse XMP metadata. -',
        noXmpMetadata: '- No XMP metadata found -',
        metadataAnalyzeFailed:
          'Could not fully analyze the PDF. It may be corrupted or have an unusual structure.',
        metadataKeyPlaceholder: 'Key (e.g., Department)',
        metadataValuePlaceholder: 'Value (e.g., Marketing)',
        loadFailed:
          'Could not load PDF. The file may be invalid, corrupted, or password-protected.',
        loadingDocuments: 'Loading PDF documents...',
        invalidFilesTitle: 'Invalid Files',
        unsupportedImages:
          'Some files were skipped because they are not supported images.',
      },
    },
    zh: {
      passwordPrompt: {
        required: '需要密码',
        enterPassword: '输入密码',
        skip: '跳过',
        unlock: '解锁',
        enterEach: '输入每个加密文件的密码',
        useSame: '所有文件使用相同密码',
        passwordForAll: '所有文件的密码',
        skipAll: '全部跳过',
        unlockAll: '全部解锁',
        enterRequired: '请输入密码',
        validating: '正在验证...',
        incorrect: '密码错误，请重试。',
        decrypting: '正在解密...',
        decryptFailed: '解密失败。请改用“解密 PDF”工具。',
        filesNeedPassword: '{{count}} 个文件需要密码',
        password: '密码',
        skipFile: '跳过此文件',
        skipRemaining: '跳过剩余文件',
        unlockRemaining: '解锁剩余文件（{{count}}）',
        includeFile: '包含此文件',
        enterForFile: '请输入 {{name}} 的密码或跳过它',
        validatingFile: '正在验证 {{current}} / {{total}}：{{name}}',
        decryptingFile: '正在解密 {{current}} / {{total}}：{{name}}',
        wrongForFiles: '以下文件密码错误：{{names}}',
        retryFailed: '重试失败项',
      },
      fileHandler: {
        loadingPdf: '正在加载 PDF...',
        analyzingMetadata: '正在分析完整 PDF 元数据...',
        infoDictionary: '信息字典',
        notSet: '- 未设置 -',
        noInfoData: '- 未找到信息字典数据 -',
        formFields: '交互式表单字段',
        noFormFields: '- 未找到交互式表单字段 -',
        altContainer: '（替代容器）',
        emptyResource: '（空资源）',
        xmpMetadata: 'XMP 元数据',
        noXmpProperties: '- 未找到可解析的 XMP 属性 -',
        xmpParseFailed: '- 无法解析 XMP 元数据。-',
        noXmpMetadata: '- 未找到 XMP 元数据 -',
        metadataAnalyzeFailed:
          '无法完整分析 PDF。文件可能已损坏或具有异常结构。',
        metadataKeyPlaceholder: '键（例如：部门）',
        metadataValuePlaceholder: '值（例如：市场部）',
        loadFailed: '无法加载 PDF。文件可能无效、已损坏或受密码保护。',
        loadingDocuments: '正在加载 PDF 文档...',
        invalidFilesTitle: '无效文件',
        unsupportedImages: '部分文件已被跳过，因为它们不是受支持的图片。',
      },
    },
  },
  tools: {
    en: {
      cropPdf: {
        invalidFile: 'Please select a PDF file.',
        loadingPdf: 'Loading PDF...',
        loadFailed: 'Failed to load PDF file.',
        renderingPage: 'Rendering Page {{page}}...',
        renderFailed: 'Failed to render page.',
        pageInfo: 'Page {{current}} of {{total}}',
        noCropArea: 'No Crop Area',
        selectAreaFirst: 'Please select an area to crop first.',
        selectArea: 'Please select an area on at least one page to crop.',
        applyingCrop: 'Applying crop...',
        cropComplete: 'Crop complete! Your download has started.',
        cropFailed: 'An error occurred during cropping.',
        processingPage: 'Processing page {{current}} of {{total}}...',
      },
    },
    zh: {
      cropPdf: {
        invalidFile: '请选择 PDF 文件。',
        loadingPdf: '正在加载 PDF...',
        loadFailed: 'PDF 文件加载失败。',
        renderingPage: '正在渲染第 {{page}} 页...',
        renderFailed: '页面渲染失败。',
        pageInfo: '第 {{current}} / {{total}} 页',
        noCropArea: '未选择裁剪区域',
        selectAreaFirst: '请先选择要裁剪的区域。',
        selectArea: '请至少在一页上选择要裁剪的区域。',
        applyingCrop: '正在应用裁剪...',
        cropComplete: '裁剪完成，下载已开始。',
        cropFailed: '裁剪时发生错误。',
        processingPage: '正在处理第 {{current}} / {{total}} 页...',
      },
    },
  },
};

const pending = new Map();
let errors = 0;
for (const [file, edits] of Object.entries(EDITS)) {
  const absolute = path.join(ROOT, file);
  let source = fs.readFileSync(absolute, 'utf8');
  const eol = source.includes('\r\n') ? '\r\n' : '\n';
  const toEol = (value) => (eol === '\n' ? value : value.replace(/\n/g, eol));
  let count = 0;
  for (const [oldRaw, newRaw, expected] of edits) {
    const old = toEol(oldRaw);
    const replacement = toEol(newRaw);
    const found = source.split(old).length - 1;
    if (found !== expected) {
      console.error(
        `✘ ${file}: 期望 ${expected} 处，实际 ${found} 处：${JSON.stringify(oldRaw.slice(0, 80))}`
      );
      errors++;
      continue;
    }
    source = source.split(old).join(replacement);
    count += found;
  }
  console.log(`✔ ${file}: ${count} 处替换已就绪`);
  pending.set(absolute, source);
}

const merge = (target, addition, label, prefix = '') => {
  for (const [key, value] of Object.entries(addition)) {
    const current = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object') {
      if (target[key] === undefined) target[key] = {};
      merge(target[key], value, label, current);
    } else if (target[key] !== undefined) {
      console.error(`✘ ${label}: 键已存在 ${current}`);
      errors++;
    } else {
      target[key] = value;
    }
  }
};
const localeWrites = new Map();
for (const namespace of ['common', 'tools']) {
  for (const language of ['en', 'zh']) {
    const absolute = path.join(
      ROOT,
      `public/locales/${language}/${namespace}.json`
    );
    const locale = JSON.parse(fs.readFileSync(absolute, 'utf8'));
    merge(
      locale,
      NEW_KEYS[namespace][language],
      `${language}/${namespace}.json`
    );
    localeWrites.set(absolute, JSON.stringify(locale, null, 2) + '\n');
  }
}

if (errors > 0) {
  console.error('校验失败，未写入任何文件');
  process.exit(1);
}
for (const [absolute, source] of pending) fs.writeFileSync(absolute, source);
for (const [absolute, source] of localeWrites)
  fs.writeFileSync(absolute, source);
console.log('✔ TS 和 en/zh 语言键已写入。');
