/**
 * Fix auto/dynamic keys in zh/tools.json with generic placeholder translations.
 * Maps EN→ZH for known strings, leaving unknown ones for future runs.
 *
 * Usage: node scripts/i18n-fix-auto-keys.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Exact match: EN text → correct ZH translation
const exactMap = {
  Settings: '设置',
  Delete: '删除',
  Edit: '编辑',
  'Add child': '添加子项',
  Download: '下载',
  Preview: '预览',
  Close: '关闭',
  Save: '保存',
  Cancel: '取消',
  Remove: '移除',
  Add: '添加',
  Copy: '复制',
  Search: '搜索',
  Reset: '重置',
  Configure: '配置',
  'Configure Style': '配置样式',
  'Advanced Settings': '高级设置',
  None: '无',
  All: '全部',
  Custom: '自定义',
  'Custom...': '自定义...',
  Default: '默认',

  'Times New Roman': 'Times New Roman',
  'Times Roman': 'Times Roman',
  'Times Bold': 'Times Bold',
  'Times Italic': 'Times Italic',
  'Times Bold Italic': 'Times Bold Italic',
  Helvetica: 'Helvetica',
  'Helvetica Bold': 'Helvetica Bold',
  'Helvetica Oblique': 'Helvetica Oblique',
  'Helvetica Bold Oblique': 'Helvetica Bold Oblique',
  Courier: 'Courier',
  'Courier Bold': 'Courier Bold',
  'Courier Oblique': 'Courier Oblique',
  'Courier Bold Oblique': 'Courier Bold Oblique',

  'Exhibit 1 Case XYZ 000001': '证物 1 案件 XYZ 000001',
  'Exhibit 1 Case XYZ 00001': '证物 1 案件 XYZ 00001',
  'Exhibit 1 Case XYZ 0001': '证物 1 案件 XYZ 0001',
  'Exhibit 1 Case XYZ 001': '证物 1 案件 XYZ 001',
  'Exhibit 1 Case XYZ 1': '证物 1 案件 XYZ 1',
  'Exhibit 1 Case XYZ 000001 Page 1': '证物 1 案件 XYZ 000001 第 1 页',
  'Exhibit 1 Case XYZ 00001 Page 1': '证物 1 案件 XYZ 00001 第 1 页',
  'Case XYZ 000001': '案件 XYZ 000001',
  'Case XYZ 00001': '案件 XYZ 00001',
  'Case XYZ 0001': '案件 XYZ 0001',
  'Case XYZ 001': '案件 XYZ 001',
  'Case XYZ 1': '案件 XYZ 1',
  'Custom style (other)': '自定义样式（其他）',
  '6 digits (000001)': '6 位数字（000001）',
  '5 digits (00001)': '5 位数字（00001）',
  '4 digits (0001)': '4 位数字（0001）',
  '3 digits (001)': '3 位数字（001）',
  'No padding (1)': '无填充（1）',
  'Header Center': '页眉居中',
  'Header Left': '页眉居左',
  'Header Right': '页眉居右',
  'Footer Center': '页脚居中',
  'Footer Left': '页脚居左',
  'Footer Right': '页脚居右',
  'Get your bates-stamped PDFs instantly. Multiple files are delivered as a ZIP.':
    '立即获取加盖 Bates 编号的 PDF。多个文件将以 ZIP 格式提供。',
  'Combine multiple PDFs': '合并多个 PDF',
  'Apply Bates Numbering': '应用 Bates 编号',
  'watermark PDF documents': '为 PDF 文档添加水印',
  'Organize PDF': '整理 PDF',

  Red: '红色',
  Blue: '蓝色',
  Green: '绿色',
  Yellow: '黄色',
  Purple: '紫色',
  Bold: '粗体',
  Italic: '斜体',
  'Bold Italic': '粗斜体',
  Normal: '常规',
  Regular: '常规',
  'Set Color...': '设置颜色...',
  'Set Style...': '设置样式...',
  'Save PDF with Bookmarks': '保存带书签的 PDF',
  'Extract Existing Bookmarks': '提取现有书签',
  'Search bookmarks...': '搜索书签...',
  'Bookmark title...': '书签标题...',
  'Add child bookmark': '添加子书签',
  'Edit bookmark': '编辑书签',
  'Enter bookmark title': '输入书签标题',
  Color: '颜色',
  Style: '样式',
  Destination: '目标位置',
  'Preview Text': '预览文本',
  'Set custom destination': '设置自定义目标位置',
  'Zoom (%)': '缩放（%）',
  Inherit: '继承',
  'X Position': 'X 坐标',
  'Y Position': 'Y 坐标',
  'X: {{value0}}, Y: {{value1}} ': 'X: {{value0}}，Y: {{value1}}',

  'Top Left': '左上',
  'Top Center': '顶部居中',
  'Top Right': '右上',
  Center: '居中',
  'Bottom Left': '左下',
  'Bottom Center': '底部居中',
  'Bottom Right': '右下',
  Left: '左',
  Right: '右',
  Top: '顶部',
  Bottom: '底部',

  'Crop and download': '裁剪并下载',
  'Merge PDFs': '合并 PDF',
  'Compress PDFs': '压缩 PDF',
  'Split PDFs': '分割 PDF',
  'Edit PDF': '编辑 PDF',
  'Rotate PDF': '旋转 PDF',
  'Merge PDF': '合并 PDF',
  'Split PDF': '分割 PDF',
  'Compress PDF': '压缩 PDF',
  'Sign PDF': '签署 PDF',

  'PDF Viewer': 'PDF 查看器',
  'PDF Bookmarks Editor': 'PDF 书签编辑器',
  'PDF Documents (multiple supported)': 'PDF 文档（支持多个）',
  Images: '图片',
  Image: '图片',
  'PDF Files': 'PDF 文件',
  'PDF File': 'PDF 文件',
  Document: '文档',
  Documents: '文档',

  JPEG: 'JPEG',
  PNG: 'PNG',
  WebP: 'WebP',
  'Convert to PDF': '转换为 PDF',
  'Convert from PDF': '从 PDF 转换',
  'Extract pages and download as ZIP': '提取页面并下载为 ZIP',
  'Download as ZIP': '下载为 ZIP',
  'Export as PDF': '导出为 PDF',

  'Previous page': '上一页',
  'Next page': '下一页',
  'Zoom in': '放大',
  'Zoom out': '缩小',
  'Fit to width': '适合宽度',
  'Fit to page': '适合页面',

  'Standard (192 DPI)': '标准（192 DPI）',
  'High (288 DPI)': '高（288 DPI）',
  'Ultra (384 DPI)': '超高（384 DPI）',
  'Alphanumeric + Basic Punctuation': '字母数字 + 基本标点',
  'Numbers + Currency': '数字 + 货币符号',
  'Letters Only (A-Z, a-z)': '仅字母（A-Z、a-z）',
  'Numbers Only (0-9)': '仅数字（0-9）',
  'Invoice / Receipt': '发票 / 收据',
  'Forms (alphanumeric + common symbols)': '表单（字母数字 + 常用符号）',

  'Compare PDFs': '比较 PDF',
  'Side by Side': '并排',
  Overlay: '叠加',
  'Search changes...': '搜索更改...',
  'Previous change': '上一处更改',
  'Next change': '下一处更改',
  'Left Document': '左侧文档',
  'Right Document': '右侧文档',
  'Style Changed': '样式已更改',
  'Page Removed': '页面已移除',
  'Page Background or Layout Changed': '页面背景或布局已更改',
  'Export Error': '导出错误',
  'No differences detected on this page.': '此页面未检测到差异。',

  'Select TSA Server': '选择 TSA 服务器',
  'Apply Timestamp': '应用时间戳',

  'Click or drag & drop': '点击或拖放',
  'Click or drag & drop your PDF file to get started':
    '点击或拖放 PDF 文件以开始',
  'Adjust Settings': '调整设置',

  'Search nodes...': '搜索节点...',
  'Save Template': '保存模板',
  'Template Name': '模板名称',
  'eg Invoice Processing Workflow': '例如：发票处理工作流',
  'Load Template': '加载模板',
  'No saved templates yet.': '暂无已保存的模板。',

  Ready: '就绪',
  'Workflow completed': '工作流已完成',
  'Error during execution': '执行过程中出错',
  'Node {{value0}} of {{value1}}': '节点 {{value0}} / {{value1}}',

  Apply: '应用',
  Process: '处理',
  'Processing...': '处理中...',
  'Loading...': '加载中...',
  'Converting...': '转换中...',
  Export: '导出',
  Import: '导入',
  Upload: '上传',
  'Upload files': '上传文件',
  'Upload file': '上传文件',
  'Change file': '更换文件',
  'Replace file': '替换文件',
  'Remove file': '移除文件',
  'Select file': '选择文件',
  'Select files': '选择文件',
  Clear: '清除',
  'Clear all': '清除全部',

  'Apply to all pages': '应用到所有页面',
  'Merge PDFs (alternate)': '交替合并 PDF',
  'Page {{value0}} of {{value1}}': '第 {{value0}} 页，共 {{value1}} 页',

  'free online extract pages tool': '免费在线提取页面工具',
  'free online delete pages tool': '免费在线删除页面工具',
  'free online organize PDF tool': '免费在线整理 PDF 工具',
  'free online add watermark tool': '免费在线添加水印工具',
  'free online greyscale tool': '免费在线灰度工具',
  'free online invert colors tool': '免费在线颜色反转工具',
  'free online extract images tool': '免费在线提取图片工具',
  'free online pdf to png tool': '免费在线 PDF 转 PNG 工具',
  'free online pdf to webp tool': '免费在线 PDF 转 WebP 工具',
  'free online pdf to jpg tool': '免费在线 PDF 转 JPG 工具',

  'Convert PDF pages to JPG images': '将 PDF 页面转换为 JPG 图片',
  'Convert PDF pages to PNG images': '将 PDF 页面转换为 PNG 图片',
  'Convert PDF pages to TIFF images': '将 PDF 页面转换为 TIFF 图片',
  'Convert to a comic book archive': '转换为漫画书存档',

  'Select PDFs to convert to images': '选择要转换为图片的 PDF',
  'Select Quality': '选择质量',
  'Select Pages': '选择页面',
  'Download Images': '下载图片',
  'Select settings': '选择设置',
  'Download CBZ': '下载 CBZ',

  'Save & Download Filled Form': '保存并下载已填写表单',
  'Stamp Editor': '印章编辑器',
  'Remove Annotations': '移除注释',

  'Insert blank page after this page': '在此页码后插入空白页',
  'Convert to grayscale': '转换为灰度',
  'free online watermark PDF tool': '免费在线 PDF 水印工具',

  // === Batch 2: Frequently used tool metadata ===
  'All files repaired successfully!': '所有文件修复成功！',
  'Annotations removed successfully!': '注释已成功移除！',
  'Background color changed successfully!': '背景颜色更改成功！',
  'Color adjustments applied successfully!': '颜色调整已应用成功！',
  'Colors inverted successfully!': '颜色反转成功！',
  'Header & Footer added successfully!': '页眉页脚添加成功！',
  'Metadata removed successfully!': '元数据移除成功！',
  'Metadata updated successfully!': '元数据更新成功！',
  'Scanner effect applied successfully!': '扫描效果应用成功！',
  'Text color changed successfully!': '文本颜色更改成功！',
  'Text converted to PDF successfully!': '文本已成功转换为 PDF！',
  'Watermark added successfully!': '水印添加成功！',
  'Your PDF has been downloaded successfully.': '您的 PDF 已成功下载。',
  'ZIP archive created successfully!': 'ZIP 存档创建成功！',
  'PDF {{value0}} applied successfully.': 'PDF {{value0}} 应用成功。',
  'No PDF document loaded.': '未加载 PDF 文档。',
  'No attachments found in this PDF.': '此 PDF 中未找到附件。',
  'No attachments selected for removal.': '未选择要移除的附件。',
  'No blank pages detected in this PDF.': '此 PDF 中未检测到空白页。',
  'No embedded images were found in the selected PDF(s).':
    '在选定的 PDF 中未找到嵌入的图片。',
  'No items were selected for removal or none were found in the PDF.':
    '未选择要移除的项目或 PDF 中未找到。',
  'No pages selected for removal.': '未选择要移除的页面。',
  'At least two valid PDFs are required.': '至少需要两个有效的 PDF 文件。',
  'Password Required': '需要密码',
  'Viewer not ready': '查看器未就绪',
  'Partial Success': '部分成功',
  'Decryption Failed': '解密失败',
  'Encryption Failed': '加密失败',
  'Linearization Failed': '线性化失败',
  'Repair Failed': '修复失败',
  'Timestamp Failed': '时间戳失败',
  'Extraction Partial': '部分提取',
  'Rasterization Complete': '栅格化完成',
  'Rasterization Partial': '部分栅格化',

  'Encryption Details:': '加密详情：',
  'Total Pages:': '总页数：',
  'Pages Corrected:': '已修正页面：',
  Copied: '已复制',

  'Enter current password': '输入当前密码',
  'Enter owner password if required': '如需要，输入所有者密码',
  'Enter password for permissions (optional)': '输入权限密码（可选）',
  'Enter password to open PDF': '输入密码以打开 PDF',
  'Enter the PDF password': '输入 PDF 密码',
  'Enter the password used to protect this PDF.': '输入用于保护此 PDF 的密码。',
  'This PDF is password-protected. Please enter the current password to proceed.':
    '此 PDF 受密码保护。请输入当前密码以继续。',
  'This password will be required to open the PDF.': '需要此密码才能打开 PDF。',
  'User password required to open PDF': '打开 PDF 需要用户密码',
  'Password to open PDF': '打开 PDF 的密码',
  'Password for permissions': '权限密码',
  'Password protect PDF': '密码保护 PDF',
  'Owner password enables usage restrictions': '所有者密码可启用使用限制',
  'An owner password is required when setting permissions':
    '设置权限时需要所有者密码',
  'Permissions (requires owner password)': '权限（需要所有者密码）',
  'Required when setting permissions or a user password. Leave all fields empty to decrypt the PDF instead.':
    '设置权限或用户密码时需要。如需解密 PDF，请将所有字段留空。',
  'If provided, usage restrictions will be applied. Leave empty for no restrictions.':
    '如果提供，将应用使用限制。留空则不设限制。',
  'Without owner password: no restrictions applied': '无所有者密码：不应用限制',
  'Leave empty if the PDF has no owner password.':
    '如果 PDF 没有所有者密码，请留空。',

  '256-bit AES encryption (highest security)': '256 位 AES 加密（最高安全性）',
  'Flatten Forms': '扁平化表单',
  'Remove Embedded Files': '移除嵌入文件',
  'Remove Embedded Fonts': '移除嵌入字体',
  'Remove JavaScript': '移除 JavaScript',
  'Remove Layers (OCG)': '移除图层（OCG）',
  'Remove Links': '移除链接',
  'Remove MarkInfo': '移除标记信息',
  'Remove Structure Tree': '移除结构树',
  'Remove All Attachments': '移除所有附件',
  'Remove attachment': '移除附件',
  'Add Border': '添加边框',
  'Add Margins': '添加边距',
  'Add Separator Lines': '添加分隔线',
  'Add cryptographic signature': '添加加密签名',
  'All changes': '所有更改',
  'All other security limitations': '所有其他安全限制',
  'All pages will be reversed (first becomes last, last becomes first).':
    '所有页面将被反转（首页变末页，末页变首页）。',
  'All selected PDF files will be packaged into a single ZIP archive.':
    '所有选定的 PDF 文件将打包成一个 ZIP 存档。',
  'Allow Annotating': '允许注释',
  'Allow Copying Text': '允许复制文本',
  'Allow Filling Forms': '允许填写表单',
  'Allow Modifying': '允许修改',
  'Allow Printing': '允许打印',
  'Also known as "Fast Web View" or "Optimized"':
    '也称为「快速 Web 查看」或「已优化」',
  'Alternate (odd→CW, even→CCW)': '交替（奇数→顺时针，偶数→逆时针）',
  'Annotations and comments': '注释与批注',
  Attachments: '附件',
  'Attachments updated successfully!': '附件更新成功！',
  Auto: '自动',
  'Auto (Keep Original)': '自动（保留原始）',
  'Auto (best for layout)': '自动（最适合排版）',
  'Auto-Detect': '自动检测',
  'Auto-detected from filename': '从文件名自动检测',
  'Automatic (Recommended)': '自动（推荐）',
  'Automatic Analysis': '自动分析',

  'Black & White (1-bit)': '黑白（1 位）',
  'Color (RGB)': '彩色（RGB）',
  Greyscale: '灰度',
  'Content only': '仅内容',
  'Combines pages': '合并页面',
  'Combine Pages': '合并页面',
  'Convert Word documents to PDF': '将 Word 文档转换为 PDF',
  'Convert all pages or choose specific pages to extract':
    '转换所有页面或选择特定页面提取',
  'Convert for archiving': '转换为存档格式',
  'Convert text files to PDF': '将文本文件转换为 PDF',
  'Converts all text to vector paths/curves': '将所有文本转换为矢量路径/曲线',
  'Converts the PDF to images first, ensuring better PDF/A compliance. Recommended if validation fails on the normal conversion.':
    '先将 PDF 转换为图像，确保更好的 PDF/A 合规性。如果常规转换验证失败，建议使用此选项。',
  'Copying restrictions': '复制限制',
  'Courier (Monospace)': 'Courier（等宽）',
  'Creation and Modification dates': '创建与修改日期',
  'Creator and Producer information': '创建者与生成者信息',
  'Customize the scanner effect with real-time preview':
    '通过实时预览自定义扫描效果',
  'Deskew Results': '纠偏结果',
  "Deskewing is the process of correcting tilted or rotated pages in scanned documents. When you scan a document, it's common for pages to be slightly skewed. This tool automatically detects and corrects that skew.":
    '纠偏是修正扫描文档中倾斜或旋转页面的过程。扫描文档时，页面轻微倾斜很常见。此工具可自动检测并修正这种倾斜。',
  'Document IDs': '文档 ID',
  'Document-level attachment': '文档级附件',
  'Drag to reorder. Pages will be interleaved in this order.':
    '拖动以重新排序。页面将按此顺序交错排列。',
  'Editing restrictions': '编辑限制',
  'Eliminates font dependency issues': '消除字体依赖问题',

  'Enter 0 to insert at the beginning, or {{value0}} to insert at the end.':
    '输入 0 插入到开头，或 {{value0}} 插入到末尾。',
  'Enter 0 to insert at the beginning.': '输入 0 插入到开头。',
  'Enter name for the new layer:': '输入新图层的名称：',
  'Enter new layer name...': '输入新图层名称...',
  'Extract all images from a PDF': '从 PDF 提取所有图片',
  'Extracted 1 table successfully!': '成功提取了 1 个表格！',
  'Extracted text from {{value0}} PDF files!':
    '从 {{value0}} 个 PDF 文件中提取了文本！',
  'Extracted {{value0}} PDF(s), failed {{value1}}.':
    '成功提取 {{value0}} 个 PDF，失败 {{value1}} 个。',
  'Extracted {{value0}} table(s) to Excel!':
    '成功提取 {{value0}} 个表格到 Excel！',
  'Extracted {{value0}} tables successfully!': '成功提取了 {{value0}} 个表格！',
  'Field Name Conflict': '字段名冲突',
  'Field name "{{value0}}" already exists in this {{value1}}. Please try using a unique name.':
    '字段名"{{value0}}"已在此 {{value1}} 中存在。请使用唯一的名称。',
  'Field name cannot be empty': '字段名不能为空',
  'Fine-tune color settings with real-time preview': '通过实时预览微调颜色设置',
  'Form fields (text fields, checkboxes, radio buttons, etc.)':
    '表单字段（文本框、复选框、单选按钮等）',
  'Formatting Options': '格式选项',
  'Found {{value0}} image(s) in {{value1}} PDF(s).':
    '在 {{value1}} 个 PDF 中找到 {{value0}} 张图片。',
  'Get your font-independent PDF instantly': '立即获取字体无关的 PDF',
  'Get your straightened PDF instantly': '立即获取纠偏后的 PDF',
  'Ghostscript converts all fonts to vector paths':
    'Ghostscript 将所有字体转换为矢量路径',
  'Helvetica (Sans-serif)': 'Helvetica（无衬线）',
  'Horizontal (Left to Right)': '水平（从左到右）',
  'Horizontal (Top & Bottom)': '水平（顶部和底部）',
  'Ideal for print-ready PDFs': '非常适合打印就绪的 PDF',
  'Improves user experience for online PDFs': '提升在线 PDF 的用户体验',
  'Inches (in)': '英寸（in）',
  'Inspect PDF properties': '检查 PDF 属性',
  'Interactive elements': '交互元素',
  'Item 1': '项目 1',
  'JPEG (Lossy)': 'JPEG（有损）',
  'JPEG is best for color comics (smaller files). PNG is ideal for black-and-white manga (lossless quality). WebP offers the best compression but may not work in older readers.':
    'JPEG 最适合彩色漫画（文件较小）。PNG 是黑白漫画的理想选择（无损质量）。WebP 提供最佳压缩，但可能不兼容旧版阅读器。',
  'JPG, PNG, BMP, GIF, TIFF, PNM, PGM, PBM, PPM, PAM, JXR, JPX, JP2, PSD, SVG, HEIC, WebP':
    'JPG、PNG、BMP、GIF、TIFF、PNM、PGM、PBM、PPM、PAM、JXR、JPX、JP2、PSD、SVG、HEIC、WebP',
  JSON: 'JSON',
  CSV: 'CSV',
  'Key (e.g., Department)': '键（例如：部门）',
  'Value (e.g., Marketing)': '值（例如：市场部）',
  'LZW (Lossless)': 'LZW（无损）',
  'CCITT Group 4 (B&W documents)': 'CCITT Group 4（黑白文档）',
  'Deflate / ZIP (Lossless)': 'Deflate / ZIP（无损）',
  PackBits: 'PackBits',
  'None (Uncompressed)': '无（不压缩）',
  'Layer not found': '未找到图层',
  'Leave blank or use "all" to divide all pages.':
    '留空或使用"all"分割所有页面。',
  'Letter (8.5 × 11 in)': 'Letter（8.5 × 11 英寸）',
  'Letter (8.5" x 11")': 'Letter（8.5" × 11"）',
  'Letter (8.5" × 11")': 'Letter（8.5" × 11"）',
  CONFIDENTIAL: '机密',
  'Legal (8.5 × 14 in)': 'Legal（8.5 × 14 英寸）',
  'Legal (8.5" × 14")': 'Legal（8.5" × 14"）',
  'Ledger (17 × 11 in)': 'Ledger（17 × 11 英寸）',
  'Ledger (17" × 11")': 'Ledger（17" × 11"）',
  'Tabloid (11 × 17 in)': 'Tabloid（11 × 17 英寸）',
  'Tabloid (11" × 17")': 'Tabloid（11" × 17"）',
  'Executive (7.25" × 10.5")': 'Executive（7.25" × 10.5"）',
  'Folio (8.5" × 13")': 'Folio（8.5" × 13"）',
  Millimeters: '毫米',
  'Millimeters (mm)': '毫米（mm）',
  Points: '点',
  'Points (pt)': '点（pt）',
  'Pixels (px)': '像素（px）',
  '1 inch = 72 points': '1 英寸 = 72 点',
  '100 (Fast)': '100（快速）',
  '200 (Better)': '200（较好）',
  '200 (Good)': '200（良好）',
  '300 (Best Quality)': '300（最佳质量）',
  '300 (Print)': '300（打印）',
  '600 (High Quality)': '600（高质量）',
  '72 (Screen)': '72（屏幕）',

  'Make PDF searchable': '使 PDF 可搜索',
  'Make PDFs look scanned': '使 PDF 看起来像扫描件',
  'Make forms non-editable': '使表单不可编辑',
  'Metadata copied to clipboard as JSON.': '元数据已以 JSON 格式复制到剪贴板。',

  'Note: Custom fields are not supported by all PDF readers.':
    '注意：自定义字段并非所有 PDF 阅读器都支持。',
  'Note: Flattened content cannot be edited or filled out.':
    '注意：扁平化后的内容无法编辑或填写。',
  'Note: Text will no longer be selectable or searchable after conversion.':
    '注意：转换后文本将无法选择或搜索。',
  'N-Up PDF created successfully!': 'N-Up PDF 创建成功！',

  'OpenCV analyzes and detects skew angles': 'OpenCV 分析并检测倾斜角度',
  'Optimizes PDF structure for web viewing': '优化 PDF 结构以便 Web 查看',

  'PDF converted to CSV successfully!': 'PDF 已成功转换为 CSV！',
  'PDF converted to SVG successfully!': 'PDF 已成功转换为 SVG！',
  'PDF converted to greyscale successfully!': 'PDF 已成功转换为灰度！',
  'PDF has been sanitized and downloaded.': 'PDF 已清理并下载。',
  'PDF with layer changes saved!': '带图层更改的 PDF 已保存！',
  'PDF/A-1b (Strict, no transparency)': 'PDF/A-1b（严格，不支持透明度）',
  'PDF/A-2b (Recommended, allows transparency)': 'PDF/A-2b（推荐，支持透明度）',
  'PDF/A-3b (Modern, allows attachments)': 'PDF/A-3b（现代，支持附件）',
  'PDFs have been mixed successfully!': 'PDF 已成功交替混合！',
  'PNG (Lossless)': 'PNG（无损）',
  'Pages combined successfully!': '页面合并成功！',
  'Pages have been divided successfully!': '页面分割成功！',
  'Pages have been reversed successfully!': '页面反转成功！',
  "Pages with skew below this threshold won't be corrected.":
    '低于此阈值的倾斜页面将不会被修正。',

  'Pick image format, quality, and optional metadata':
    '选择图片格式、质量和可选的元数据',
  'PieceInfo (private application data)': 'PieceInfo（私有应用程序数据）',
  'Pre-flatten PDF (recommended for complex files)':
    '预扁平化 PDF（建议用于复杂文件）',
  'Pre-flattening PDF...': '正在预扁平化 PDF...',
  'Press Delete to remove selected field': '按 Delete 键移除选中的字段',
  'Printing restrictions': '打印限制',

  'Rasterized {{value0}} PDF(s), failed {{value1}}.':
    '成功栅格化 {{value0}} 个 PDF，失败 {{value1}} 个。',
  'Rasterizing {{value0}} ({{value1}}/{{value2}})...':
    '正在栅格化 {{value0}}（{{value1}}/{{value2}}）...',
  'Rasterizing {{value0}}...': '正在栅格化 {{value0}}...',
  'Rasterizing...': '正在栅格化...',
  'Removing all metadata...': '正在移除所有元数据...',
  'Removing annotations...': '正在移除注释...',
  'Removing restrictions...': '正在移除限制...',
  'Reorder and organize pages': '重新排序和整理页面',
  'Reversing {{value0}} ({{value1}}/{{value2}})...':
    '正在反转 {{value0}}（{{value1}}/{{value2}}）...',
  'Rotate PDF pages': '旋转 PDF 页面',
  'Rotate clockwise (90°)': '顺时针旋转（90°）',
  'Rotate counter-clockwise (90°)': '逆时针旋转（90°）',

  'Sanitization Optionst:': '清理选项：',
  'Sanitizing PDF...': '正在清理 PDF...',
  'Save JPG images individually or as a ZIP archive':
    '单独保存 JPG 图片或打包为 ZIP 存档',
  'Save your color-adjusted PDF instantly': '立即保存颜色调整后的 PDF',
  'Save your scanned-looking PDF instantly': '立即保存扫描效果的 PDF',
  'Saving PDF with layer changes...': '正在保存带图层更改的 PDF...',
  'See signer information, certificate validity, and signature status':
    '查看签名者信息、证书有效性和签名状态',
  'See your converted PDF with preserved formatting':
    '查看保留格式的转换后 PDF',
  'Select a field to edit properties': '选择一个字段以编辑属性',
  'Select image quality (Low, Medium, High, Maximum)':
    '选择图片质量（低、中、高、最高）',
  'Select one of the trusted TSA servers': '选择一个受信任的 TSA 服务器',
  'Select or drag DOCX or DOC files you want to convert':
    '选择或拖放要转换的 DOCX 或 DOC 文件',
  'Select the PDF document you want to timestamp':
    '选择要添加时间戳的 PDF 文档',
  'Select your scanned PDF with tilted pages': '选择带有倾斜页面的扫描 PDF',
  'Sign with X.509 certificate': '使用 X.509 证书签名',
  'Signature Validation Results': '签名验证结果',
  'Some files were skipped. Only BMP files are allowed.':
    '部分文件已被跳过。仅允许 BMP 文件。',
  'Some files were skipped. Only HEIC/HEIF files are allowed.':
    '部分文件已被跳过。仅允许 HEIC/HEIF 文件。',
  'Some files were skipped. Only PDF files are allowed.':
    '部分文件已被跳过。仅允许 PDF 文件。',
  'Some files were skipped. Only PNG images are allowed.':
    '部分文件已被跳过。仅允许 PNG 图片。',
  'Some files were skipped. Only SVG graphics are allowed.':
    '部分文件已被跳过。仅允许 SVG 图形。',
  'Some files were skipped. Only TIFF files are allowed.':
    '部分文件已被跳过。仅允许 TIFF 文件。',
  'Some files were skipped. Only WebP images are allowed.':
    '部分文件已被跳过。仅允许 WebP 图片。',
  'Some files were skipped. Only supported image formats are allowed.':
    '部分文件已被跳过。仅允许支持的图片格式。',
  'Some files were skipped. Only text files are allowed.':
    '部分文件已被跳过。仅允许文本文件。',
  'Specify the position where blank pages should be inserted.':
    '指定插入空白页的位置。',
  'Specify which pages to divide. Other pages will be kept as-is.':
    '指定要分割的页面。其他页面将保持不变。',
  'Splitting PDF pages...': '正在分割 PDF 页面...',
  'Standardizing pages...': '正在标准化页面...',
  'Start typing here...': '在此开始输入...',

  'Successfully converted {{value0}} PDF(s) to DOCX.':
    '成功将 {{value0}} 个 PDF 转换为 DOCX。',
  'Successfully converted {{value0}} PDF(s) to Markdown.':
    '成功将 {{value0}} 个 PDF 转换为 Markdown。',
  'Successfully converted {{value0}} PDF(s) to {{value1}}.':
    '成功将 {{value0}} 个 PDF 转换为 {{value1}}。',
  'Successfully converted {{value0}} PSD files to a single PDF.':
    '成功将 {{value0}} 个 PSD 文件转换为单个 PDF。',
  'Successfully converted {{value0}} Word document(s) to PDF.':
    '成功将 {{value0}} 个 Word 文档转换为 PDF。',
  'Successfully converted {{value0}} to DOCX.':
    '成功将 {{value0}} 转换为 DOCX。',
  'Successfully converted {{value0}} to Markdown.':
    '成功将 {{value0}} 转换为 Markdown。',
  'Successfully converted {{value0}} to {{value1}}.':
    '成功将 {{value0}} 转换为 {{value1}}。',
  'Successfully extracted PDF for AI/LLM use.': '成功提取 PDF 供 AI/LLM 使用。',
  'Successfully extracted {{value0}} PDF(s) for AI/LLM use.':
    '成功提取 {{value0}} 个 PDF 供 AI/LLM 使用。',
  'Successfully rasterized PDF at {{value0}} DPI.':
    '成功以 {{value0}} DPI 栅格化 PDF。',
  'Successfully rasterized {{value0}} PDF(s) at {{value1}} DPI.':
    '成功以 {{value1}} DPI 栅格化 {{value0}} 个 PDF。',
  'Text extracted successfully!': '文本提取成功！',

  'The PDF displays a list of attachments at the bottom and also embeds the actual files into the PDF. You can access them via the Attachments panel in PDF readers like Adobe Reader or Foxit.':
    'PDF 在底部显示附件列表，同时将实际文件嵌入 PDF 中。您可以通过 Adobe Reader 或 Foxit 等 PDF 阅读器中的附件面板访问它们。',
  'The following field names already exist in the uploaded PDF: {{value0}}. Please rename these fields before downloading.':
    '以下字段名已存在于上传的 PDF 中：{{value0}}。下载前请重命名这些字段。',
  'The following field names are used more than once: {{value0}}. Please rename these fields to use unique names before downloading.':
    '以下字段名被多次使用：{{value0}}。下载前请重命名这些字段以使用唯一名称。',
  'The tool extracts and parses all digital signatures in the document':
    '该工具提取并解析文档中的所有数字签名',
  'This tool validates PKCS#7 digital signatures created with X.509 certificates, the standard format used by most PDF signing tools and certificate authorities.':
    '此工具验证使用 X.509 证书创建的 PKCS#7 数字签名，这是大多数 PDF 签名工具和证书颁发机构使用的标准格式。',
  'Times (Serif)': 'Times（衬线）',
  'Tiro (Serif)': 'Tiro（衬线）',
  'Title, Author, Subject, Keywords': '标题、作者、主题、关键词',
  'TuHe PDF supports both .eml (standard email format) and .msg (Microsoft Outlook) files. These are the most common formats for exported or saved emails.':
    'TuHe PDF 支持 .eml（标准电子邮件格式）和 .msg（Microsoft Outlook）文件。这些是导出或保存的电子邮件最常见的格式。',
  'Txt To Pdf': '文本转 PDF',
  'Pdf To Docx': 'PDF 转 DOCX',
  'Updating metadata...': '正在更新元数据...',
  'Use "all" or specify pages, e.g. 1-3, 5, 7-9':
    '使用"all"或指定页面，例如 1-3, 5, 7-9',
  "Use the toolbar's image stamp tool to place stamps.":
    '使用工具栏的图片印章工具放置印章。',
  'Verify digital signatures': '验证数字签名',
  'Vertical (Left & Right)': '垂直（左右）',
  'Vertical (Top to Bottom)': '垂直（从上到下）',
  'View Results': '查看结果',
  'What is linearization?': '什么是线性化？',
  'What this tool does:': '此工具的功能：',
  'What will be flattened:': '将被扁平化的内容：',
  'XMP Metadata streams': 'XMP 元数据流',

  'Yes! Fonts, images, tables, headers, footers, and all formatting are preserved exactly as they appear in Word.':
    '是的！字体、图片、表格、页眉、页脚和所有格式都将完全保留 Word 中的外观。',
  'Yes! TuHe PDF supports both older .doc and newer .docx Microsoft Word formats.':
    '是的！TuHe PDF 支持较旧的 .doc 和较新的 .docx Microsoft Word 格式。',
  'Yes! You can choose to convert all pages or select specific pages you want as JPG images.':
    '是的！您可以选择转换所有页面或选择特定页面转换为 JPG 图片。',
  'Yes, JPG is a compressed format. You control the quality level - higher quality means less compression and larger files.':
    '是的，JPG 是一种压缩格式。您可以控制质量级别 - 质量越高，压缩越少，文件越大。',
  'Yes. The tool creates a standard RFC 3161 document timestamp (ETSI.RFC3161 SubFilter) that is recognized by Adobe Acrobat and other major PDF viewers.':
    '是的。该工具创建标准的 RFC 3161 文档时间戳（ETSI.RFC3161 SubFilter），可被 Adobe Acrobat 和其他主流 PDF 查看器识别。',
  'No. After conversion, text becomes vector graphics and is no longer selectable or searchable. If you need searchable text, consider using the OCR tool after conversion.':
    '不会。转换后，文本变为矢量图形，不再可选择或搜索。如果需要可搜索的文本，请考虑在转换后使用 OCR 工具。',
  'No. Only a cryptographic hash (SHA-256) of your document is sent to the TSA server. Your actual PDF content never leaves your browser.':
    '不会。只有您文档的加密哈希（SHA-256）会被发送到 TSA 服务器。您实际的 PDF 内容永远不会离开您的浏览器。',
  'No. Unlike a digital signature, a document timestamp does not require a personal certificate. The TSA server provides the trusted timestamp using its own certificate.':
    '不需要。与数字签名不同，文档时间戳不需要个人证书。TSA 服务器使用自己的证书提供受信任的时间戳。',
  'Timestamping requires contacting the selected TSA server to obtain a trusted timestamp token.':
    '添加时间戳需要联系选定的 TSA 服务器以获取受信任的时间戳令牌。',
  "A self-signed certificate is one where the issuer and subject are the same. While the signature is technically valid, it means the certificate wasn't issued by a trusted Certificate Authority (CA).":
    '自签名证书是指颁发者和主题相同的证书。虽然签名在技术上是有效的，但这意味着证书不是由受信任的证书颁发机构（CA）颁发的。',

  'all or 1-3, 5, 7-9': 'all 或 1-3, 5, 7-9',
  'e.g. 1-5, 8, 10-z (leave empty for all)':
    '例如 1-5, 8, 10-z（留空表示全部）',
  'e.g. 1-5, 8, 11-13 (leave blank for all pages)':
    '例如 1-5, 8, 11-13（留空表示所有页面）',

  '{{value0}} - {{value1}}': '{{value0}} - {{value1}}',
  '{{value0}} PDF files selected': '已选择 {{value0}} 个 PDF 文件',
  '{{value0}} attachment(s) extracted successfully!':
    '成功提取了 {{value0}} 个附件！',
  '{{value0}} x {{value1}} {{value2}}': '{{value0}} × {{value1}} {{value2}}',
  '{{value0}}x': '{{value0}}×',
  '{{value0}}°': '{{value0}}°',
  '({{value0}} KB)': '（{{value0}} KB）',
  '+': '+',
  '-': '-',
  0: '0',
  '0.1° (Very Sensitive)': '0.1°（非常敏感）',
  '0.5° (Default)': '0.5°（默认）',
  '1.0° (Normal)': '1.0°（正常）',
  '2.0° (Less Sensitive)': '2.0°（较不敏感）',
  '2.0x': '2.0×',
  80: '80',
  '85%': '85%',
  '90%': '90%',
  '1×2 (Booklet)': '1×2（小册子）',

  'Action, Adventure, Sci-Fi': '动作、冒险、科幻',
  'Bates numbers applied successfully! ({{value0}} through {{value1}})':
    'Bates 编号已成功应用！（{{value0}} 至 {{value1}}）',
  'Booklet created with {{value0}} sheets!':
    '已创建包含 {{value0}} 张纸的小册子！',
  'Change PDF background': '更改 PDF 背景',
  'Change PDF text color': '更改 PDF 文本颜色',
  'Choose TSA Server': '选择 TSA 服务器',
  'Choose how many pages to fit on each sheet (2, 4, 9, or 16).':
    '选择每张纸上排列多少页（2、4、9 或 16）。',
  'Click the button below to invert all colors in your PDF.':
    '点击下方按钮反转 PDF 中的所有颜色。',
  'Click the button below to remove all annotations from your PDF.':
    '点击下方按钮移除 PDF 中的所有注释。',
  'Click the convert button to generate your PDF': '点击转换按钮生成您的 PDF',
  'Converted {{value0}} files ({{value1}} pages) to SVG!':
    '已将 {{value0}} 个文件（{{value1}} 页）转换为 SVG！',
  'Converted {{value0}} pages to SVG!': '已将 {{value0}} 页转换为 SVG！',
  'A field named "{{value0}}" already exists. Please rename this field to use a unique name before downloading.':
    '名为"{{value0}}"的字段已存在。下载前请重命名此字段以使用唯一名称。',
};

// =========== Processing ===========

const enPath = resolve(
  __dirname,
  '..',
  'public',
  'locales',
  'en',
  'tools.json'
);
const zhPath = resolve(
  __dirname,
  '..',
  'public',
  'locales',
  'zh',
  'tools.json'
);

const enData = JSON.parse(readFileSync(enPath, 'utf-8'));
const zhData = JSON.parse(readFileSync(zhPath, 'utf-8'));

let fixed = 0;

for (const toolKey of Object.keys(zhData)) {
  const tool = zhData[toolKey];
  const enTool = enData[toolKey];
  if (
    !tool ||
    typeof tool !== 'object' ||
    !enTool ||
    typeof enTool !== 'object'
  )
    continue;

  for (const subKey of ['auto', 'dynamic']) {
    const sub = tool[subKey];
    const enSub = enTool[subKey];
    if (!sub || typeof sub !== 'object' || !enSub || typeof enSub !== 'object')
      continue;

    for (const hashKey of Object.keys(sub)) {
      const zhVal = sub[hashKey];
      const enVal = enSub[hashKey];
      if (typeof zhVal !== 'string' || typeof enVal !== 'string') continue;

      if (exactMap[enVal] && exactMap[enVal] !== zhVal) {
        sub[hashKey] = exactMap[enVal];
        fixed++;
      }
    }
  }
}

writeFileSync(zhPath, JSON.stringify(zhData, null, 2) + '\n', 'utf-8');
console.log(`✅ zh/tools.json: fixed ${fixed} auto/dynamic keys`);

// Sync to dist
const distZhPath = resolve(
  __dirname,
  '..',
  'dist',
  'locales',
  'zh',
  'tools.json'
);
writeFileSync(distZhPath, JSON.stringify(zhData, null, 2) + '\n', 'utf-8');
console.log('✅ Synced to dist/zh/tools.json');
