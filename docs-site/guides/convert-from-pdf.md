---
title: 从 PDF 转换
description: 将 PDF 转换为 Word、Excel、图片、文本、Markdown 等格式，以及提取表格与图片的方法。
group: guides
order: 12
---

本指南介绍如何把 PDF 里的内容"拿出来"：转成可编辑文档、导出为图片、提取文字与表格。

## 工具一览

| 工具                                  | 输出                  | 适用场景                   |
| ------------------------------------- | --------------------- | -------------------------- |
| [PDF 转 Word](/pdf-to-docx)           | DOCX                  | 需要重新编辑正文排版       |
| [PDF 转 Excel](/pdf-to-excel)         | XLSX                  | 表格数据再计算             |
| [PDF 转 CSV](/pdf-to-csv)             | CSV                   | 表格数据导入其他系统       |
| [提取 PDF 表格](/extract-tables)      | CSV / JSON / Markdown | 只要表格、支持多种导出格式 |
| [PDF 转 JPG](/pdf-to-jpg)             | JPG                   | 每页导出为照片             |
| [PDF 转 PNG](/pdf-to-png)             | PNG                   | 需要无损、透明背景         |
| [PDF 转 WebP](/pdf-to-webp)           | WebP                  | 网页用图、体积更小         |
| [PDF 转 TIFF](/pdf-to-tiff)           | TIFF                  | 印刷与归档                 |
| [PDF 转 BMP](/pdf-to-bmp)             | BMP                   | 无损位图                   |
| [PDF 转 SVG](/pdf-to-svg)             | SVG                   | 矢量再编辑                 |
| [PDF 转文本](/pdf-to-text)            | TXT                   | 提取全部纯文字             |
| [PDF 转 Markdown](/pdf-to-markdown)   | Markdown              | 笔记、二次创作             |
| [为 AI 准备 PDF](/prepare-pdf-for-ai) | LlamaIndex JSON       | 喂给 RAG / LLM 管道        |
| [提取图片](/extract-images)           | 原图文件              | 只要 PDF 内嵌的图片        |
| [PDF 转 CBZ](/pdf-to-cbz)             | CBZ                   | 转给漫画阅读器             |
| [PDF 转灰度](/pdf-to-greyscale)       | PDF                   | 黑白打印省墨               |
| [PDF 转 ZIP](/pdf-to-zip)             | ZIP                   | 打包多个 PDF               |

## 扫描件？先做 OCR

如果 PDF 是扫描件或图片型 PDF（文字无法选中），直接转换只能得到图片。**先运行 [PDF 文字识别（OCR）](/ocr-pdf)** 给文档叠加文字层，再执行本分类的任何转换工具，即可得到可选中、可编辑的结果。

判断方法：尝试用鼠标选中 PDF 里的文字——选不中就需要先 OCR。

## PDF 转 Word：详细步骤

1. 打开 [PDF 转 Word](/pdf-to-docx)，选择文件
2. 等待本地引擎解析版式并生成 DOCX
3. 下载后用 Word/WPS 打开核对

> 提示：PDF 是"排版结果"而非"源文档"，转换会尽力还原段落、字体与表格，但复杂版式（多栏、文本框叠放）可能需要在 Word 里微调。

## 提取表格：选对工具

- **[PDF 转 Excel](/pdf-to-excel)**：整份文档的表格转成工作表，适合表格为主的 PDF
- **[提取 PDF 表格](/extract-tables)**：逐表识别，可导出 CSV、JSON、Markdown 三种格式，适合只要其中几张表、或要接入程序处理的场景
- 表格是扫描件时，务必先 OCR

## PDF 转图片：参数建议

以 [PDF 转 JPG](/pdf-to-jpg) 为例：

1. 选择文件后设置 **DPI/分辨率**：屏幕查看 96–150，打印 300
2. 选择输出全部页面或指定页码范围
3. 多页 PDF 会逐页导出，可打包下载

需要透明背景或反复编辑选 **PNG**；发网页选 **WebP**；矢量素材再加工选 **SVG**。

## 为 AI 准备 PDF

[为 AI 准备 PDF](/prepare-pdf-for-ai) 把文档解析为 LlamaIndex 兼容的 JSON 结构（含分块与元数据），可直接接入 RAG 检索增强管道。配合 [PDF 转 Markdown](/pdf-to-markdown) 使用：前者适合程序化摄取，后者适合人工阅读与二次创作。

## 下一步

- 转换前想先瘦身：[优化与修复指南](/docs/guides/optimize-repair)
- 需要在结果上盖章签名：[编辑与注释指南](/docs/guides/edit-annotate)
