# zh-TW 人工复核清单

> 目标：对 `public/locales/zh-TW/tools.json` 的 **4219** 个工具键，由具备繁体中文能力的人员进行人工复核。
> 复核按**工具命名空间**分批（共 123 批），不维护 4219 个手写 checkbox。

## 复核流程

1. 选择一批（一个命名空间，如 `mergePdf`）。
2. 逐条核对 zh-TW 与 zh 的差异：术语（合併 / 分割 / 壓縮 / 旋轉 / 簽名）、操作动词、UI 控件措辞。
3. 复核通过后，在下方表格把该命名空间标记为 ✅，记录**复核人、复核日期**。
4. 把该命名空间加入 `docs/zh-TW-review-manifest.json` 的 `reviewedNamespaces`。
5. 运行 `node scripts/check-zh-tw-review.mjs`，确认该批已计入且无占位符 / HTML / 快捷键不一致。

## OpenCC 约束

- OpenCC（`scripts/i18n-convert-zhTW.mjs`）只生成**候选 diff**，绝不自动覆盖已人工确认的文本。
- 任何自动转换产出必须先经人工确认，才能写回 `tools.json`。

## 机器门控

`node scripts/check-zh-tw-review.mjs` 校验：

- 当前 4219 个键是否**全部落入已完成批次**（未覆盖的键视为新增 / 未复核，门控失败）。
- 插值占位符 `{{...}}`、HTML 标记、快捷键 token 是否与 zh / en 一致。

## 批次清单

| 命名空间             | 键数 | 状态      | 复核人 | 复核日期 |
| -------------------- | ---: | --------- | ------ | -------- |
| addAttachments       |   32 | ⬜ 待复核 |        |          |
| addBlankPage         |   30 | ⬜ 待复核 |        |          |
| addPageLabels        |   56 | ⬜ 待复核 |        |          |
| addStamps            |   24 | ⬜ 待复核 |        |          |
| addWatermark         |   50 | ⬜ 待复核 |        |          |
| adjustColors         |   38 | ⬜ 待复核 |        |          |
| alternateMerge       |   29 | ⬜ 待复核 |        |          |
| backgroundColor      |   22 | ⬜ 待复核 |        |          |
| batesNumbering       |   74 | ⬜ 待复核 |        |          |
| bmpToPdf             |   21 | ⬜ 待复核 |        |          |
| categories           |    9 | ⬜ 待复核 |        |          |
| cbzToPdf             |   24 | ⬜ 待复核 |        |          |
| changePermissions    |   44 | ⬜ 待复核 |        |          |
| changeTextColor      |   22 | ⬜ 待复核 |        |          |
| combineToSinglePage  |   30 | ⬜ 待复核 |        |          |
| comparePdfs          |  109 | ⬜ 待复核 |        |          |
| compressPdf          |   57 | ⬜ 待复核 |        |          |
| convertToPdf         |    1 | ⬜ 待复核 |        |          |
| createPdfForm        |   62 | ⬜ 待复核 |        |          |
| cropPdf              |   33 | ⬜ 待复核 |        |          |
| csvToPdf             |   24 | ⬜ 待复核 |        |          |
| decryptPdf           |   36 | ⬜ 待复核 |        |          |
| deletePages          |   29 | ⬜ 待复核 |        |          |
| deskewPdf            |   44 | ⬜ 待复核 |        |          |
| digitalSignPdf       |   86 | ⬜ 待复核 |        |          |
| dividePages          |   34 | ⬜ 待复核 |        |          |
| duplicateOrganize    |   37 | ⬜ 待复核 |        |          |
| editAttachments      |   30 | ⬜ 待复核 |        |          |
| editBookmarks        |  122 | ⬜ 待复核 |        |          |
| editMetadata         |   35 | ⬜ 待复核 |        |          |
| emailToPdf           |   36 | ⬜ 待复核 |        |          |
| encryptPdf           |   36 | ⬜ 待复核 |        |          |
| epubToPdf            |   25 | ⬜ 待复核 |        |          |
| excelToPdf           |   25 | ⬜ 待复核 |        |          |
| extractAttachments   |   20 | ⬜ 待复核 |        |          |
| extractImages        |   28 | ⬜ 待复核 |        |          |
| extractPages         |   29 | ⬜ 待复核 |        |          |
| extractTables        |   29 | ⬜ 待复核 |        |          |
| fb2ToPdf             |   25 | ⬜ 待复核 |        |          |
| fixPageSize          |   36 | ⬜ 待复核 |        |          |
| flattenPdf           |   26 | ⬜ 待复核 |        |          |
| fontToOutline        |   36 | ⬜ 待复核 |        |          |
| formCreator          |   86 | ⬜ 待复核 |        |          |
| headerFooter         |   34 | ⬜ 待复核 |        |          |
| heicToPdf            |   21 | ⬜ 待复核 |        |          |
| imageToPdf           |   25 | ⬜ 待复核 |        |          |
| invertColors         |   23 | ⬜ 待复核 |        |          |
| jpgToPdf             |   23 | ⬜ 待复核 |        |          |
| jsonToPdf            |   27 | ⬜ 待复核 |        |          |
| linearizePdf         |   30 | ⬜ 待复核 |        |          |
| markdownToPdf        |   30 | ⬜ 待复核 |        |          |
| mergePdf             |   52 | ⬜ 待复核 |        |          |
| mobiToPdf            |   25 | ⬜ 待复核 |        |          |
| nUpPdf               |   33 | ⬜ 待复核 |        |          |
| ocrPdf               |   65 | ⬜ 待复核 |        |          |
| odgToPdf             |   25 | ⬜ 待复核 |        |          |
| odpToPdf             |   25 | ⬜ 待复核 |        |          |
| odsToPdf             |   25 | ⬜ 待复核 |        |          |
| odtToPdf             |   22 | ⬜ 待复核 |        |          |
| overlayPdf           |    1 | ⬜ 待复核 |        |          |
| pageDimensions       |   39 | ⬜ 待复核 |        |          |
| pageNumbers          |   28 | ⬜ 待复核 |        |          |
| pagesToPdf           |   25 | ⬜ 待复核 |        |          |
| pdfBooklet           |   53 | ⬜ 待复核 |        |          |
| pdfEditor            |   15 | ⬜ 待复核 |        |          |
| pdfFormFiller        |   29 | ⬜ 待复核 |        |          |
| pdfMultiTool         |   21 | ⬜ 待复核 |        |          |
| pdfOcg               |   37 | ⬜ 待复核 |        |          |
| pdfOverlay           |   36 | ⬜ 待复核 |        |          |
| pdfsToZip            |   23 | ⬜ 待复核 |        |          |
| pdfToBmp             |   23 | ⬜ 待复核 |        |          |
| pdfToCbz             |   54 | ⬜ 待复核 |        |          |
| pdfToCsv             |   25 | ⬜ 待复核 |        |          |
| pdfToExcel           |   26 | ⬜ 待复核 |        |          |
| pdfToGreyscale       |   23 | ⬜ 待复核 |        |          |
| pdfToJpg             |   40 | ⬜ 待复核 |        |          |
| pdfToJson            |   26 | ⬜ 待复核 |        |          |
| pdfToMarkdown        |   31 | ⬜ 待复核 |        |          |
| pdfToPdfa            |   33 | ⬜ 待复核 |        |          |
| pdfToPng             |   27 | ⬜ 待复核 |        |          |
| pdfToSvg             |   28 | ⬜ 待复核 |        |          |
| pdfToText            |   29 | ⬜ 待复核 |        |          |
| pdfToTiff            |   40 | ⬜ 待复核 |        |          |
| pdfToWebp            |   27 | ⬜ 待复核 |        |          |
| pdfToWord            |   30 | ⬜ 待复核 |        |          |
| pdfWorkflow          |  247 | ⬜ 待复核 |        |          |
| pngToPdf             |   21 | ⬜ 待复核 |        |          |
| posterize            |    1 | ⬜ 待复核 |        |          |
| posterizePdf         |   35 | ⬜ 待复核 |        |          |
| powerpointToPdf      |   22 | ⬜ 待复核 |        |          |
| preparePdfForAi      |   35 | ⬜ 待复核 |        |          |
| psdToPdf             |   24 | ⬜ 待复核 |        |          |
| pubToPdf             |   25 | ⬜ 待复核 |        |          |
| rasterizePdf         |   39 | ⬜ 待复核 |        |          |
| removeAnnotations    |   21 | ⬜ 待复核 |        |          |
| removeBlankPages     |   31 | ⬜ 待复核 |        |          |
| removeMetadata       |   27 | ⬜ 待复核 |        |          |
| removeRestrictions   |   31 | ⬜ 待复核 |        |          |
| repairPdf            |   24 | ⬜ 待复核 |        |          |
| reversePages         |   21 | ⬜ 待复核 |        |          |
| rotateCustom         |   27 | ⬜ 待复核 |        |          |
| rotatePdf            |   26 | ⬜ 待复核 |        |          |
| rtfToPdf             |   23 | ⬜ 待复核 |        |          |
| sanitizePdf          |   30 | ⬜ 待复核 |        |          |
| scannerEffect        |   40 | ⬜ 待复核 |        |          |
| signPdf              |   21 | ⬜ 待复核 |        |          |
| splitPdf             |   68 | ⬜ 待复核 |        |          |
| svgToPdf             |   21 | ⬜ 待复核 |        |          |
| tableOfContents      |   38 | ⬜ 待复核 |        |          |
| textToPdf            |   42 | ⬜ 待复核 |        |          |
| tiffToPdf            |   21 | ⬜ 待复核 |        |          |
| timestampPdf         |   38 | ⬜ 待复核 |        |          |
| validateSignaturePdf |   32 | ⬜ 待复核 |        |          |
| viewMetadata         |   21 | ⬜ 待复核 |        |          |
| vsdToPdf             |   25 | ⬜ 待复核 |        |          |
| wasmProvider         |    1 | ⬜ 待复核 |        |          |
| wasmSettings         |   43 | ⬜ 待复核 |        |          |
| webpToPdf            |   21 | ⬜ 待复核 |        |          |
| wordToPdf            |   44 | ⬜ 待复核 |        |          |
| wpdToPdf             |   25 | ⬜ 待复核 |        |          |
| wpsToPdf             |   25 | ⬜ 待复核 |        |          |
| xmlToPdf             |   23 | ⬜ 待复核 |        |          |
| xpsToPdf             |   25 | ⬜ 待复核 |        |          |
