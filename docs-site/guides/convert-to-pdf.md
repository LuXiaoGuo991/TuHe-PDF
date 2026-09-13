---
title: 转换为 PDF
description: 将图片、Word/Excel/PPT、电子书、Markdown 等 30 多种格式转换为 PDF 的方法与技巧。
group: guides
order: 11
---

"转换为 PDF"分类覆盖了 30 多种输入格式，全部在浏览器本地完成转换。本文按来源类型介绍。

## 工具一览

### 图片转 PDF

| 工具                        | 输入格式                       |
| --------------------------- | ------------------------------ |
| [JPG 转 PDF](/jpg-to-pdf)   | JPG、JPEG、JPEG2000（JP2/JPX） |
| [PNG 转 PDF](/png-to-pdf)   | PNG                            |
| [WebP 转 PDF](/webp-to-pdf) | WebP                           |
| [HEIC 转 PDF](/heic-to-pdf) | iPhone 拍摄的 HEIC 照片        |
| [TIFF 转 PDF](/tiff-to-pdf) | TIFF（含多页）                 |
| [BMP 转 PDF](/bmp-to-pdf)   | BMP                            |
| [SVG 转 PDF](/svg-to-pdf)   | SVG 矢量图                     |

### Office 与文档转 PDF

| 工具                                    | 输入格式                                                                                                                                                                                                                                                                 |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Word 转 PDF](/word-to-pdf)             | DOCX、DOC、ODT、RTF                                                                                                                                                                                                                                                      |
| [Excel 转 PDF](/excel-to-pdf)           | XLSX、XLS、ODS、CSV                                                                                                                                                                                                                                                      |
| [PowerPoint 转 PDF](/powerpoint-to-pdf) | PPTX、PPT、ODP                                                                                                                                                                                                                                                           |
| [Markdown 转 PDF](/markdown-to-pdf)     | Markdown（可在线编辑预览）                                                                                                                                                                                                                                               |
| [TXT 转 PDF](/txt-to-pdf)               | 纯文本                                                                                                                                                                                                                                                                   |
| [邮件转 PDF](/email-to-pdf)             | EML、MSG（含 Outlook 导出）                                                                                                                                                                                                                                              |
| 其他                                    | [CSV](/csv-to-pdf)、[JSON](/json-to-pdf)、[XML](/xml-to-pdf)、[RTF](/rtf-to-pdf)、[ODT](/odt-to-pdf)、[XPS](/xps-to-pdf)、[WPS](/wps-to-pdf)、[WPD](/wpd-to-pdf)、[PUB](/pub-to-pdf)、[VSD](/vsd-to-pdf)、[PSD](/psd-to-pdf)、[Pages](/pages-to-pdf)、[ODG](/odg-to-pdf) |

### 电子书与漫画转 PDF

| 工具                        | 输入格式           |
| --------------------------- | ------------------ |
| [EPUB 转 PDF](/epub-to-pdf) | EPUB 电子书        |
| [MOBI 转 PDF](/mobi-to-pdf) | Kindle MOBI        |
| [FB2 转 PDF](/fb2-to-pdf)   | FictionBook        |
| [CBZ 转 PDF](/cbz-to-pdf)   | 漫画压缩包 CBZ/CBR |

## 图片转 PDF：详细步骤

以 [JPG 转 PDF](/jpg-to-pdf) 为例，其他图片工具流程相同：

1. 选择一张或多张图片（支持批量拖入）
2. 调整设置：页面尺寸（适应图片 / A4 / Letter 等）、方向、页边距、每页图片数
3. 拖动缩略图可调整页面顺序
4. 点击转换，下载生成的 PDF

> 提示：混合多种图片格式时，先分别转成 PDF，再用[合并 PDF](/merge-pdf)拼成一个文件；或者直接给每张图片单独生成后批量下载。

## Office 文档转 PDF：须知

Word/Excel/PPT 转换由浏览器内的 **LibreOffice WASM** 引擎完成：

1. 首次使用时需要加载较大的引擎文件，请保持网络畅通、耐心等待加载完成（之后会命中浏览器缓存）
2. 选择文件后点击转换即可，支持一次选择多个文件
3. 转换效果以 LibreOffice 的兼容性为准，复杂排版（艺术字、SmartArt 等）可能与 Microsoft Office 的导出结果略有差异，重要文档建议转换后核对一遍

## Markdown 转 PDF

[Markdown 转 PDF](/markdown-to-pdf) 内置编辑器，适合把笔记直接排版输出：

1. 在左侧编辑区粘贴或撰写 Markdown，右侧实时预览
2. 支持代码高亮、表格、任务列表、数学符号，以及 **Mermaid 图表**（流程图、时序图会自动渲染为图形）
3. 点击导出得到排版好的 PDF

## 常见问题

**转换后中文变成方块或乱码？** 多为字体缺失，尝试先在源文档中使用常见字体（宋体、黑体、微软雅黑）再转换。

**大文件转换失败或页面卡住？** 本地转换消耗的是你设备的内存，建议拆分文档分批转换，或关闭其他占用内存的标签页后重试。

**下一步**：转换结果不满意版式？试试[编辑与注释指南](/docs/guides/edit-annotate)；需要减小体积请阅读[优化与修复指南](/docs/guides/optimize-repair)。
