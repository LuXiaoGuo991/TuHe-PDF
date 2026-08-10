import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pageEdits = [
  {
    file: 'src/pages/bookmark.html',
    replacements: [
      {
        from: 'title="Fit to Width"',
        to: 'title="Fit to Width" data-i18n-title="tools:editBookmarks.fitToWidth"',
      },
    ],
  },
  {
    file: 'src/pages/compare-pdfs.html',
    replacements: [
      {
        from: 'title="Reset zoom to fit"',
        to: 'title="Reset zoom to fit" data-i18n-title="tools:comparePdfs.resetZoom"',
      },
    ],
  },
  {
    file: 'src/pages/pdf-multi-tool.html',
    replacements: [
      {
        from: '<h1 class="sr-only">PDF Multi Tool Free Online - Edit & Organize PDFs</h1>',
        to: '<h1 class="sr-only" data-i18n="tools:pdfMultiTool.workbenchTitle">PDF Multi Tool Free Online - Edit & Organize PDFs</h1>',
      },
      {
        from: '          id="modal-close-btn"',
        to: '          id="modal-close-btn"\n          data-i18n="tools:pdfMultiTool.close"',
      },
    ],
  },
  {
    file: 'src/pages/pdf-workflow.html',
    replacements: [
      {
        from: '<h2 class="text-white font-bold text-sm mb-2">Nodes</h2>',
        to: '<h2 class="text-white font-bold text-sm mb-2" data-i18n="tools:pdfWorkflow.nodes">Nodes</h2>',
      },
      {
        from: 'placeholder="Search nodes..."',
        to: 'placeholder="Search nodes..." data-i18n-placeholder="tools:pdfWorkflow.searchNodes"',
      },
      {
        from: '<span class="hidden md:inline">Run</span>',
        to: '<span class="hidden md:inline" data-i18n="tools:pdfWorkflow.run">Run</span>',
      },
      {
        from: '<span class="hidden md:inline">Clear</span>',
        to: '<span class="hidden md:inline" data-i18n="tools:pdfWorkflow.clear">Clear</span>',
      },
      {
        from: '<span class="hidden md:inline">Save</span>',
        to: '<span class="hidden md:inline" data-i18n="tools:pdfWorkflow.save">Save</span>',
      },
      {
        from: '<span class="hidden md:inline">Load</span>',
        to: '<span class="hidden md:inline" data-i18n="tools:pdfWorkflow.load">Load</span>',
      },
      {
        from: '<span class="hidden md:inline">Export</span>',
        to: '<span class="hidden md:inline" data-i18n="tools:pdfWorkflow.export">Export</span>',
      },
      {
        from: '<span class="hidden md:inline">Import</span>',
        to: '<span class="hidden md:inline" data-i18n="tools:pdfWorkflow.import">Import</span>',
      },
      {
        from: '<span id="status-text">Ready</span>',
        to: '<span id="status-text" data-i18n="tools:pdfWorkflow.ready">Ready</span>',
      },
      {
        from: '<span id="node-count">0 nodes</span>',
        to: '<span id="node-count" data-i18n="tools:pdfWorkflow.nodeCount" data-i18n-options=\'{"count":0}\'>0 nodes</span>',
      },
      {
        from: '<h2 id="settings-title" class="text-white font-bold text-sm">\n            Settings\n          </h2>',
        to: '<h2 id="settings-title" class="text-white font-bold text-sm" data-i18n="tools:pdfWorkflow.settings">\n            Settings\n          </h2>',
      },
      {
        from: '<p id="loader-text" class="text-white text-lg font-medium">\n          Processing...',
        to: '<p id="loader-text" class="text-white text-lg font-medium" data-i18n="tools:pdfWorkflow.processing">\n          Processing...',
      },
      {
        from: '<h3 class="text-base font-semibold text-white">Save Template</h3>',
        to: '<h3 class="text-base font-semibold text-white" data-i18n="tools:pdfWorkflow.saveTemplate">Save Template</h3>',
      },
      {
        from: '<label class="block text-xs font-medium text-gray-400 mb-1.5"\n          >Template Name</label',
        to: '<label class="block text-xs font-medium text-gray-400 mb-1.5" data-i18n="tools:pdfWorkflow.templateName"\n          >Template Name</label',
      },
      {
        from: 'placeholder="e.g. Invoice Workflow"',
        to: 'placeholder="e.g. Invoice Workflow" data-i18n-placeholder="tools:pdfWorkflow.templatePlaceholder"',
      },
      {
        from: '            id="save-template-cancel"',
        to: '            id="save-template-cancel"\n            data-i18n="tools:pdfWorkflow.cancel"',
      },
      {
        from: '            id="save-template-confirm"',
        to: '            id="save-template-confirm"\n            data-i18n="tools:pdfWorkflow.save"',
      },
      {
        from: '<h3 class="text-base font-semibold text-white">Load Template</h3>',
        to: '<h3 class="text-base font-semibold text-white" data-i18n="tools:pdfWorkflow.loadTemplate">Load Template</h3>',
      },
      {
        from: '          No saved templates yet.\n        </p>',
        to: '          <span data-i18n="tools:pdfWorkflow.noTemplates">No saved templates yet.</span>\n        </p>',
      },
      {
        from: '          id="load-template-cancel"',
        to: '          id="load-template-cancel"\n          data-i18n="tools:pdfWorkflow.cancel"',
      },
      {
        from: '<h3 id="alert-title" class="text-lg font-semibold text-white mb-2">\n          Alert',
        to: '<h3 id="alert-title" class="text-lg font-semibold text-white mb-2" data-i18n="alert.title">\n          Alert',
      },
      {
        from: 'placeholder="Enter password"',
        to: 'placeholder="Enter password" data-i18n-placeholder="passwordPrompt.enterPassword"',
      },
      {
        from: '<p id="pdf-password-error" class="text-red-400 text-xs mb-3 hidden">\n          Incorrect password',
        to: '<p id="pdf-password-error" class="text-red-400 text-xs mb-3 hidden" data-i18n="tools:pdfWorkflow.incorrectPassword">\n          Incorrect password',
      },
      {
        from: '            id="pdf-password-skip"',
        to: '            id="pdf-password-skip"\n            data-i18n="passwordPrompt.skip"',
      },
      {
        from: '            id="pdf-password-unlock"',
        to: '            id="pdf-password-unlock"\n            data-i18n="passwordPrompt.unlock"',
      },
    ],
  },
  {
    file: 'src/pages/wasm-settings.html',
    replacements: [
      {
        from: '<h3 class="font-semibold text-white">PyMuPDF</h3>',
        to: '<h3 class="font-semibold text-white" data-i18n="tools:wasmSettings.pymupdfName">PyMuPDF</h3>',
      },
      {
        from: 'placeholder="https://your-cdn.com/pymupdf-wasm/"',
        to: 'placeholder="https://your-cdn.com/pymupdf-wasm/" data-i18n-placeholder="tools:wasmSettings.pymupdfUrlPlaceholder"',
      },
      {
        from: '<h3 class="font-semibold text-white">Ghostscript</h3>',
        to: '<h3 class="font-semibold text-white" data-i18n="tools:wasmSettings.ghostscriptName">Ghostscript</h3>',
      },
      {
        from: 'placeholder="https://your-cdn.com/ghostscript-wasm/"',
        to: 'placeholder="https://your-cdn.com/ghostscript-wasm/" data-i18n-placeholder="tools:wasmSettings.ghostscriptUrlPlaceholder"',
      },
      {
        from: '<h3 class="font-semibold text-white">CoherentPDF</h3>',
        to: '<h3 class="font-semibold text-white" data-i18n="tools:wasmSettings.cpdfName">CoherentPDF</h3>',
      },
      {
        from: 'placeholder="https://your-cdn.com/cpdf/"',
        to: 'placeholder="https://your-cdn.com/cpdf/" data-i18n-placeholder="tools:wasmSettings.cpdfUrlPlaceholder"',
      },
    ],
  },
];

const localeUpdates = {
  pdfMultiTool: {
    workbenchTitle: [
      'PDF Multi Tool Free Online - Edit & Organize PDFs',
      'PDF 多功能工具（在线免费）- 编辑和整理 PDF',
    ],
    close: ['Close', '关闭'],
  },
  pdfWorkflow: {
    nodeCount: ['{{count}} nodes', '{{count}} 个节点'],
    incorrectPassword: ['Incorrect password', '密码错误'],
    executionFailed: [
      'Workflow execution failed. Please try again.',
      '工作流执行失败，请重试。',
    ],
    pdfLoadFailed: [
      'Failed to load PDF. Please try again.',
      'PDF 加载失败，请重试。',
    ],
    imageLoadFailed: [
      'Failed to load images. Please try again.',
      '图片加载失败，请重试。',
    ],
    fileLoadFailed: [
      'Failed to load files. Please try again.',
      '文件加载失败，请重试。',
    ],
  },
  editBookmarks: {
    fitToWidth: ['Fit to Width', '适合宽度'],
  },
  comparePdfs: {
    resetZoom: ['Reset zoom to fit', '重置缩放以适合页面'],
    missingPage: [
      'Page {{page}} does not exist in this PDF.',
      '此 PDF 中不存在第 {{page}} 页。',
    ],
    ocrRunning: [
      'Running OCR on page {{page}}...',
      '正在对第 {{page}} 页执行 OCR...',
    ],
    ocrProgress: ['OCR: {{status}}', 'OCR：{{status}}'],
    noPairedPage: ['No paired page for this side.', '此侧没有对应的配对页面。'],
  },
  formCreator: {
    selectPlaceholder: ['Select...', '请选择...'],
    defaultButton: ['Button', '按钮'],
    tooltipPlaceholder: [
      'Description for screen readers',
      '供屏幕阅读器使用的说明',
    ],
  },
  pdfOverlay: {
    applying: ['Applying {{mode}}...', '正在应用{{mode}}...'],
    processFailed: [
      'Overlay processing failed. Please try again.',
      '叠加处理失败，请重试。',
    ],
  },
  wasmSettings: {
    pymupdfName: ['PyMuPDF', 'PyMuPDF'],
    ghostscriptName: ['Ghostscript', 'Ghostscript'],
    cpdfName: ['CoherentPDF', 'CoherentPDF'],
    pymupdfUrlPlaceholder: [
      'https://your-cdn.com/pymupdf-wasm/',
      'https://your-cdn.com/pymupdf-wasm/',
    ],
    ghostscriptUrlPlaceholder: [
      'https://your-cdn.com/ghostscript-wasm/',
      'https://your-cdn.com/ghostscript-wasm/',
    ],
    cpdfUrlPlaceholder: [
      'https://your-cdn.com/cpdf/',
      'https://your-cdn.com/cpdf/',
    ],
    saveFailedMessage: [
      'Failed to save configuration. Please try again.',
      '配置保存失败，请重试。',
    ],
  },
  decryptPdf: {
    processFailed: [
      'Decryption failed. Please try again.',
      '解密失败，请重试。',
    ],
  },
};

const preparedPages = [];
for (const page of pageEdits) {
  const filePath = path.join(root, page.file);
  const original = fs.readFileSync(filePath, 'utf8');
  const eol = original.includes('\r\n') ? '\r\n' : '\n';
  let source = original.replace(/\r\n/g, '\n');
  for (const edit of page.replacements) {
    const sourceCount = source.split(edit.from).length - 1;
    const targetCount = source.split(edit.to).length - 1;
    if (targetCount === 1) {
      continue;
    }
    if (sourceCount === 1) {
      source = source.replace(edit.from, edit.to);
      continue;
    }
    throw new Error(
      `${page.file}: expected source or completed target exactly once, got source=${sourceCount}, target=${targetCount}: ${edit.from}`
    );
  }
  preparedPages.push([filePath, source.replace(/\n/g, eol)]);
}

for (const [filePath, source] of preparedPages) {
  fs.writeFileSync(filePath, source);
}

for (const lang of ['en', 'zh']) {
  const filePath = path.join(root, `public/locales/${lang}/tools.json`);
  const json = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  for (const [tool, entries] of Object.entries(localeUpdates)) {
    json[tool] ??= {};
    for (const [key, [en, zh]] of Object.entries(entries)) {
      json[tool][key] = lang === 'en' ? en : zh;
    }
  }
  fs.writeFileSync(filePath, `${JSON.stringify(json, null, 2)}\n`);
}

console.log(
  `✔ 已接线 ${pageEdits.length} 个特殊页面，并补充 ${Object.values(localeUpdates).reduce((n, entries) => n + Object.keys(entries).length, 0)} 个语言键。`
);
