/**
 * i18n 接线批处理（第一批：首页快捷工具对应的 6 个高频工具页）
 *
 * 做的事：
 * 1. 给 src/pages/*.html 中硬编码的英文文案补 data-i18n / data-i18n-placeholder 属性
 *    （只加属性，不改任何可见英文文本，保证英文页面渲染结果不变）
 * 2. 把新增键深度合并进 public/locales/en 与 public/locales/zh 的
 *    common.json / tools.json（en 保留原文，zh 为新译文）
 *
 * 安全机制：每个 old 片段要求在文件中出现且仅出现预期次数，否则报错并中止，
 * 不会写出半成品。可重复运行：已替换过的片段会因找不到 old 而报错，
 * 因此本脚本设计为一次性迁移，运行前请保证 git 工作区干净。
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/* ---------------- HTML 替换表 ---------------- */
// all: true 表示允许出现多次并全部替换，count 指定期望次数
const EDITS = {
  'src/pages/merge-pdf.html': [
    {
      old: '            >\n              File Mode\n            </button>',
      neu: '              data-i18n="tools:mergePdf.fileMode"\n            >\n              File Mode\n            </button>',
    },
    {
      old: '            >\n              Page Mode\n            </button>',
      neu: '              data-i18n="tools:mergePdf.pageMode"\n            >\n              Page Mode\n            </button>',
    },
    {
      old: '<strong class="text-white">How it works:</strong>',
      neu: '<strong class="text-white" data-i18n="howItWorks.hint">How it works:</strong>',
      all: true,
      count: 2,
    },
    {
      old: '                <li>\n                  Click and drag the\n                  <i\n                    data-lucide="grip-vertical"\n                    class="inline-block w-3 h-3"\n                  ></i>\n                  icon to change the order of the files.\n                </li>',
      neu: '                <li>\n                  <span data-i18n="tools:mergePdf.howFile1a">Click and drag the</span>\n                  <i\n                    data-lucide="grip-vertical"\n                    class="inline-block w-3 h-3"\n                  ></i>\n                  <span data-i18n="tools:mergePdf.howFile1b">icon to change the order of the files.</span>\n                </li>',
    },
    {
      old: '                <li>\n                  In the "Pages" box for each file, you can specify ranges\n                  (e.g., "1-3, 5") to merge only those pages.\n                </li>',
      neu: '                <li data-i18n="tools:mergePdf.howFile2">\n                  In the "Pages" box for each file, you can specify ranges\n                  (e.g., "1-3, 5") to merge only those pages.\n                </li>',
    },
    {
      old: '                <li>\n                  Leave the "Pages" box blank to include all pages from that\n                  file.\n                </li>',
      neu: '                <li data-i18n="tools:mergePdf.howFile3">\n                  Leave the "Pages" box blank to include all pages from that\n                  file.\n                </li>',
    },
    {
      old: '<li>All pages from your uploaded PDFs are shown below.</li>',
      neu: '<li data-i18n="tools:mergePdf.howPage1">All pages from your uploaded PDFs are shown below.</li>',
    },
    {
      old: '                <li>\n                  Simply drag and drop the individual page thumbnails to create\n                  the exact order you want for your new file.\n                </li>',
      neu: '                <li data-i18n="tools:mergePdf.howPage2">\n                  Simply drag and drop the individual page thumbnails to create\n                  the exact order you want for your new file.\n                </li>',
    },
    {
      old: '<button id="process-btn" class="btn-gradient w-full mt-6">\n            Merge PDFs\n          </button>',
      neu: '<button id="process-btn" class="btn-gradient w-full mt-6" data-i18n="tools:mergePdf.processBtn">\n            Merge PDFs\n          </button>',
    },
    {
      old: '<p id="loader-text" class="text-white text-lg font-medium">',
      neu: '<p id="loader-text" class="text-white text-lg font-medium" data-i18n="loader.processing">',
    },
    {
      old: '          id="alert-ok"',
      neu: '          id="alert-ok"\n          data-i18n="alert.ok"',
    },
    // How It Works 4 步
    {
      old: '<h3 class="text-lg font-semibold text-white mb-1">Upload PDFs</h3>\n            <p class="text-gray-400">\n              Select or drag and drop multiple PDF files you want to merge\n            </p>',
      neu: '<h3 class="text-lg font-semibold text-white mb-1" data-i18n="tools:mergePdf.hiw1Title">Upload PDFs</h3>\n            <p class="text-gray-400" data-i18n="tools:mergePdf.hiw1Desc">\n              Select or drag and drop multiple PDF files you want to merge\n            </p>',
    },
    {
      old: '<h3 class="text-lg font-semibold text-white mb-1">Arrange Order</h3>\n            <p class="text-gray-400">\n              Drag files up or down to reorder them in your preferred sequence\n            </p>',
      neu: '<h3 class="text-lg font-semibold text-white mb-1" data-i18n="tools:mergePdf.hiw2Title">Arrange Order</h3>\n            <p class="text-gray-400" data-i18n="tools:mergePdf.hiw2Desc">\n              Drag files up or down to reorder them in your preferred sequence\n            </p>',
    },
    {
      old: '<h3 class="text-lg font-semibold text-white mb-1">Merge Files</h3>\n            <p class="text-gray-400">\n              Click the merge button to combine all PDFs into a single document\n            </p>',
      neu: '<h3 class="text-lg font-semibold text-white mb-1" data-i18n="tools:mergePdf.hiw3Title">Merge Files</h3>\n            <p class="text-gray-400" data-i18n="tools:mergePdf.hiw3Desc">\n              Click the merge button to combine all PDFs into a single document\n            </p>',
    },
    {
      old: '<h3 class="text-lg font-semibold text-white mb-1">Download</h3>\n            <p class="text-gray-400">\n              Save your merged PDF - all pages combined in the order you chose\n            </p>',
      neu: '<h3 class="text-lg font-semibold text-white mb-1" data-i18n="tools:mergePdf.hiw4Title">Download</h3>\n            <p class="text-gray-400" data-i18n="tools:mergePdf.hiw4Desc">\n              Save your merged PDF - all pages combined in the order you chose\n            </p>',
    },
    // Related Tools 卡片
    {
      old: '<h3 class="text-white font-semibold mb-1">Split Pdf</h3>',
      neu: '<h3 class="text-white font-semibold mb-1" data-i18n="tools:splitPdf.name">Split Pdf</h3>',
    },
    {
      old: '<p class="text-gray-400 text-sm">Free online split pdf tool</p>',
      neu: '<p class="text-gray-400 text-sm" data-i18n="tools:splitPdf.cardDesc">Free online split pdf tool</p>',
    },
    {
      old: '<h3 class="text-white font-semibold mb-1">Organize Pdf</h3>',
      neu: '<h3 class="text-white font-semibold mb-1" data-i18n="tools:duplicateOrganize.name">Organize Pdf</h3>',
    },
    {
      old: '<p class="text-gray-400 text-sm">Free online organize pdf tool</p>',
      neu: '<p class="text-gray-400 text-sm" data-i18n="tools:duplicateOrganize.cardDesc">Free online organize pdf tool</p>',
    },
    {
      old: '<h3 class="text-white font-semibold mb-1">Compress Pdf</h3>',
      neu: '<h3 class="text-white font-semibold mb-1" data-i18n="tools:compressPdf.name">Compress Pdf</h3>',
    },
    {
      old: '<p class="text-gray-400 text-sm">Free online compress pdf tool</p>',
      neu: '<p class="text-gray-400 text-sm" data-i18n="tools:compressPdf.cardDesc">Free online compress pdf tool</p>',
    },
    {
      old: '<h3 class="text-white font-semibold mb-1">Rotate Pdf</h3>',
      neu: '<h3 class="text-white font-semibold mb-1" data-i18n="tools:rotatePdf.name">Rotate Pdf</h3>',
    },
    {
      old: '<p class="text-gray-400 text-sm">Free online rotate pdf tool</p>',
      neu: '<p class="text-gray-400 text-sm" data-i18n="tools:rotatePdf.cardDesc">Free online rotate pdf tool</p>',
    },
    {
      old: '<h3 class="text-white font-semibold mb-1">Delete Pages</h3>',
      neu: '<h3 class="text-white font-semibold mb-1" data-i18n="tools:deletePages.name">Delete Pages</h3>',
    },
    {
      old: '<p class="text-gray-400 text-sm">Free online delete pages tool</p>',
      neu: '<p class="text-gray-400 text-sm" data-i18n="tools:deletePages.cardDesc">Free online delete pages tool</p>',
    },
    // FAQ
    {
      old: '            How many PDFs can I merge at once?\n            <i data-lucide="chevron-down" class="w-5 h-5"></i>',
      neu: '            <span data-i18n="tools:mergePdf.faq1q">How many PDFs can I merge at once?</span>\n            <i data-lucide="chevron-down" class="w-5 h-5"></i>',
    },
    {
      old: '<p class="mt-3 text-gray-400">\n            Unlimited! Merge as many PDF files as you need in a single\n            operation. No restrictions on file count or total size.\n          </p>',
      neu: '<p class="mt-3 text-gray-400" data-i18n="tools:mergePdf.faq1a">\n            Unlimited! Merge as many PDF files as you need in a single\n            operation. No restrictions on file count or total size.\n          </p>',
    },
    {
      old: '            Will merging reduce PDF quality?\n            <i data-lucide="chevron-down" class="w-5 h-5"></i>',
      neu: '            <span data-i18n="tools:mergePdf.faq2q">Will merging reduce PDF quality?</span>\n            <i data-lucide="chevron-down" class="w-5 h-5"></i>',
    },
    {
      old: '<p class="mt-3 text-gray-400">\n            No! BentoPDF preserves the original quality of all PDFs when\n            merging. Your documents remain crisp and clear with no quality loss.\n          </p>',
      neu: '<p class="mt-3 text-gray-400" data-i18n="tools:mergePdf.faq2a">\n            No! BentoPDF preserves the original quality of all PDFs when\n            merging. Your documents remain crisp and clear with no quality loss.\n          </p>',
    },
    {
      old: '            Can I reorder pages after selecting files?\n            <i data-lucide="chevron-down" class="w-5 h-5"></i>',
      neu: '            <span data-i18n="tools:mergePdf.faq3q">Can I reorder pages after selecting files?</span>\n            <i data-lucide="chevron-down" class="w-5 h-5"></i>',
    },
    {
      old: '<p class="mt-3 text-gray-400">\n            Yes! Simply drag and drop files to arrange them in any order before\n            clicking the merge button.\n          </p>',
      neu: '<p class="mt-3 text-gray-400" data-i18n="tools:mergePdf.faq3a">\n            Yes! Simply drag and drop files to arrange them in any order before\n            clicking the merge button.\n          </p>',
    },
  ],

  'src/pages/split-pdf.html': [
    {
      old: '>Split Mode</label',
      neu: ' data-i18n="tools:splitPdf.splitModeLabel">Split Mode</label',
    },
    {
      old: '<option value="range">Extract by Page Range (Default)</option>',
      neu: '<option value="range" data-i18n="tools:splitPdf.modeRange">Extract by Page Range (Default)</option>',
    },
    {
      old: '<option value="even-odd">Split by Even/Odd Pages</option>',
      neu: '<option value="even-odd" data-i18n="tools:splitPdf.modeEvenOdd">Split by Even/Odd Pages</option>',
    },
    {
      old: '<option value="all">Split All Pages into Separate Files</option>',
      neu: '<option value="all" data-i18n="tools:splitPdf.modeAll">Split All Pages into Separate Files</option>',
    },
    {
      old: '<option value="visual">Select Pages Visually</option>',
      neu: '<option value="visual" data-i18n="tools:splitPdf.modeVisual">Select Pages Visually</option>',
    },
    {
      old: '<option value="bookmarks">Split by Bookmarks</option>',
      neu: '<option value="bookmarks" data-i18n="tools:splitPdf.modeBookmarks">Split by Bookmarks</option>',
    },
    {
      old: '<option value="n-times">Split N Times</option>',
      neu: '<option value="n-times" data-i18n="tools:splitPdf.modeNTimes">Split N Times</option>',
    },
    {
      old: '<strong class="text-white">How it works:</strong>',
      neu: '<strong class="text-white" data-i18n="howItWorks.hint">How it works:</strong>',
      all: true,
      count: 6,
    },
    {
      old: '<li>\n                  Enter page numbers separated by commas (e.g., 2, 8, 14).\n                </li>',
      neu: '<li data-i18n="tools:splitPdf.howRange1">\n                  Enter page numbers separated by commas (e.g., 2, 8, 14).\n                </li>',
    },
    {
      old: '<li>Enter page ranges using a hyphen (e.g., 5-10).</li>',
      neu: '<li data-i18n="tools:splitPdf.howRange2">Enter page ranges using a hyphen (e.g., 5-10).</li>',
    },
    {
      old: '<li>\n                  Combine them for complex selections (e.g., 1-3, 7, 12-15).\n                </li>',
      neu: '<li data-i18n="tools:splitPdf.howRange3">\n                  Combine them for complex selections (e.g., 1-3, 7, 12-15).\n                </li>',
    },
    {
      old: '>Page Range</label',
      neu: ' data-i18n="tools:splitPdf.pageRangeLabel">Page Range</label',
    },
    {
      old: 'placeholder="e.g. 1-5, 8, 11-13"',
      neu: 'placeholder="e.g. 1-5, 8, 11-13"\n              data-i18n-placeholder="tools:splitPdf.pageRangePlaceholder"',
    },
    {
      old: '<li>\n                  Extract all even pages (2, 4, 6...) or all odd pages (1, 3,\n                  5...) into a new PDF.\n                </li>',
      neu: '<li data-i18n="tools:splitPdf.howEvenOdd1">\n                  Extract all even pages (2, 4, 6...) or all odd pages (1, 3,\n                  5...) into a new PDF.\n                </li>',
    },
    {
      old: '>Even Pages</label',
      neu: ' data-i18n="tools:splitPdf.evenPages">Even Pages</label',
    },
    {
      old: '>Odd Pages</label',
      neu: ' data-i18n="tools:splitPdf.oddPages">Odd Pages</label',
    },
    {
      old: '<li>\n                  Every single page of the PDF will be saved as a separate PDF\n                  file.\n                </li>',
      neu: '<li data-i18n="tools:splitPdf.howAll1">\n                  Every single page of the PDF will be saved as a separate PDF\n                  file.\n                </li>',
    },
    {
      old: '<li>\n                  The result will be downloaded as a ZIP file containing all the\n                  pages.\n                </li>',
      neu: '<li data-i18n="tools:splitPdf.howAll2">\n                  The result will be downloaded as a ZIP file containing all the\n                  pages.\n                </li>',
    },
    {
      old: '<li>\n                  Click on the page thumbnails below to select the pages you\n                  want to extract.\n                </li>',
      neu: '<li data-i18n="tools:splitPdf.howVisual1">\n                  Click on the page thumbnails below to select the pages you\n                  want to extract.\n                </li>',
    },
    {
      old: '<li>Selected pages will be highlighted.</li>',
      neu: '<li data-i18n="tools:splitPdf.howVisual2">Selected pages will be highlighted.</li>',
    },
    {
      old: '<li>Split the PDF based on its bookmarks (outline).</li>',
      neu: '<li data-i18n="tools:splitPdf.howBookmarks1">Split the PDF based on its bookmarks (outline).</li>',
    },
    {
      old: '<li>Select the bookmark level to split at.</li>',
      neu: '<li data-i18n="tools:splitPdf.howBookmarks2">Select the bookmark level to split at.</li>',
    },
    {
      old: '>Bookmark Level</label',
      neu: ' data-i18n="tools:splitPdf.bookmarkLevel">Bookmark Level</label',
    },
    {
      old: '<option value="all" selected>All Levels</option>',
      neu: '<option value="all" selected data-i18n="tools:splitPdf.levelAll">All Levels</option>',
    },
    {
      old: '<option value="0">Level 0 (Top Level Only)</option>',
      neu: '<option value="0" data-i18n="tools:splitPdf.level0">Level 0 (Top Level Only)</option>',
    },
    {
      old: '<option value="1">Level 1</option>',
      neu: '<option value="1" data-i18n="tools:splitPdf.level1">Level 1</option>',
    },
    {
      old: '<option value="2">Level 2</option>',
      neu: '<option value="2" data-i18n="tools:splitPdf.level2">Level 2</option>',
    },
    {
      old: '<option value="3">Level 3</option>',
      neu: '<option value="3" data-i18n="tools:splitPdf.level3">Level 3</option>',
    },
    {
      old: '<li>\n                  Split the PDF into multiple files, each containing N pages.\n                </li>',
      neu: '<li data-i18n="tools:splitPdf.howNTimes1">\n                  Split the PDF into multiple files, each containing N pages.\n                </li>',
    },
    {
      old: '>Pages per file (N)</label',
      neu: ' data-i18n="tools:splitPdf.pagesPerFile">Pages per file (N)</label',
    },
    {
      old: '<p class="block mb-2 text-sm font-medium text-gray-300">Output</p>',
      neu: '<p class="block mb-2 text-sm font-medium text-gray-300" data-i18n="tools:splitPdf.outputLabel">Output</p>',
    },
    {
      old: '>Single combined PDF</label',
      neu: ' data-i18n="tools:splitPdf.outputCombine">Single combined PDF</label',
    },
    {
      old: '>One PDF per range</label',
      neu: ' data-i18n="tools:splitPdf.outputSeparate">One PDF per range</label',
    },
    {
      old: '<p class="mt-2 text-xs text-gray-400">\n              Multiple files are downloaded together as a ZIP.\n            </p>',
      neu: '<p class="mt-2 text-xs text-gray-400" data-i18n="tools:splitPdf.outputNote">\n              Multiple files are downloaded together as a ZIP.\n            </p>',
    },
    {
      old: '<button id="process-btn" class="btn-gradient w-full mt-6">\n            Split PDF\n          </button>',
      neu: '<button id="process-btn" class="btn-gradient w-full mt-6" data-i18n="tools:splitPdf.processBtn">\n            Split PDF\n          </button>',
    },
    {
      old: '<p id="loader-text" class="text-white text-lg font-medium">',
      neu: '<p id="loader-text" class="text-white text-lg font-medium" data-i18n="loader.processing">',
    },
    {
      old: '          id="alert-ok"',
      neu: '          id="alert-ok"\n          data-i18n="alert.ok"',
    },
    {
      old: '<h3 class="text-lg font-semibold text-white mb-1">Upload PDF</h3>\n            <p class="text-gray-400">\n              Select the PDF file you want to split or extract pages from\n            </p>',
      neu: '<h3 class="text-lg font-semibold text-white mb-1" data-i18n="tools:splitPdf.hiw1Title">Upload PDF</h3>\n            <p class="text-gray-400" data-i18n="tools:splitPdf.hiw1Desc">\n              Select the PDF file you want to split or extract pages from\n            </p>',
    },
    {
      old: '<h3 class="text-lg font-semibold text-white mb-1">\n              Choose Split Method\n            </h3>\n            <p class="text-gray-400">\n              Select specific pages, page ranges, or split into individual pages\n            </p>',
      neu: '<h3 class="text-lg font-semibold text-white mb-1" data-i18n="tools:splitPdf.hiw2Title">\n              Choose Split Method\n            </h3>\n            <p class="text-gray-400" data-i18n="tools:splitPdf.hiw2Desc">\n              Select specific pages, page ranges, or split into individual pages\n            </p>',
    },
    {
      old: '<h3 class="text-lg font-semibold text-white mb-1">\n              Preview & Select\n            </h3>\n            <p class="text-gray-400">\n              View page thumbnails and select exactly which pages you want\n            </p>',
      neu: '<h3 class="text-lg font-semibold text-white mb-1" data-i18n="tools:splitPdf.hiw3Title">\n              Preview & Select\n            </h3>\n            <p class="text-gray-400" data-i18n="tools:splitPdf.hiw3Desc">\n              View page thumbnails and select exactly which pages you want\n            </p>',
    },
    {
      old: '<h3 class="text-lg font-semibold text-white mb-1">\n              Split & Download\n            </h3>\n            <p class="text-gray-400">\n              Download extracted pages as separate PDFs or as a ZIP file\n            </p>',
      neu: '<h3 class="text-lg font-semibold text-white mb-1" data-i18n="tools:splitPdf.hiw4Title">\n              Split & Download\n            </h3>\n            <p class="text-gray-400" data-i18n="tools:splitPdf.hiw4Desc">\n              Download extracted pages as separate PDFs or as a ZIP file\n            </p>',
    },
    {
      old: '<h3 class="text-white font-semibold mb-1">Merge Pdf</h3>',
      neu: '<h3 class="text-white font-semibold mb-1" data-i18n="tools:mergePdf.name">Merge Pdf</h3>',
    },
    {
      old: '<p class="text-gray-400 text-sm">Free online merge pdf tool</p>',
      neu: '<p class="text-gray-400 text-sm" data-i18n="tools:mergePdf.cardDesc">Free online merge pdf tool</p>',
    },
    {
      old: '<h3 class="text-white font-semibold mb-1">Extract Pages</h3>',
      neu: '<h3 class="text-white font-semibold mb-1" data-i18n="tools:extractPages.name">Extract Pages</h3>',
    },
    {
      old: '<p class="text-gray-400 text-sm">Free online extract pages tool</p>',
      neu: '<p class="text-gray-400 text-sm" data-i18n="tools:extractPages.cardDesc">Free online extract pages tool</p>',
    },
    {
      old: '<h3 class="text-white font-semibold mb-1">Organize Pdf</h3>',
      neu: '<h3 class="text-white font-semibold mb-1" data-i18n="tools:duplicateOrganize.name">Organize Pdf</h3>',
    },
    {
      old: '<p class="text-gray-400 text-sm">Free online organize pdf tool</p>',
      neu: '<p class="text-gray-400 text-sm" data-i18n="tools:duplicateOrganize.cardDesc">Free online organize pdf tool</p>',
    },
    {
      old: '<h3 class="text-white font-semibold mb-1">Compress Pdf</h3>',
      neu: '<h3 class="text-white font-semibold mb-1" data-i18n="tools:compressPdf.name">Compress Pdf</h3>',
    },
    {
      old: '<p class="text-gray-400 text-sm">Free online compress pdf tool</p>',
      neu: '<p class="text-gray-400 text-sm" data-i18n="tools:compressPdf.cardDesc">Free online compress pdf tool</p>',
    },
    {
      old: '<h3 class="text-white font-semibold mb-1">Delete Pages</h3>',
      neu: '<h3 class="text-white font-semibold mb-1" data-i18n="tools:deletePages.name">Delete Pages</h3>',
    },
    {
      old: '<p class="text-gray-400 text-sm">Free online delete pages tool</p>',
      neu: '<p class="text-gray-400 text-sm" data-i18n="tools:deletePages.cardDesc">Free online delete pages tool</p>',
    },
    {
      old: '            Can I extract specific page ranges?\n            <i data-lucide="chevron-down" class="w-5 h-5"></i>',
      neu: '            <span data-i18n="tools:splitPdf.faq1q">Can I extract specific page ranges?</span>\n            <i data-lucide="chevron-down" class="w-5 h-5"></i>',
    },
    {
      old: '<p class="mt-3 text-gray-400">\n            Yes! You can extract any specific pages or page ranges from your\n            PDF. Select exactly which pages you need or split into individual\n            files.\n          </p>',
      neu: '<p class="mt-3 text-gray-400" data-i18n="tools:splitPdf.faq1a">\n            Yes! You can extract any specific pages or page ranges from your\n            PDF. Select exactly which pages you need or split into individual\n            files.\n          </p>',
    },
    {
      old: '            Will split PDFs lose quality?\n            <i data-lucide="chevron-down" class="w-5 h-5"></i>',
      neu: '            <span data-i18n="tools:splitPdf.faq2q">Will split PDFs lose quality?</span>\n            <i data-lucide="chevron-down" class="w-5 h-5"></i>',
    },
    {
      old: '<p class="mt-3 text-gray-400">\n            No! Split PDFs maintain the exact same quality as the original\n            document. No compression or quality loss occurs.\n          </p>',
      neu: '<p class="mt-3 text-gray-400" data-i18n="tools:splitPdf.faq2a">\n            No! Split PDFs maintain the exact same quality as the original\n            document. No compression or quality loss occurs.\n          </p>',
    },
    {
      old: '            Can I split multiple PDFs at once?\n            <i data-lucide="chevron-down" class="w-5 h-5"></i>',
      neu: '            <span data-i18n="tools:splitPdf.faq3q">Can I split multiple PDFs at once?</span>\n            <i data-lucide="chevron-down" class="w-5 h-5"></i>',
    },
    {
      old: '<p class="mt-3 text-gray-400">\n            Yes, process multiple PDFs in batches for efficient document\n            management.\n          </p>',
      neu: '<p class="mt-3 text-gray-400" data-i18n="tools:splitPdf.faq3a">\n            Yes, process multiple PDFs in batches for efficient document\n            management.\n          </p>',
    },
  ],

  'src/pages/compress-pdf.html': [
    {
      old: '>Compression Algorithm</label',
      neu: ' data-i18n="tools:compressPdf.algorithmLabel">Compression Algorithm</label',
    },
    {
      old: '<option value="condense">Condense (Recommended)</option>',
      neu: '<option value="condense" data-i18n="tools:compressPdf.algoCondense">Condense (Recommended)</option>',
    },
    {
      old: '<option value="photon">Photon (For Photo-Heavy PDFs)</option>',
      neu: '<option value="photon" data-i18n="tools:compressPdf.algoPhoton">Photon (For Photo-Heavy PDFs)</option>',
    },
    {
      old: '<p id="condense-info">\n                <strong>Condense</strong> uses advanced compression: removes\n                dead-weight, optimizes images, subsets fonts. Best for most\n                PDFs.\n              </p>',
      neu: '<p id="condense-info">\n                <strong>Condense</strong>\n                <span data-i18n="tools:compressPdf.condenseInfo">uses advanced compression: removes\n                dead-weight, optimizes images, subsets fonts. Best for most\n                PDFs.</span>\n              </p>',
    },
    {
      old: '<p id="photon-info" class="hidden">\n                <strong>Photon</strong> converts pages to images. Use for\n                photo-heavy/scanned PDFs.\n                <span class="text-yellow-500"\n                  >⚠️ Warning: Text will become non-selectable and links will\n                  stop working.</span\n                >\n              </p>',
      neu: '<p id="photon-info" class="hidden">\n                <strong>Photon</strong>\n                <span data-i18n="tools:compressPdf.photonInfo">converts pages to images. Use for\n                photo-heavy/scanned PDFs.</span>\n                <span class="text-yellow-500" data-i18n="tools:compressPdf.photonWarning"\n                  >⚠️ Warning: Text will become non-selectable and links will\n                  stop working.</span\n                >\n              </p>',
    },
    {
      old: '>Compression Level</label',
      neu: ' data-i18n="tools:compressPdf.levelLabel">Compression Level</label',
    },
    {
      old: '<option value="light">Light (Preserve Quality)</option>',
      neu: '<option value="light" data-i18n="tools:compressPdf.levelLight">Light (Preserve Quality)</option>',
    },
    {
      old: '<option value="balanced" selected>Balanced (Recommended)</option>',
      neu: '<option value="balanced" selected data-i18n="tools:compressPdf.levelBalanced">Balanced (Recommended)</option>',
    },
    {
      old: '<option value="aggressive">Aggressive (Smaller Files)</option>',
      neu: '<option value="aggressive" data-i18n="tools:compressPdf.levelAggressive">Aggressive (Smaller Files)</option>',
    },
    {
      old: '<option value="extreme">Extreme (Maximum Compression)</option>',
      neu: '<option value="extreme" data-i18n="tools:compressPdf.levelExtreme">Extreme (Maximum Compression)</option>',
    },
    {
      old: '>Convert to Grayscale</label',
      neu: ' data-i18n="tools:compressPdf.grayscaleLabel">Convert to Grayscale</label',
    },
    {
      old: '<p class="text-xs text-gray-500 mt-0.5">\n                Reduces file size by removing color information\n              </p>',
      neu: '<p class="text-xs text-gray-500 mt-0.5" data-i18n="tools:compressPdf.grayscaleDesc">\n                Reduces file size by removing color information\n              </p>',
    },
    {
      old: '<span>Custom Settings</span>',
      neu: '<span data-i18n="tools:compressPdf.customSettings">Custom Settings</span>',
    },
    {
      old: '<div class="text-sm text-gray-400 mb-2">\n                Fine-tune compression parameters:\n              </div>',
      neu: '<div class="text-sm text-gray-400 mb-2" data-i18n="tools:compressPdf.customSettingsHint">\n                Fine-tune compression parameters:\n              </div>',
    },
    {
      old: '>Output Quality</label',
      neu: ' data-i18n="tools:compressPdf.outputQuality">Output Quality</label',
    },
    {
      old: '>Resize Images To</label',
      neu: ' data-i18n="tools:compressPdf.resizeImagesTo">Resize Images To</label',
    },
    {
      old: '>Only Process Above</label',
      neu: ' data-i18n="tools:compressPdf.onlyProcessAbove">Only Process Above</label',
    },
    {
      old: '<span class="text-sm text-gray-300">Remove metadata</span>',
      neu: '<span class="text-sm text-gray-300" data-i18n="tools:compressPdf.removeMetadata">Remove metadata</span>',
    },
    {
      old: '<span class="text-sm text-gray-300"\n                    >Subset fonts (remove unused glyphs)</span\n                  >',
      neu: '<span class="text-sm text-gray-300" data-i18n="tools:compressPdf.subsetFonts"\n                    >Subset fonts (remove unused glyphs)</span\n                  >',
    },
    {
      old: '<span class="text-sm text-gray-300"\n                    >Remove embedded thumbnails</span\n                  >',
      neu: '<span class="text-sm text-gray-300" data-i18n="tools:compressPdf.removeThumbnails"\n                    >Remove embedded thumbnails</span\n                  >',
    },
    {
      old: '<button id="process-btn" class="btn-gradient w-full mt-4">\n            Compress PDF\n          </button>',
      neu: '<button id="process-btn" class="btn-gradient w-full mt-4" data-i18n="tools:compressPdf.processBtn">\n            Compress PDF\n          </button>',
    },
    {
      old: '<p id="loader-text" class="text-white text-lg font-medium">',
      neu: '<p id="loader-text" class="text-white text-lg font-medium" data-i18n="loader.processing">',
    },
    {
      old: '          id="alert-ok"',
      neu: '          id="alert-ok"\n          data-i18n="alert.ok"',
    },
    {
      old: '<h3 class="text-lg font-semibold text-white mb-1">Upload PDFs</h3>\n            <p class="text-gray-400">\n              Click or drag and drop one or more PDF files\n            </p>',
      neu: '<h3 class="text-lg font-semibold text-white mb-1" data-i18n="tools:compressPdf.hiw1Title">Upload PDFs</h3>\n            <p class="text-gray-400" data-i18n="tools:compressPdf.hiw1Desc">\n              Click or drag and drop one or more PDF files\n            </p>',
    },
    {
      old: '<h3 class="text-lg font-semibold text-white mb-1">\n              Choose Algorithm\n            </h3>\n            <p class="text-gray-400">\n              Select Condense (recommended) or Photon (for photo-heavy PDFs)\n            </p>',
      neu: '<h3 class="text-lg font-semibold text-white mb-1" data-i18n="tools:compressPdf.hiw2Title">\n              Choose Algorithm\n            </h3>\n            <p class="text-gray-400" data-i18n="tools:compressPdf.hiw2Desc">\n              Select Condense (recommended) or Photon (for photo-heavy PDFs)\n            </p>',
    },
    {
      old: '<h3 class="text-lg font-semibold text-white mb-1">\n              Select Compression Level\n            </h3>\n            <p class="text-gray-400">\n              Pick Light, Balanced, Aggressive, or Extreme compression\n            </p>',
      neu: '<h3 class="text-lg font-semibold text-white mb-1" data-i18n="tools:compressPdf.hiw3Title">\n              Select Compression Level\n            </h3>\n            <p class="text-gray-400" data-i18n="tools:compressPdf.hiw3Desc">\n              Pick Light, Balanced, Aggressive, or Extreme compression\n            </p>',
    },
    {
      old: '<h3 class="text-lg font-semibold text-white mb-1">\n              Customize & Compress\n            </h3>\n            <p class="text-gray-400">\n              Optionally enable grayscale or custom settings, then compress\n            </p>',
      neu: '<h3 class="text-lg font-semibold text-white mb-1" data-i18n="tools:compressPdf.hiw4Title">\n              Customize & Compress\n            </h3>\n            <p class="text-gray-400" data-i18n="tools:compressPdf.hiw4Desc">\n              Optionally enable grayscale or custom settings, then compress\n            </p>',
    },
    {
      old: '<h3 class="text-lg font-semibold text-white mb-1">Download</h3>\n            <p class="text-gray-400">\n              Save your compressed PDFs - up to 90% smaller\n            </p>',
      neu: '<h3 class="text-lg font-semibold text-white mb-1" data-i18n="tools:compressPdf.hiw5Title">Download</h3>\n            <p class="text-gray-400" data-i18n="tools:compressPdf.hiw5Desc">\n              Save your compressed PDFs - up to 90% smaller\n            </p>',
    },
    {
      old: '<h3 class="text-white font-semibold mb-1">Merge Pdf</h3>',
      neu: '<h3 class="text-white font-semibold mb-1" data-i18n="tools:mergePdf.name">Merge Pdf</h3>',
    },
    {
      old: '<p class="text-gray-400 text-sm">Free online merge pdf tool</p>',
      neu: '<p class="text-gray-400 text-sm" data-i18n="tools:mergePdf.cardDesc">Free online merge pdf tool</p>',
    },
    {
      old: '<h3 class="text-white font-semibold mb-1">Split Pdf</h3>',
      neu: '<h3 class="text-white font-semibold mb-1" data-i18n="tools:splitPdf.name">Split Pdf</h3>',
    },
    {
      old: '<p class="text-gray-400 text-sm">Free online split pdf tool</p>',
      neu: '<p class="text-gray-400 text-sm" data-i18n="tools:splitPdf.cardDesc">Free online split pdf tool</p>',
    },
    {
      old: '<h3 class="text-white font-semibold mb-1">Pdf To Jpg</h3>',
      neu: '<h3 class="text-white font-semibold mb-1" data-i18n="tools:pdfToJpg.name">Pdf To Jpg</h3>',
    },
    {
      old: '<p class="text-gray-400 text-sm">Free online pdf to jpg tool</p>',
      neu: '<p class="text-gray-400 text-sm" data-i18n="tools:pdfToJpg.cardDesc">Free online pdf to jpg tool</p>',
    },
    {
      old: '            What\'s the difference between Condense and Photon?\n            <i data-lucide="chevron-down" class="w-5 h-5"></i>',
      neu: '            <span data-i18n="tools:compressPdf.faq1q">What\'s the difference between Condense and Photon?</span>\n            <i data-lucide="chevron-down" class="w-5 h-5"></i>',
    },
    {
      old: '<p class="mt-3 text-gray-400">\n            Condense removes dead-weight, optimizes images, and subsets fonts -\n            best for most PDFs. Photon converts pages to images - ideal for\n            photo-heavy/scanned PDFs but makes text non-selectable.\n          </p>',
      neu: '<p class="mt-3 text-gray-400" data-i18n="tools:compressPdf.faq1a">\n            Condense removes dead-weight, optimizes images, and subsets fonts -\n            best for most PDFs. Photon converts pages to images - ideal for\n            photo-heavy/scanned PDFs but makes text non-selectable.\n          </p>',
    },
    {
      old: '            Which compression level should I use?\n            <i data-lucide="chevron-down" class="w-5 h-5"></i>',
      neu: '            <span data-i18n="tools:compressPdf.faq2q">Which compression level should I use?</span>\n            <i data-lucide="chevron-down" class="w-5 h-5"></i>',
    },
    {
      old: '<p class="mt-3 text-gray-400">\n            Balanced (recommended) offers great size reduction with minimal\n            quality loss. Use Light to preserve maximum quality, Aggressive for\n            smaller files, or Extreme for maximum compression.\n          </p>',
      neu: '<p class="mt-3 text-gray-400" data-i18n="tools:compressPdf.faq2a">\n            Balanced (recommended) offers great size reduction with minimal\n            quality loss. Use Light to preserve maximum quality, Aggressive for\n            smaller files, or Extreme for maximum compression.\n          </p>',
    },
    {
      old: '            Are there file size limits?\n            <i data-lucide="chevron-down" class="w-5 h-5"></i>',
      neu: '            <span data-i18n="tools:compressPdf.faq3q">Are there file size limits?</span>\n            <i data-lucide="chevron-down" class="w-5 h-5"></i>',
    },
    {
      old: '<p class="mt-3 text-gray-400">\n            No limits! Compress as many PDFs as you need, of any size,\n            completely free.\n          </p>',
      neu: '<p class="mt-3 text-gray-400" data-i18n="tools:compressPdf.faq3a">\n            No limits! Compress as many PDFs as you need, of any size,\n            completely free.\n          </p>',
    },
  ],

  'src/pages/jpg-to-pdf.html': [
    {
      old: '            >\n              PDF Quality\n            </label>',
      neu: '              data-i18n="tools:jpgToPdf.qualityLabel"\n            >\n              PDF Quality\n            </label>',
    },
    {
      old: '<option value="high">High Quality (Larger file)</option>',
      neu: '<option value="high" data-i18n="tools:jpgToPdf.qualityHigh">High Quality (Larger file)</option>',
    },
    {
      old: '<option value="medium" selected>Medium Quality (Balanced)</option>',
      neu: '<option value="medium" selected data-i18n="tools:jpgToPdf.qualityMedium">Medium Quality (Balanced)</option>',
    },
    {
      old: '<option value="low">Low Quality (Smaller file)</option>',
      neu: '<option value="low" data-i18n="tools:jpgToPdf.qualityLow">Low Quality (Smaller file)</option>',
    },
    {
      old: '<p class="mt-1 text-xs text-gray-400">\n              Controls image compression when embedding into PDF\n            </p>',
      neu: '<p class="mt-1 text-xs text-gray-400" data-i18n="tools:jpgToPdf.qualityNote">\n              Controls image compression when embedding into PDF\n            </p>',
    },
    {
      old: '<button id="process-btn" class="btn-gradient w-full mt-6">\n            Convert to PDF\n          </button>',
      neu: '<button id="process-btn" class="btn-gradient w-full mt-6" data-i18n="tools:jpgToPdf.processBtn">\n            Convert to PDF\n          </button>',
    },
    {
      old: '<p id="loader-text" class="text-white text-lg font-medium">',
      neu: '<p id="loader-text" class="text-white text-lg font-medium" data-i18n="loader.processing">',
    },
    {
      old: '          id="alert-ok"',
      neu: '          id="alert-ok"\n          data-i18n="alert.ok"',
    },
    {
      old: '<h3 class="text-lg font-semibold text-white mb-1">Upload File</h3>',
      neu: '<h3 class="text-lg font-semibold text-white mb-1" data-i18n="howItWorks.step1Title">Upload File</h3>',
    },
    {
      old: '<h3 class="text-lg font-semibold text-white mb-1">Process</h3>',
      neu: '<h3 class="text-lg font-semibold text-white mb-1" data-i18n="howItWorks.step2Title">Process</h3>',
    },
    {
      old: '<h3 class="text-lg font-semibold text-white mb-1">Download</h3>',
      neu: '<h3 class="text-lg font-semibold text-white mb-1" data-i18n="howItWorks.step3Title">Download</h3>',
    },
    {
      old: '<h3 class="text-white font-semibold mb-1">Merge Pdf</h3>',
      neu: '<h3 class="text-white font-semibold mb-1" data-i18n="tools:mergePdf.name">Merge Pdf</h3>',
    },
    {
      old: '<p class="text-gray-400 text-sm">Free online merge pdf tool</p>',
      neu: '<p class="text-gray-400 text-sm" data-i18n="tools:mergePdf.cardDesc">Free online merge pdf tool</p>',
    },
    {
      old: '<h3 class="text-white font-semibold mb-1">Compress Pdf</h3>',
      neu: '<h3 class="text-white font-semibold mb-1" data-i18n="tools:compressPdf.name">Compress Pdf</h3>',
    },
    {
      old: '<p class="text-gray-400 text-sm">Free online compress pdf tool</p>',
      neu: '<p class="text-gray-400 text-sm" data-i18n="tools:compressPdf.cardDesc">Free online compress pdf tool</p>',
    },
    {
      old: '<h3 class="text-white font-semibold mb-1">Split Pdf</h3>',
      neu: '<h3 class="text-white font-semibold mb-1" data-i18n="tools:splitPdf.name">Split Pdf</h3>',
    },
    {
      old: '<p class="text-gray-400 text-sm">Free online split pdf tool</p>',
      neu: '<p class="text-gray-400 text-sm" data-i18n="tools:splitPdf.cardDesc">Free online split pdf tool</p>',
    },
    {
      old: '<h3 class="text-white font-semibold mb-1">Edit Pdf</h3>',
      neu: '<h3 class="text-white font-semibold mb-1" data-i18n="tools:pdfEditor.name">Edit Pdf</h3>',
    },
    {
      old: '<p class="text-gray-400 text-sm">Free online edit pdf tool</p>',
      neu: '<p class="text-gray-400 text-sm" data-i18n="tools:pdfEditor.cardDesc">Free online edit pdf tool</p>',
    },
    {
      old: '<h3 class="text-white font-semibold mb-1">Rotate Pdf</h3>',
      neu: '<h3 class="text-white font-semibold mb-1" data-i18n="tools:rotatePdf.name">Rotate Pdf</h3>',
    },
    {
      old: '<p class="text-gray-400 text-sm">Free online rotate pdf tool</p>',
      neu: '<p class="text-gray-400 text-sm" data-i18n="tools:rotatePdf.cardDesc">Free online rotate pdf tool</p>',
    },
    {
      old: '            Is jpg to pdf really free?\n            <i data-lucide="chevron-down" class="w-5 h-5"></i>',
      neu: '            <span data-i18n="tools:jpgToPdf.faq1q">Is jpg to pdf really free?</span>\n            <i data-lucide="chevron-down" class="w-5 h-5"></i>',
    },
    {
      old: '<p class="mt-3 text-gray-400">\n            Yes! BentoPDF is 100% free with no hidden fees, no signup required,\n            and unlimited file processing.\n          </p>',
      neu: '<p class="mt-3 text-gray-400" data-i18n="tools:jpgToPdf.faq1a">\n            Yes! BentoPDF is 100% free with no hidden fees, no signup required,\n            and unlimited file processing.\n          </p>',
    },
    {
      old: '            Are my files private and secure?\n            <i data-lucide="chevron-down" class="w-5 h-5"></i>',
      neu: '            <span data-i18n="tools:jpgToPdf.faq2q">Are my files private and secure?</span>\n            <i data-lucide="chevron-down" class="w-5 h-5"></i>',
    },
    {
      old: '<p class="mt-3 text-gray-400">\n            Absolutely! All processing happens in your browser. Your files never\n            leave your device, ensuring complete privacy.\n          </p>',
      neu: '<p class="mt-3 text-gray-400" data-i18n="tools:jpgToPdf.faq2a">\n            Absolutely! All processing happens in your browser. Your files never\n            leave your device, ensuring complete privacy.\n          </p>',
    },
    {
      old: '            Is there a file size limit?\n            <i data-lucide="chevron-down" class="w-5 h-5"></i>',
      neu: '            <span data-i18n="tools:jpgToPdf.faq3q">Is there a file size limit?</span>\n            <i data-lucide="chevron-down" class="w-5 h-5"></i>',
    },
    {
      old: '<p class="mt-3 text-gray-400">\n            No! Process files of any size, as many times as you want, completely\n            free.\n          </p>',
      neu: '<p class="mt-3 text-gray-400" data-i18n="tools:jpgToPdf.faq3a">\n            No! Process files of any size, as many times as you want, completely\n            free.\n          </p>',
    },
  ],

  'src/pages/edit-pdf.html': [
    {
      old: '<p id="loader-text" class="text-white text-lg font-medium">',
      neu: '<p id="loader-text" class="text-white text-lg font-medium" data-i18n="loader.processing">',
    },
    {
      old: '          id="alert-ok"',
      neu: '          id="alert-ok"\n          data-i18n="alert.ok"',
    },
    {
      old: '<h3 class="text-lg font-semibold text-white mb-1">Upload File</h3>',
      neu: '<h3 class="text-lg font-semibold text-white mb-1" data-i18n="howItWorks.step1Title">Upload File</h3>',
    },
    {
      old: '<h3 class="text-lg font-semibold text-white mb-1">Process</h3>',
      neu: '<h3 class="text-lg font-semibold text-white mb-1" data-i18n="howItWorks.step2Title">Process</h3>',
    },
    {
      old: '<h3 class="text-lg font-semibold text-white mb-1">Download</h3>',
      neu: '<h3 class="text-lg font-semibold text-white mb-1" data-i18n="howItWorks.step3Title">Download</h3>',
    },
    {
      old: '<h3 class="text-white font-semibold mb-1">Compress Pdf</h3>',
      neu: '<h3 class="text-white font-semibold mb-1" data-i18n="tools:compressPdf.name">Compress Pdf</h3>',
    },
    {
      old: '<p class="text-gray-400 text-sm">Free online compress pdf tool</p>',
      neu: '<p class="text-gray-400 text-sm" data-i18n="tools:compressPdf.cardDesc">Free online compress pdf tool</p>',
    },
    {
      old: '<h3 class="text-white font-semibold mb-1">Merge Pdf</h3>',
      neu: '<h3 class="text-white font-semibold mb-1" data-i18n="tools:mergePdf.name">Merge Pdf</h3>',
    },
    {
      old: '<p class="text-gray-400 text-sm">Free online merge pdf tool</p>',
      neu: '<p class="text-gray-400 text-sm" data-i18n="tools:mergePdf.cardDesc">Free online merge pdf tool</p>',
    },
    {
      old: '<h3 class="text-white font-semibold mb-1">Rotate Pdf</h3>',
      neu: '<h3 class="text-white font-semibold mb-1" data-i18n="tools:rotatePdf.name">Rotate Pdf</h3>',
    },
    {
      old: '<p class="text-gray-400 text-sm">Free online rotate pdf tool</p>',
      neu: '<p class="text-gray-400 text-sm" data-i18n="tools:rotatePdf.cardDesc">Free online rotate pdf tool</p>',
    },
    {
      old: '<h3 class="text-white font-semibold mb-1">Delete Pages</h3>',
      neu: '<h3 class="text-white font-semibold mb-1" data-i18n="tools:deletePages.name">Delete Pages</h3>',
    },
    {
      old: '<p class="text-gray-400 text-sm">Free online delete pages tool</p>',
      neu: '<p class="text-gray-400 text-sm" data-i18n="tools:deletePages.cardDesc">Free online delete pages tool</p>',
    },
    {
      old: '<h3 class="text-white font-semibold mb-1">Add Watermark</h3>',
      neu: '<h3 class="text-white font-semibold mb-1" data-i18n="tools:addWatermark.name">Add Watermark</h3>',
    },
    {
      old: '<p class="text-gray-400 text-sm">Free online add watermark tool</p>',
      neu: '<p class="text-gray-400 text-sm" data-i18n="tools:addWatermark.cardDesc">Free online add watermark tool</p>',
    },
    {
      old: '            Is edit pdf really free?\n            <i data-lucide="chevron-down" class="w-5 h-5"></i>',
      neu: '            <span data-i18n="tools:pdfEditor.faq1q">Is edit pdf really free?</span>\n            <i data-lucide="chevron-down" class="w-5 h-5"></i>',
    },
    {
      old: '<p class="mt-3 text-gray-400">\n            Yes! BentoPDF is 100% free with no hidden fees, no signup required,\n            and unlimited file processing.\n          </p>',
      neu: '<p class="mt-3 text-gray-400" data-i18n="tools:pdfEditor.faq1a">\n            Yes! BentoPDF is 100% free with no hidden fees, no signup required,\n            and unlimited file processing.\n          </p>',
    },
    {
      old: '            Are my files private and secure?\n            <i data-lucide="chevron-down" class="w-5 h-5"></i>',
      neu: '            <span data-i18n="tools:pdfEditor.faq2q">Are my files private and secure?</span>\n            <i data-lucide="chevron-down" class="w-5 h-5"></i>',
    },
    {
      old: '<p class="mt-3 text-gray-400">\n            Absolutely! All processing happens in your browser. Your files never\n            leave your device, ensuring complete privacy.\n          </p>',
      neu: '<p class="mt-3 text-gray-400" data-i18n="tools:pdfEditor.faq2a">\n            Absolutely! All processing happens in your browser. Your files never\n            leave your device, ensuring complete privacy.\n          </p>',
    },
    {
      old: '            Is there a file size limit?\n            <i data-lucide="chevron-down" class="w-5 h-5"></i>',
      neu: '            <span data-i18n="tools:pdfEditor.faq3q">Is there a file size limit?</span>\n            <i data-lucide="chevron-down" class="w-5 h-5"></i>',
    },
    {
      old: '<p class="mt-3 text-gray-400">\n            No! Process files of any size, as many times as you want, completely\n            free.\n          </p>',
      neu: '<p class="mt-3 text-gray-400" data-i18n="tools:pdfEditor.faq3a">\n            No! Process files of any size, as many times as you want, completely\n            free.\n          </p>',
    },
  ],

  'src/pages/sign-pdf.html': [
    {
      old: '            Flatten PDF (use the Save button below)\n          </label>',
      neu: '            <span data-i18n="tools:signPdf.flattenLabel">Flatten PDF (use the Save button below)</span>\n          </label>',
    },
    {
      old: '          style="display: none"\n        >\n          Save & Download Signed PDF',
      neu: '          style="display: none"\n          data-i18n="tools:signPdf.processBtn"\n        >\n          Save & Download Signed PDF',
    },
    {
      old: '<p id="loader-text" class="text-white text-lg font-medium">',
      neu: '<p id="loader-text" class="text-white text-lg font-medium" data-i18n="loader.processing">',
    },
    {
      old: '          id="alert-ok"',
      neu: '          id="alert-ok"\n          data-i18n="alert.ok"',
    },
    {
      old: '<h3 class="text-lg font-semibold text-white mb-1">Upload File</h3>',
      neu: '<h3 class="text-lg font-semibold text-white mb-1" data-i18n="howItWorks.step1Title">Upload File</h3>',
    },
    {
      old: '<h3 class="text-lg font-semibold text-white mb-1">Process</h3>',
      neu: '<h3 class="text-lg font-semibold text-white mb-1" data-i18n="howItWorks.step2Title">Process</h3>',
    },
    {
      old: '<h3 class="text-lg font-semibold text-white mb-1">Download</h3>',
      neu: '<h3 class="text-lg font-semibold text-white mb-1" data-i18n="howItWorks.step3Title">Download</h3>',
    },
    {
      old: '<h3 class="text-white font-semibold mb-1">Merge Pdf</h3>',
      neu: '<h3 class="text-white font-semibold mb-1" data-i18n="tools:mergePdf.name">Merge Pdf</h3>',
    },
    {
      old: '<p class="text-gray-400 text-sm">Free online merge pdf tool</p>',
      neu: '<p class="text-gray-400 text-sm" data-i18n="tools:mergePdf.cardDesc">Free online merge pdf tool</p>',
    },
    {
      old: '<h3 class="text-white font-semibold mb-1">Compress Pdf</h3>',
      neu: '<h3 class="text-white font-semibold mb-1" data-i18n="tools:compressPdf.name">Compress Pdf</h3>',
    },
    {
      old: '<p class="text-gray-400 text-sm">Free online compress pdf tool</p>',
      neu: '<p class="text-gray-400 text-sm" data-i18n="tools:compressPdf.cardDesc">Free online compress pdf tool</p>',
    },
    {
      old: '<h3 class="text-white font-semibold mb-1">Split Pdf</h3>',
      neu: '<h3 class="text-white font-semibold mb-1" data-i18n="tools:splitPdf.name">Split Pdf</h3>',
    },
    {
      old: '<p class="text-gray-400 text-sm">Free online split pdf tool</p>',
      neu: '<p class="text-gray-400 text-sm" data-i18n="tools:splitPdf.cardDesc">Free online split pdf tool</p>',
    },
    {
      old: '<h3 class="text-white font-semibold mb-1">Edit Pdf</h3>',
      neu: '<h3 class="text-white font-semibold mb-1" data-i18n="tools:pdfEditor.name">Edit Pdf</h3>',
    },
    {
      old: '<p class="text-gray-400 text-sm">Free online edit pdf tool</p>',
      neu: '<p class="text-gray-400 text-sm" data-i18n="tools:pdfEditor.cardDesc">Free online edit pdf tool</p>',
    },
    {
      old: '<h3 class="text-white font-semibold mb-1">Rotate Pdf</h3>',
      neu: '<h3 class="text-white font-semibold mb-1" data-i18n="tools:rotatePdf.name">Rotate Pdf</h3>',
    },
    {
      old: '<p class="text-gray-400 text-sm">Free online rotate pdf tool</p>',
      neu: '<p class="text-gray-400 text-sm" data-i18n="tools:rotatePdf.cardDesc">Free online rotate pdf tool</p>',
    },
    {
      old: '            Is sign pdf really free?\n            <i data-lucide="chevron-down" class="w-5 h-5"></i>',
      neu: '            <span data-i18n="tools:signPdf.faq1q">Is sign pdf really free?</span>\n            <i data-lucide="chevron-down" class="w-5 h-5"></i>',
    },
    {
      old: '<p class="mt-3 text-gray-400">\n            Yes! BentoPDF is 100% free with no hidden fees, no signup required,\n            and unlimited file processing.\n          </p>',
      neu: '<p class="mt-3 text-gray-400" data-i18n="tools:signPdf.faq1a">\n            Yes! BentoPDF is 100% free with no hidden fees, no signup required,\n            and unlimited file processing.\n          </p>',
    },
    {
      old: '            Are my files private and secure?\n            <i data-lucide="chevron-down" class="w-5 h-5"></i>',
      neu: '            <span data-i18n="tools:signPdf.faq2q">Are my files private and secure?</span>\n            <i data-lucide="chevron-down" class="w-5 h-5"></i>',
    },
    {
      old: '<p class="mt-3 text-gray-400">\n            Absolutely! All processing happens in your browser. Your files never\n            leave your device, ensuring complete privacy.\n          </p>',
      neu: '<p class="mt-3 text-gray-400" data-i18n="tools:signPdf.faq2a">\n            Absolutely! All processing happens in your browser. Your files never\n            leave your device, ensuring complete privacy.\n          </p>',
    },
    {
      old: '            Is there a file size limit?\n            <i data-lucide="chevron-down" class="w-5 h-5"></i>',
      neu: '            <span data-i18n="tools:signPdf.faq3q">Is there a file size limit?</span>\n            <i data-lucide="chevron-down" class="w-5 h-5"></i>',
    },
    {
      old: '<p class="mt-3 text-gray-400">\n            No! Process files of any size, as many times as you want, completely\n            free.\n          </p>',
      neu: '<p class="mt-3 text-gray-400" data-i18n="tools:signPdf.faq3a">\n            No! Process files of any size, as many times as you want, completely\n            free.\n          </p>',
    },
  ],
};

/* ---------------- 新增翻译键 ---------------- */
const I18N = {
  common: {
    en: { howItWorks: { hint: 'How it works:' } },
    zh: { howItWorks: { hint: '操作说明：' } },
  },
  tools: {
    en: {
      mergePdf: {
        fileMode: 'File Mode',
        pageMode: 'Page Mode',
        howFile1a: 'Click and drag the',
        howFile1b: 'icon to change the order of the files.',
        howFile2:
          'In the "Pages" box for each file, you can specify ranges (e.g., "1-3, 5") to merge only those pages.',
        howFile3:
          'Leave the "Pages" box blank to include all pages from that file.',
        howPage1: 'All pages from your uploaded PDFs are shown below.',
        howPage2:
          'Simply drag and drop the individual page thumbnails to create the exact order you want for your new file.',
        processBtn: 'Merge PDFs',
        hiw1Title: 'Upload PDFs',
        hiw1Desc:
          'Select or drag and drop multiple PDF files you want to merge',
        hiw2Title: 'Arrange Order',
        hiw2Desc:
          'Drag files up or down to reorder them in your preferred sequence',
        hiw3Title: 'Merge Files',
        hiw3Desc:
          'Click the merge button to combine all PDFs into a single document',
        hiw4Title: 'Download',
        hiw4Desc:
          'Save your merged PDF - all pages combined in the order you chose',
        faq1q: 'How many PDFs can I merge at once?',
        faq1a:
          'Unlimited! Merge as many PDF files as you need in a single operation. No restrictions on file count or total size.',
        faq2q: 'Will merging reduce PDF quality?',
        faq2a:
          'No! BentoPDF preserves the original quality of all PDFs when merging. Your documents remain crisp and clear with no quality loss.',
        faq3q: 'Can I reorder pages after selecting files?',
        faq3a:
          'Yes! Simply drag and drop files to arrange them in any order before clicking the merge button.',
        cardDesc: 'Free online merge pdf tool',
      },
      splitPdf: {
        splitModeLabel: 'Split Mode',
        modeRange: 'Extract by Page Range (Default)',
        modeEvenOdd: 'Split by Even/Odd Pages',
        modeAll: 'Split All Pages into Separate Files',
        modeVisual: 'Select Pages Visually',
        modeBookmarks: 'Split by Bookmarks',
        modeNTimes: 'Split N Times',
        howRange1: 'Enter page numbers separated by commas (e.g., 2, 8, 14).',
        howRange2: 'Enter page ranges using a hyphen (e.g., 5-10).',
        howRange3: 'Combine them for complex selections (e.g., 1-3, 7, 12-15).',
        pageRangeLabel: 'Page Range',
        pageRangePlaceholder: 'e.g. 1-5, 8, 11-13',
        howEvenOdd1:
          'Extract all even pages (2, 4, 6...) or all odd pages (1, 3, 5...) into a new PDF.',
        evenPages: 'Even Pages',
        oddPages: 'Odd Pages',
        howAll1:
          'Every single page of the PDF will be saved as a separate PDF file.',
        howAll2:
          'The result will be downloaded as a ZIP file containing all the pages.',
        howVisual1:
          'Click on the page thumbnails below to select the pages you want to extract.',
        howVisual2: 'Selected pages will be highlighted.',
        howBookmarks1: 'Split the PDF based on its bookmarks (outline).',
        howBookmarks2: 'Select the bookmark level to split at.',
        bookmarkLevel: 'Bookmark Level',
        levelAll: 'All Levels',
        level0: 'Level 0 (Top Level Only)',
        level1: 'Level 1',
        level2: 'Level 2',
        level3: 'Level 3',
        howNTimes1:
          'Split the PDF into multiple files, each containing N pages.',
        pagesPerFile: 'Pages per file (N)',
        outputLabel: 'Output',
        outputCombine: 'Single combined PDF',
        outputSeparate: 'One PDF per range',
        outputNote: 'Multiple files are downloaded together as a ZIP.',
        processBtn: 'Split PDF',
        hiw1Title: 'Upload PDF',
        hiw1Desc: 'Select the PDF file you want to split or extract pages from',
        hiw2Title: 'Choose Split Method',
        hiw2Desc:
          'Select specific pages, page ranges, or split into individual pages',
        hiw3Title: 'Preview & Select',
        hiw3Desc:
          'View page thumbnails and select exactly which pages you want',
        hiw4Title: 'Split & Download',
        hiw4Desc: 'Download extracted pages as separate PDFs or as a ZIP file',
        faq1q: 'Can I extract specific page ranges?',
        faq1a:
          'Yes! You can extract any specific pages or page ranges from your PDF. Select exactly which pages you need or split into individual files.',
        faq2q: 'Will split PDFs lose quality?',
        faq2a:
          'No! Split PDFs maintain the exact same quality as the original document. No compression or quality loss occurs.',
        faq3q: 'Can I split multiple PDFs at once?',
        faq3a:
          'Yes, process multiple PDFs in batches for efficient document management.',
        cardDesc: 'Free online split pdf tool',
      },
      compressPdf: {
        algorithmLabel: 'Compression Algorithm',
        algoCondense: 'Condense (Recommended)',
        algoPhoton: 'Photon (For Photo-Heavy PDFs)',
        condenseInfo:
          'uses advanced compression: removes dead-weight, optimizes images, subsets fonts. Best for most PDFs.',
        photonInfo:
          'converts pages to images. Use for photo-heavy/scanned PDFs.',
        photonWarning:
          '⚠️ Warning: Text will become non-selectable and links will stop working.',
        levelLabel: 'Compression Level',
        levelLight: 'Light (Preserve Quality)',
        levelBalanced: 'Balanced (Recommended)',
        levelAggressive: 'Aggressive (Smaller Files)',
        levelExtreme: 'Extreme (Maximum Compression)',
        grayscaleLabel: 'Convert to Grayscale',
        grayscaleDesc: 'Reduces file size by removing color information',
        customSettings: 'Custom Settings',
        customSettingsHint: 'Fine-tune compression parameters:',
        outputQuality: 'Output Quality',
        resizeImagesTo: 'Resize Images To',
        onlyProcessAbove: 'Only Process Above',
        removeMetadata: 'Remove metadata',
        subsetFonts: 'Subset fonts (remove unused glyphs)',
        removeThumbnails: 'Remove embedded thumbnails',
        processBtn: 'Compress PDF',
        hiw1Title: 'Upload PDFs',
        hiw1Desc: 'Click or drag and drop one or more PDF files',
        hiw2Title: 'Choose Algorithm',
        hiw2Desc:
          'Select Condense (recommended) or Photon (for photo-heavy PDFs)',
        hiw3Title: 'Select Compression Level',
        hiw3Desc: 'Pick Light, Balanced, Aggressive, or Extreme compression',
        hiw4Title: 'Customize & Compress',
        hiw4Desc:
          'Optionally enable grayscale or custom settings, then compress',
        hiw5Title: 'Download',
        hiw5Desc: 'Save your compressed PDFs - up to 90% smaller',
        faq1q: "What's the difference between Condense and Photon?",
        faq1a:
          'Condense removes dead-weight, optimizes images, and subsets fonts - best for most PDFs. Photon converts pages to images - ideal for photo-heavy/scanned PDFs but makes text non-selectable.',
        faq2q: 'Which compression level should I use?',
        faq2a:
          'Balanced (recommended) offers great size reduction with minimal quality loss. Use Light to preserve maximum quality, Aggressive for smaller files, or Extreme for maximum compression.',
        faq3q: 'Are there file size limits?',
        faq3a:
          'No limits! Compress as many PDFs as you need, of any size, completely free.',
        cardDesc: 'Free online compress pdf tool',
      },
      jpgToPdf: {
        qualityLabel: 'PDF Quality',
        qualityHigh: 'High Quality (Larger file)',
        qualityMedium: 'Medium Quality (Balanced)',
        qualityLow: 'Low Quality (Smaller file)',
        qualityNote: 'Controls image compression when embedding into PDF',
        processBtn: 'Convert to PDF',
        faq1q: 'Is jpg to pdf really free?',
        faq1a:
          'Yes! BentoPDF is 100% free with no hidden fees, no signup required, and unlimited file processing.',
        faq2q: 'Are my files private and secure?',
        faq2a:
          'Absolutely! All processing happens in your browser. Your files never leave your device, ensuring complete privacy.',
        faq3q: 'Is there a file size limit?',
        faq3a:
          'No! Process files of any size, as many times as you want, completely free.',
      },
      pdfEditor: {
        faq1q: 'Is edit pdf really free?',
        faq1a:
          'Yes! BentoPDF is 100% free with no hidden fees, no signup required, and unlimited file processing.',
        faq2q: 'Are my files private and secure?',
        faq2a:
          'Absolutely! All processing happens in your browser. Your files never leave your device, ensuring complete privacy.',
        faq3q: 'Is there a file size limit?',
        faq3a:
          'No! Process files of any size, as many times as you want, completely free.',
        cardDesc: 'Free online edit pdf tool',
      },
      signPdf: {
        flattenLabel: 'Flatten PDF (use the Save button below)',
        processBtn: 'Save & Download Signed PDF',
        faq1q: 'Is sign pdf really free?',
        faq1a:
          'Yes! BentoPDF is 100% free with no hidden fees, no signup required, and unlimited file processing.',
        faq2q: 'Are my files private and secure?',
        faq2a:
          'Absolutely! All processing happens in your browser. Your files never leave your device, ensuring complete privacy.',
        faq3q: 'Is there a file size limit?',
        faq3a:
          'No! Process files of any size, as many times as you want, completely free.',
      },
      rotatePdf: { cardDesc: 'Free online rotate pdf tool' },
      deletePages: { cardDesc: 'Free online delete pages tool' },
      extractPages: { cardDesc: 'Free online extract pages tool' },
      duplicateOrganize: { cardDesc: 'Free online organize pdf tool' },
      pdfToJpg: { cardDesc: 'Free online pdf to jpg tool' },
      addWatermark: { cardDesc: 'Free online add watermark tool' },
    },
    zh: {
      mergePdf: {
        fileMode: '文件模式',
        pageMode: '页面模式',
        howFile1a: '点击并拖动',
        howFile1b: '图标即可调整文件顺序。',
        howFile2:
          '在每个文件的“页码”框中，可以指定范围（如“1-3, 5”），仅合并这些页面。',
        howFile3: '“页码”框留空则包含该文件的全部页面。',
        howPage1: '已上传 PDF 的所有页面都显示在下方。',
        howPage2: '只需拖放页面缩略图，即可按你想要的顺序排列新文件。',
        processBtn: '合并 PDF',
        hiw1Title: '上传 PDF',
        hiw1Desc: '选择或拖放你要合并的多个 PDF 文件',
        hiw2Title: '排列顺序',
        hiw2Desc: '上下拖动文件，按你希望的顺序排列',
        hiw3Title: '合并文件',
        hiw3Desc: '点击合并按钮，将所有 PDF 合并为一个文档',
        hiw4Title: '下载',
        hiw4Desc: '保存合并后的 PDF——所有页面按你选择的顺序组合',
        faq1q: '一次可以合并多少个 PDF？',
        faq1a:
          '没有限制！一次操作即可合并任意数量的 PDF 文件，对文件数量和总大小均无限制。',
        faq2q: '合并会降低 PDF 质量吗？',
        faq2a:
          '不会！BentoPDF 在合并时会保留所有 PDF 的原始质量，文档保持清晰，无质量损失。',
        faq3q: '选择文件后可以重新排序吗？',
        faq3a: '可以！在点击合并按钮之前，拖放文件即可按任意顺序排列。',
        cardDesc: '免费在线 PDF 合并工具',
      },
      splitPdf: {
        splitModeLabel: '拆分方式',
        modeRange: '按页码范围提取（默认）',
        modeEvenOdd: '按奇偶页拆分',
        modeAll: '将所有页拆分为单独文件',
        modeVisual: '可视化选择页面',
        modeBookmarks: '按书签拆分',
        modeNTimes: '按每 N 页拆分',
        howRange1: '输入以逗号分隔的页码（如 2, 8, 14）。',
        howRange2: '用连字符输入页码范围（如 5-10）。',
        howRange3: '可组合使用以实现复杂选择（如 1-3, 7, 12-15）。',
        pageRangeLabel: '页码范围',
        pageRangePlaceholder: '例如 1-5, 8, 11-13',
        howEvenOdd1:
          '将所有偶数页（2、4、6……）或所有奇数页（1、3、5……）提取到新的 PDF 中。',
        evenPages: '偶数页',
        oddPages: '奇数页',
        howAll1: 'PDF 的每一页都会保存为单独的 PDF 文件。',
        howAll2: '结果将以包含所有页面的 ZIP 文件形式下载。',
        howVisual1: '点击下方页面缩略图，选择要提取的页面。',
        howVisual2: '选中的页面会高亮显示。',
        howBookmarks1: '根据 PDF 的书签（大纲）进行拆分。',
        howBookmarks2: '选择要按哪一级书签拆分。',
        bookmarkLevel: '书签级别',
        levelAll: '所有级别',
        level0: '0 级（仅顶级）',
        level1: '1 级',
        level2: '2 级',
        level3: '3 级',
        howNTimes1: '将 PDF 拆分为多个文件，每个文件包含 N 页。',
        pagesPerFile: '每个文件页数（N）',
        outputLabel: '输出方式',
        outputCombine: '合并为单个 PDF',
        outputSeparate: '每个范围一个 PDF',
        outputNote: '多个文件将打包为 ZIP 一起下载。',
        processBtn: '拆分 PDF',
        hiw1Title: '上传 PDF',
        hiw1Desc: '选择要拆分或提取页面的 PDF 文件',
        hiw2Title: '选择拆分方式',
        hiw2Desc: '选择特定页面、页码范围，或拆分为单页',
        hiw3Title: '预览并选择',
        hiw3Desc: '查看页面缩略图，精确选择所需页面',
        hiw4Title: '拆分并下载',
        hiw4Desc: '将提取的页面下载为单独的 PDF 或 ZIP 文件',
        faq1q: '可以提取指定的页码范围吗？',
        faq1a:
          '可以！你可以从 PDF 中提取任意指定页面或页码范围，精确选择所需页面或拆分为单独文件。',
        faq2q: '拆分后的 PDF 会损失质量吗？',
        faq2a:
          '不会！拆分后的 PDF 与原始文档质量完全一致，不会发生压缩或质量损失。',
        faq3q: '可以一次拆分多个 PDF 吗？',
        faq3a: '可以，支持批量处理多个 PDF，文档管理更高效。',
        cardDesc: '免费在线 PDF 拆分工具',
      },
      compressPdf: {
        algorithmLabel: '压缩算法',
        algoCondense: 'Condense（推荐）',
        algoPhoton: 'Photon（适合图片较多的 PDF）',
        condenseInfo:
          '采用高级压缩：移除冗余数据、优化图片、子集化字体。适合大多数 PDF。',
        photonInfo: '将页面转换为图片。适用于图片较多或扫描件 PDF。',
        photonWarning: '⚠️ 警告：文本将无法选中，链接将失效。',
        levelLabel: '压缩级别',
        levelLight: '轻度（保留质量）',
        levelBalanced: '均衡（推荐）',
        levelAggressive: '强力（文件更小）',
        levelExtreme: '极限（最大压缩）',
        grayscaleLabel: '转换为灰度',
        grayscaleDesc: '通过移除颜色信息减小文件大小',
        customSettings: '自定义设置',
        customSettingsHint: '微调压缩参数：',
        outputQuality: '输出质量',
        resizeImagesTo: '图片缩放至',
        onlyProcessAbove: '仅处理超过',
        removeMetadata: '移除元数据',
        subsetFonts: '子集化字体（移除未使用的字形）',
        removeThumbnails: '移除内嵌缩略图',
        processBtn: '压缩 PDF',
        hiw1Title: '上传 PDF',
        hiw1Desc: '点击或拖放一个或多个 PDF 文件',
        hiw2Title: '选择算法',
        hiw2Desc: '选择 Condense（推荐）或 Photon（适合图片较多的 PDF）',
        hiw3Title: '选择压缩级别',
        hiw3Desc: '可选轻度、均衡、强力或极限压缩',
        hiw4Title: '自定义并压缩',
        hiw4Desc: '可选启用灰度或自定义设置，然后开始压缩',
        hiw5Title: '下载',
        hiw5Desc: '保存压缩后的 PDF——最多可减小 90%',
        faq1q: 'Condense 和 Photon 有什么区别？',
        faq1a:
          'Condense 移除冗余数据、优化图片并子集化字体，适合大多数 PDF；Photon 将页面转换为图片，适合图片较多或扫描件 PDF，但文本将无法选中。',
        faq2q: '应该选择哪个压缩级别？',
        faq2a:
          '推荐均衡模式，体积大幅减小且质量损失极小；轻度可最大程度保留质量，强力可获得更小文件，极限则为最大压缩率。',
        faq3q: '有文件大小限制吗？',
        faq3a: '没有限制！任意数量、任意大小的 PDF 都可以免费压缩。',
        cardDesc: '免费在线 PDF 压缩工具',
      },
      jpgToPdf: {
        qualityLabel: 'PDF 质量',
        qualityHigh: '高质量（文件较大）',
        qualityMedium: '中等质量（均衡）',
        qualityLow: '低质量（文件较小）',
        qualityNote: '控制图片嵌入 PDF 时的压缩程度',
        processBtn: '转换为 PDF',
        faq1q: 'JPG 转 PDF 真的免费吗？',
        faq1a:
          '是的！BentoPDF 100% 免费，无隐藏费用、无需注册，文件处理无限制。',
        faq2q: '我的文件隐私安全吗？',
        faq2a:
          '完全安全！所有处理都在你的浏览器中完成，文件不会离开你的设备，隐私得到充分保障。',
        faq3q: '有文件大小限制吗？',
        faq3a: '没有！任意大小的文件都可以免费处理，次数不限。',
      },
      pdfEditor: {
        faq1q: 'PDF 编辑真的免费吗？',
        faq1a:
          '是的！BentoPDF 100% 免费，无隐藏费用、无需注册，文件处理无限制。',
        faq2q: '我的文件隐私安全吗？',
        faq2a:
          '完全安全！所有处理都在你的浏览器中完成，文件不会离开你的设备，隐私得到充分保障。',
        faq3q: '有文件大小限制吗？',
        faq3a: '没有！任意大小的文件都可以免费处理，次数不限。',
        cardDesc: '免费在线 PDF 编辑工具',
      },
      signPdf: {
        flattenLabel: '扁平化 PDF（使用下方保存按钮）',
        processBtn: '保存并下载已签署的 PDF',
        faq1q: 'PDF 签署真的免费吗？',
        faq1a:
          '是的！BentoPDF 100% 免费，无隐藏费用、无需注册，文件处理无限制。',
        faq2q: '我的文件隐私安全吗？',
        faq2a:
          '完全安全！所有处理都在你的浏览器中完成，文件不会离开你的设备，隐私得到充分保障。',
        faq3q: '有文件大小限制吗？',
        faq3a: '没有！任意大小的文件都可以免费处理，次数不限。',
      },
      rotatePdf: { cardDesc: '免费在线 PDF 旋转工具' },
      deletePages: { cardDesc: '免费在线删除页面工具' },
      extractPages: { cardDesc: '免费在线提取页面工具' },
      duplicateOrganize: { cardDesc: '免费在线 PDF 整理工具' },
      pdfToJpg: { cardDesc: '免费在线 PDF 转 JPG 工具' },
      addWatermark: { cardDesc: '免费在线添加水印工具' },
    },
  },
};

/* ---------------- 执行 ---------------- */
const countOccurrences = (haystack, needle) => {
  let count = 0;
  let idx = 0;
  while ((idx = haystack.indexOf(needle, idx)) !== -1) {
    count++;
    idx += needle.length;
  }
  return count;
};

let totalReplacements = 0;
const errors = [];
const pendingWrites = new Map();

for (const [file, edits] of Object.entries(EDITS)) {
  const absPath = path.join(ROOT, file);
  let content = fs.readFileSync(absPath, 'utf8');
  let fileReplacements = 0;
  for (const edit of edits) {
    const occurrences = countOccurrences(content, edit.old);
    const expected = edit.all ? (edit.count ?? occurrences) : 1;
    if (occurrences !== expected) {
      errors.push(
        `${file}: 期望 ${expected} 处，实际 ${occurrences} 处 -> ${JSON.stringify(edit.old.slice(0, 60))}...`
      );
      continue;
    }
    content = content.split(edit.old).join(edit.neu);
    fileReplacements += occurrences;
  }
  pendingWrites.set(absPath, content);
  totalReplacements += fileReplacements;
  console.log(`✔ ${file}: ${fileReplacements} 处替换已就绪`);
}

if (errors.length > 0) {
  console.error('\n替换校验失败，未写入任何文件：');
  errors.forEach((e) => console.error('  ✘ ' + e));
  process.exit(1);
}

for (const [absPath, content] of pendingWrites) {
  fs.writeFileSync(absPath, content);
}
console.log('HTML 文件已全部写入。');

// 深度合并翻译键（已存在的键报错，避免覆盖既有翻译）
const mergeInto = (target, addition, keyPath, fileLabel) => {
  for (const [key, value] of Object.entries(addition)) {
    const currentPath = keyPath ? `${keyPath}.${key}` : key;
    if (value && typeof value === 'object') {
      if (target[key] === undefined) target[key] = {};
      if (typeof target[key] !== 'object') {
        errors.push(`${fileLabel}: 键冲突 ${currentPath}`);
        continue;
      }
      mergeInto(target[key], value, currentPath, fileLabel);
    } else {
      if (target[key] !== undefined) {
        errors.push(`${fileLabel}: 键已存在 ${currentPath}`);
      } else {
        target[key] = value;
      }
    }
  }
};

for (const ns of ['common', 'tools']) {
  for (const lang of ['en', 'zh']) {
    const filePath = path.join(ROOT, `public/locales/${lang}/${ns}.json`);
    const json = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    mergeInto(json, I18N[ns][lang], '', `${lang}/${ns}.json`);
    fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n');
    console.log(`✔ public/locales/${lang}/${ns}.json: 已合并新键`);
  }
}

if (errors.length > 0) {
  console.error('\n合并翻译键时出错：');
  errors.forEach((e) => console.error('  ✘ ' + e));
  process.exit(1);
}

console.log(`\n完成：HTML 替换 ${totalReplacements} 处，翻译键合并成功。`);
