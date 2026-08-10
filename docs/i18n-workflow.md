# i18n 接线工作流（供执行 AI 按批操作）

> 目标读者：接手本仓库 i18n 改造的执行 AI。按本文档逐步执行即可，不需要额外背景。
> 已完成：6 个高频工具页 HTML（merge/split/compress/jpg-to/edit/sign-pdf）及其 6 个 TS 动态文案模块。
> 本文档描述的是当前仓库已采用的流程；每批仍须独立执行验证并记录结果。

## 0. 一句话原理

这个仓库（BentoPDF 的 TuHe 定制版）**已经有完整的 i18n 基础设施**，不要发明新机制：

- 语言包：`public/locales/{lang}/common.json`（通用文案）和 `public/locales/{lang}/tools.json`（各工具文案），共 21 种语言，**中文（zh）包已完整**。
- 运行时：`src/js/i18n/i18n.ts`（i18next）。页面加载时 `main.ts` 调 `initI18n()` + `applyTranslations()`，把所有带 `data-i18n="键"` 的元素的 `textContent` 替换为当前语言；`data-i18n-placeholder` 换 placeholder，`data-i18n-title` 换 title。
- 键的命名空间：`data-i18n="tools:mergePdf.xxx"` 指 tools.json 的 `mergePdf.xxx`；不带前缀（如 `data-i18n="howItWorks.hint"`）指 common.json。
- 手写用户文案的英文残留通常来自未接线。修复 = 补 `data-i18n` 属性（HTML）或改 `translate()` 调用（TS）+ 往 en/zh 语言包补键。英文可见文本一律不改，en 键值 = 原文，其他语言缺键时自动回退英文，不会破坏其余 20 种语言。底层异常（例如 CDN/WASM 的 `Error.message`）不得直接展示给用户，须显示本地化概述并仅在控制台保留原始错误。

## 1. 文案三层模型（修之前先判断文案在哪一层）

| 层               | 位置                                                                                              | 修法                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| HTML 静态        | `src/pages/*.html` 里的可见英文文本                                                               | 元素上加 `data-i18n` / `data-i18n-placeholder` / `data-i18n-title`                               |
| TS 动态渲染      | `src/js/logic/*-page.ts` 里 `document.createElement` 后赋值的 label/placeholder/title/textContent | 改为 `translate('tools:工具名.键', '英文原文')`                                                  |
| TS 弹窗/加载提示 | `showAlert('Error', '...')`、`showLoader('...')`、`showToast(...)`                                | 同上；标题用通用键 `translate('alert.error', 'Error')` / `translate('alert.success', 'Success')` |
| TS 异常消息      | `catch` 中的 `Error.message` 或第三方错误                                                         | 用户只显示本地化概述；原始异常用 `console.error` 记录，必要时按错误类型映射                      |

TS 层沿用项目既有模式（参考 `src/js/logic/add-page-labels-page.ts` 开头）：

```ts
import { t } from '../i18n/index.js';

const translate = (
  key: string,
  fallback: string,
  options?: Record<string, unknown>
) => {
  const translation = t(key, options);
  return translation && translation !== key ? translation : fallback;
};
```

动态数值用 i18next 插值：`translate('tools:mergePdf.pagesRangeLabel', fallback, { total: pageCount })`，JSON 里写 `"页码（如 1-3, 5）- 共 {{total}} 页"`。

## 2. 每批标准流程（7 步）

以"一批页面/文件"为单位循环执行。**不要一次性全仓库改**，每批可独立验证、独立提交。

### 步骤 1：盘点

- HTML：读目标 `src/pages/xxx.html`，列出所有无 `data-i18n` 的可见英文文本（按钮、label、option、li、p、h3、summary、placeholder、title）。
- TS：读目标 `src/js/logic/xxx-page.ts`，列出 `showAlert/showToast/showLoader/textContent/placeholder/.title` 的英文字面量。
- 失败分支：检查 `catch`、worker 回调和第三方加载失败是否直接展示 `Error.message`。
- 可运行 `node scripts/i18n-audit-ts.mjs` 看全仓库 TS 剩余规模。

### 步骤 2：**先查既有键**（最容易踩的坑）

语言包里常有"已建键但未接线"的情况（本仓库 compressPdf 分区就是）。合并新键前必须检查：

```bash
node -e "const j=require('./public/locales/en/tools.json');console.log(Object.keys(j.目标分区))"
```

- 有现成键 → 直接用它，不要新建同义键。
- 键值与新 markup 不匹配（如值里含元素已拆出的词）→ 改键值适配，但先 `rg` 确认该键没被别处引用。

### 步骤 3：写一次性迁移脚本并运行

**禁止手工逐处编辑**，照抄 `scripts/i18n-wire-batch1.mjs`（HTML）或 `scripts/i18n-wire-merge-ts.mjs`（TS）的模式写新脚本，规则：

- 每处替换是 `[old精确片段, new片段, 期望次数]`，用 `split/join` 替换。
- **每处必须唯一命中（或等于指定次数），任一不匹配则整体中止、不写任何文件**。
- HTML 注意：含图标等多态子节点的元素（如 `<summary>文字<i ...></i></summary>`、带 `<strong>` 的 p、带 `<i>` 的 li）不能把 `data-i18n` 挂在父元素上（`textContent` 替换会吃掉图标），要把文字包进 `<span data-i18n="...">`。
- **行尾符**：`src/js` 下很多文件是 CRLF，跨行片段匹配前必须探测并把模式里的 `\n` 换成 `\r\n`（参考 `scripts/i18n-wire-merge-ts.mjs` 的 `toEol`）。
- 中文译文：术语必须与既有 zh 包一致（先翻 `public/locales/zh/tools.json` 看该工具既有译名，例如 splitPdf 用「分割」不用「拆分」，工具名照抄 `xxxPdf.name` 的 zh 值）。品牌名 BentoPDF 照抄不译。

### 步骤 4：键完整性校验

页面/文件里引用的每个 `data-i18n`/`translate()` 键必须同时存在于 en 和 zh。**缺失数必须为 0**：

```bash
node scripts/i18n-check-keys.mjs <本批改动的所有 HTML/TS 文件>
```

### 步骤 5：格式化 + 类型检查 + 构建

本环境 **没有 `npm`/`npx` 命令**，一律用 `node node_modules/...` 直调：

```bash
node node_modules/prettier/bin/prettier.cjs --write <改动的文件>
node node_modules/typescript/bin/tsc          # 改了 TS 才需要，必须 exit 0
node node_modules/vite/bin/vite.js build      # 构建
node scripts/generate-i18n-pages.mjs          # 可选：重新生成多语言静态页（SEO 用）
```

### 步骤 6：浏览器验证（必须做，不能靠 grep 静态文件）

正文翻译发生在**浏览器运行时**，`dist/zh/*.html` 静态文件正文仍是英文，grep 静态文件会误判为失败。用真实浏览器验证：

- 模板：`scripts/i18n-smoke-test.mjs`（静态服务器 + playwright-core headless Chromium，`localStorage.setItem('i18nextLng','zh')` 模拟中文用户，断言元素文本含中文）。
- 全流程范例：`scripts/i18n-e2e-merge.mjs`（pdf-lib 生成测试 PDF → `setInputFiles` 上传 → 点按钮 → 断言成功弹窗为中文）。涉及上传/处理的工具照此复制。
- 对网络、CDN、WASM 等失败场景补充 E2E 断言：用户提示必须为中文，且不得包含原始英文异常。
- Chromium 路径：`%LOCALAPPDATA%\ms-playwright\chromium_headless_shell-1223\chrome-headless-shell-win64\chrome-headless-shell.exe`。

### 步骤 7：记录日志

按 `AGENTS.md` 要求，每批结束后追加 `docs/logs/YYYY-MM-DD.md`（YAML frontmatter + Markdown 正文，含背景、修改文件、命令与验证结果、剩余风险）。

## 3. 键命名约定

- HTML 静态：`tools.json` 该工具分区内按语义命名，如 `processBtn`、`hiw1Title`/`hiw1Desc`（How It Works 步骤）、`faq1q`/`faq1a`（FAQ）、`cardDesc`（相关工具卡片描述）。卡片标题直接复用被引用工具的 `被引工具.name`。
- TS 动态：同分区语义命名，如 `merging`、`mergeSuccess`、`loadFailed`。
- 通用：成功/失败弹窗标题用 common.json 的 `alert.success`/`alert.error`；loader 通用语 `loader.processing`；「How it works:」用 `howItWorks.hint`。

## 4. 剩余工作清单（按建议批次切分）

- [x] **批 1**：6 个高频工具页 HTML 静态文案 + merge-pdf-page.ts 动态文案。
- [x] **批 2**：split-pdf-page.ts、compress-pdf-page.ts、edit-pdf-page.ts、jpg-to-pdf-page.ts、sign-pdf-page.ts 动态文案。
- [ ] **批 3**：其余约 47 个工具页 HTML 静态文案（方法同批 1，参考 `scripts/i18n-wire-batch1.mjs`）。
- [ ] **批 4**：其余约 112 个 TS 文件的动态文案（约 830 处，完整清单跑 `node scripts/i18n-audit-ts.mjs`）。优先 `src/js/utils/password-prompt.ts`（19 处，所有加密 PDF 流程共用）和 `src/js/handlers/fileHandler.ts`（9 处，全局文件处理）。
- [ ] **批 5（可选）**：about/contact/privacy/terms/licensing/404 等静态页。
- [ ] **批 6（可选，架构级）**：让 `scripts/generate-i18n-pages.mjs` 构建期替换正文 `data-i18n`，改善 SEO 抓取的正文语言。需充分回归测试。

## 5. 验收标准（每批）

1. 迁移脚本全部命中，零中止。
2. 键校验零缺失（en + zh）。
3. `tsc` exit 0；`vite build` 成功。
4. 浏览器冒烟/E2E 覆盖首屏、动态成功提示与失败提示；中文界面不展示原始英文异常。
5. `git diff` 中无英文可见文本被改动（en 渲染不变），其余语言不受影响。
6. 日志已写入 `docs/logs/`。

## 6. 给执行 AI 的提示词模板

```
你在 <仓库路径> 工作。先读 docs/i18n-workflow.md 并严格按其流程执行第 N 批：
<批次描述>。
约束：禁止手工逐处编辑，必须写带唯一性校验和原子写入的迁移脚本；
补键前先查既有键；中文术语与 public/locales/zh/ 既有翻译一致；
完成后必须通过文档第 5 节的全部验收标准；
禁止改动任何英文可见文本；不要碰与本批无关的文件。
```
