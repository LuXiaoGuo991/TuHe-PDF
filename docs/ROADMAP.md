# TuHe PDF 改造路线图

> 基线版本：v1.0.0 · 规划日期：2026-08-12  
> 产出格式：阶段路线图，每阶段含入口条件、任务清单与验收标准  
> 决策依据：grill-with-docs 会话 · `docs/TuHe PDF 界面视觉系统：最终断言方案.md` · `CONTEXT.md`

---

## 总览

| 阶段        | 里程碑        | 核心目标                                            | 预估工期 |
| ----------- | ------------- | --------------------------------------------------- | -------- |
| **Phase 0** | 稳定基线      | P1 安全债、测试全绿、WASM 可复现、无障碍            | 3–5 天   |
| **Phase 2** | v1.1 视觉重构 | Design Token 体系 + 工作台外壳 + 试点 + 10 高频工具 | 4–6 周   |
| **Phase 3** | v1.2 完整统一 | 全量工具页迁移 + 暖白主题 + zh-TW 润色              | 4–6 周   |
| **Phase 1** | v1.0.0 上线   | ECS + Caddy + HTTPS 生产部署（整体完成后）          | 1–2 天   |

**门控规则**：每阶段所有验收标准全部通过后，才能进入下一阶段。  
**上线节奏调整**：Phase 0 → Phase 2 → Phase 3 全部完成后，再执行 Phase 1（生产部署）。

---

## Phase 0 · 稳定基线

> 状态：✅ 已完成（2026-08-12；当前测试基线为 800/800）

### 入口条件

- `main` 分支干净，`npm run build` 通过（当前状态满足）

### 任务

#### 0-A 安全：修复 `isSameOriginPath` 反斜杠绕过

- **文件**：`src/js/utils/helpers.ts`（`isSameOriginPath` 函数）
- **问题**：当前只拒绝 `//`，浏览器将 `/\evil.example/x` 解析为跨域 URL
- **修复**：用 `new URL(value, location.origin)` 解析后比较 `.origin`，同时拒绝含反斜杠的值
- **测试**：在 `src/tests/helpers.test.ts` 新增反斜杠绕过回归用例（`/\\evil.example/x`、`/\x2Fevil/x`）
- **验收**：`npx vitest run src/tests/helpers.test.ts` 通过，含新增用例

#### 0-B 测试：修复 6 个失败用例

失败来源（2026-08-12 14:05 日志）：

| 测试文件                    | 失败原因                            | 修复方向                                       |
| --------------------------- | ----------------------------------- | ---------------------------------------------- |
| `pdf-decrypt.test.ts`       | 断言含硬编码英文错误文案            | 改为 locale 无关断言（正则 / 仅校验 status）   |
| `pdf-operations.test.ts`    | 同上 + 依赖 `D:\qpdf.wasm` 绝对路径 | 更新断言；fixture 改用 `public/wasm/` 相对路径 |
| `split-pdf-helpers.test.ts` | 08-11 已修复，需重新确认            | 重跑确认是否仍失败                             |
| `xss-replay.test.ts`        | 硬编码英文错误文案断言              | 改为 locale 无关断言                           |
| `tesseract-runtime.test.ts` | 语言标签映射缺失                    | 补充预期运行时语言映射常量                     |

- **验收**：`npm run test:run` 800/800 通过，0 失败

#### 0-C WASM：新增 `scripts/setup-wasm.mjs` 资源准备脚本

- **问题**：`public/wasm/pymupdf/`、`ghostscript/`、`cpdf/` 在 `.gitignore` 中，干净检出后缺失，`npm run check:local-resources` 仅在已有本地文件时通过
- **实现**：
  1. 从 npm `@bentopdf/pymupdf-wasm`、`@bentopdf/gs-wasm`、`coherentpdf` 解包到对应目录
  2. 脚本顶部常量记录每个目标文件的 SHA-256 hash，解包后校验，不匹配则中止
  3. 服务器使用轩辕镜像（`docker.xuanyuan.run`），npm 已可用
- **package.json**：新增脚本 `"setup:wasm": "node scripts/setup-wasm.mjs"`
- **AGENTS.md**：在构建步骤前注明「干净检出后必须先执行 `npm run setup:wasm`」
- **验收**：删除三个 wasm 目录后，运行脚本，`npm run check:local-resources` 通过

#### 0-D 无障碍：修复 workflow editor 动态删除控件

- **文件**：`src/js/workflow/editor.ts`
- **问题**：动态创建的节点删除控件使用 `<span>`，无 `role`、无 `aria-label`，不可键盘操作
- **修复**：改为 `<button type="button">`，绑定本地化 `aria-label`（`workbench.workflowEditor.deleteNode` 键）
- **翻译键**：`public/locales/en|zh|zh-TW/common.json` 新增 `workflowEditor.deleteNode`
- **验收**：源码扫描无裸 `<span>` 用作操作控件；`npm run check:translations` 通过；Tab 键可触发删除按钮（手动验证）

#### 0-E 字体许可证记录

- **文件**：新增 `public/wasm/ocr/fonts/FONT-LICENSES.txt`
- **内容**：`NotoSansCJKsc-Regular.otf` 和 `NotoSans-Regular.ttf` 的 OFL 声明、来源 GitHub release tag 和 SHA-256 校验和
- **验收**：文件存在，内容包含版本号和 hash

#### 0-F ADR 补记：iframe 工作台架构

- **文件**：新增 `docs/adr/0001-iframe-workbench-architecture.md`
- **内容**：为何选 iframe 而不是前端路由；工具页零改动的代价与收益；`workbench.ts` 导航拦截机制；已知限制（跨工具链接标题不同步）
- **格式**：Status / Context / Decision / Consequences 四段
- **验收**：文件存在，ADR 四段完整

### 验收标准（Phase 0 门控）

```
☑ npm run test:run              → 800/800 通过，0 失败
☑ npm run build                 → 通过，无新增错误
☑ npm run check:local-resources → 干净检出 + setup:wasm 后通过
☑ npm run check:translations    → 通过
☑ git diff --check              → 通过
☑ isSameOriginPath 反斜杠回归测试通过（/\\evil.example/ payload）
☑ workflow editor 删除按钮可键盘触发（Playwright：Enter 删除成功）
```

---

## Phase 1 · v1.0.0 生产部署

### 入口条件

- Phase 0 全部验收标准通过

### 任务

#### 1-A ECS 服务器准备

- 安装 Caddy：`curl -fsSL https://caddyserver.com/install.sh | sudo bash`（服务器上执行）
- 创建 `/etc/caddy/Caddyfile`（基于已有 `deploy/Caddyfile` 模板）：
  ```
  www.tuhepdf.cn {
    root * /var/www/tuhepdf
    file_server
    encode gzip
    header Cache-Control "public, max-age=31536000, immutable" /assets/*
    header Cache-Control "no-cache" /index.html
  }
  tuhepdf.cn {
    redir https://www.tuhepdf.cn{uri} permanent
  }
  ```
- **验证**：`sudo caddy validate --config /etc/caddy/Caddyfile`

#### 1-B 生产构建与镜像部署

本地构建（内存需求低，推荐）：

```bash
# 本地
SITE_URL=https://www.tuhepdf.cn npm run setup:wasm && npm run build
docker build -t tuhe-pdf:1.0.0 .
docker save tuhe-pdf:1.0.0 | gzip > tuhe-pdf-1.0.0.tar.gz
scp tuhe-pdf-1.0.0.tar.gz user@ecs-ip:/home/user/
# ECS 上
gunzip -c tuhe-pdf-1.0.0.tar.gz | docker load
docker compose -f deploy/compose.production.yml up -d
```

#### 1-C HTTPS 与安全验证

- `curl -I https://www.tuhepdf.cn` → 200，`Strict-Transport-Security` 响应头存在
- `curl -I http://www.tuhepdf.cn` → 301 跳转到 HTTPS
- 页脚备案号验证：`rg '苏ICP备2026010377号' dist/index.html` 有匹配
- Service Worker 回退验证：浏览器 DevTools 阻断 `cdn.jsdelivr.net` 后，合并 PDF 功能可用

#### 1-D ADR 补记：同源静态资源策略

- **文件**：新增 `docs/adr/0002-same-origin-only-resources.md`
- **内容**：为何禁用 jsDelivr/githack/CDN；与中国大陆网络可达性和 CONTEXT.md 约束的关系；Service Worker 回退机制；历史 CDN 配置的迁移路径

### 验收标准（Phase 1 门控）

```
□ https://www.tuhepdf.cn         → 200，HTTPS，TLS 证书有效
□ http://www.tuhepdf.cn          → 301 → HTTPS
□ 首页页脚显示苏ICP备2026010377号 + 苏公网安备32132202001544号
□ 阻断 cdn.jsdelivr.net 后，合并 PDF 功能可用（Service Worker 回退验证）
□ npm run check:local-resources --dist 通过
```

---

## Phase 2 · v1.1 视觉系统重构

> 状态：✅ 已完成（2026-08-12；Windows Chromium + 375px Chromium 移动端模拟验收）

### 入口条件

- Phase 0 全部验收标准通过

Phase 2 分为 4 个子阶段，必须按顺序执行，每个子阶段有独立验收标准。

---

### Phase 2a · Design Token 基础

#### 2a-1 建立 CSS Custom Properties

在 `src/css/styles.css` 头部（`@import` 之后、既有样式之前）插入，按断言文件第四节深色主题 Token 表全量定义：

```css
:root {
  --color-canvas: #171a18;
  --color-surface: #202522;
  --color-surface-raised: #2a302c;
  --color-surface-sunken: #121513;
  --color-border-subtle: #303833;
  --color-border: #3b443d;
  --color-text-primary: #f3f2ea;
  --color-text-secondary: #b4bbb1;
  --color-text-tertiary: #7f8a80;
  --color-action: #4f9b78;
  --color-action-hover: #69b58c;
  --color-action-active: #3f825f;
  --color-focus: #77b9c4;
  --color-brand-accent: #c8644b;
  --color-success: #56a981;
  --color-warning: #d6a653;
  --color-danger: #d85b55;
  --color-info: #77b9c4;
}
```

#### 2a-2 定义公共语义组件类

在 token 之后新增（不删除既有样式，附加于后）。全部引用 `var(--color-*)` token，禁止硬编码颜色值：

`.ui-surface` · `.ui-surface-raised` · `.ui-panel` · `.ui-input`  
`.ui-button-primary` · `.ui-button-secondary` · `.ui-button-danger`  
`.ui-focus-ring` · `.ui-status-success` · `.ui-status-warning` · `.ui-status-danger`

#### 2a-3 思源黑体子集脚本

- **文件**：新增 `scripts/subset-fonts.mjs`
- **工具**：`pyftsubset`（fonttools Python）或 `glyphhanger`（Node.js）
- **字符集**：GB18030 一级汉字（3755 字）+ 常用标点 + ASCII，约 2–3 MB / weight
- **产出**：`public/fonts/SourceHanSansSC-Regular.woff2`、`SourceHanSansSC-Medium.woff2`
- **CSS**：注册 `@font-face`（`font-display: swap`），`--font-sans` 思源黑体排在 DM Sans 之前

#### 2a-4 ADR：Design Token 渐进迁移策略

- **文件**：新增 `docs/adr/0003-design-token-incremental-migration.md`
- **内容**：为何不做全局字符串替换；Token 层 + 组件类两层策略；Tailwind utility 与自定义类并存期的处理原则

### 验收标准（2a）

```
☑ :root token 全量定义；语义组件仅引用 token，无额外颜色硬编码
☑ 公共组件类已定义，可在 HTML 中引用
☑ SourceHanSansSC-*.woff2 存在于 public/fonts/，< 4 MB/weight
☑ npm run build 通过
```

---

### Phase 2b · 工作台外壳迁移

**涉及文件**：`index.html`、`src/css/styles.css`（workbench 样式段）、`src/js/workbench.ts`

#### 2b-1 外壳组件换用 token

| 组件                       | 当前                         | 目标                                         |
| -------------------------- | ---------------------------- | -------------------------------------------- |
| 顶栏 `.wb-topbar`          | 硬编码 `#1f2937`、`indigo-*` | `var(--color-surface)` + 松柏绿焦点环        |
| 侧栏 `.tool-rail`          | 硬编码深灰                   | `var(--color-surface)` + border token        |
| 标签页 `.wb-tab`（激活态） | `indigo-600`                 | `var(--color-action)`                        |
| 工具卡片 `.tool-card`      | 上浮 + 厚投影                | 边框变色 hover，无位移，8px 圆角             |
| 弹窗 / modal               | 硬编码颜色                   | `var(--color-surface-raised)` + border token |

#### 2b-2 首页重构（断言文件第六节第 2 条）

将 `#tuhe-home` 按以下层级重建：

1. **搜索框**（全宽，居顶，优先级最高）
2. **高频工具区**（合并 / 拆分 / 压缩 / OCR / 签名等，高视觉权重，不与低频工具等价）
3. **分类入口**（折叠卡片，作为第二层）
4. **本地处理说明**（「文件在浏览器本地处理，不上传服务器」，克制，非营销 Banner）

#### 2b-3 字号修复（Phase 2 部分）

- `src/js/workflow/editor.ts`：节点状态文字 10px → 12px；描述文字 11px → 12px

### 验收标准（2b）

```
☑ 顶栏、侧栏、标签页、工具卡片全部使用 token（无 gray-*/indigo-* 新增硬编码）
☑ 首页包含搜索框、高频工具、分类、本地处理说明四个区域
☑ 工作流编辑器节点字号 ≥ 12px
☑ Playwright 截图：顶栏、侧栏收起/展开、hover、focus 四种状态
☑ 移动端（375px）不溢出，卡片可点击；顶栏不换行且语言按钮 ≥ 44px
☑ npm run build 通过
```

---

### Phase 2c · merge-pdf 完整试点迁移

**目标**：建立可复用的「工具页改造标准」，后续所有工具页按此模式批处理。

**涉及文件**：`src/pages/merge-pdf.html`、`src/js/logic/merge-pdf-page.ts`

#### 2c-1 工具页各区域换用组件类

| 区域          | 迁移内容                                                                      |
| ------------- | ----------------------------------------------------------------------------- |
| 上传拖放区    | `.ui-panel` + `var(--color-surface-sunken)` 背景，dashed border               |
| 文件列表项    | 结构规范：类型图标 → 文件名 → 辅助信息 → 操作；删除按钮 → `.ui-button-danger` |
| 主操作按钮    | `.ui-button-primary`（松柏绿实底）                                            |
| 加载器 / 进度 | 显示阶段文字 + 进度条，非单纯转圈（断言文件第七节状态规范）                   |
| 成功结果区    | `.ui-status-success` + 下载按钮 `.ui-button-primary`                          |
| 工具上下文行  | 工具名称 + 一句说明 + 「本地处理」标记（断言文件第六节第 1 条）               |

#### 2c-2 form-creator 日期格式修复（Phase 2 部分）

- `src/js/logic/form-creator.ts`：`tools:formCreator.defaultDateFormat`
- zh 值改为 `yyyy年mm月dd日`，zh-TW 值改为 `yyyy年mm月dd日`
- 同步更新 `public/locales/zh|zh-TW/tools.json`

#### 2c-3 文档产出

- 新增 `docs/tool-page-migration-guide.md`：记录试点建立的组件对照表、class 用法和批量脚本参数说明，供 Phase 2d 和 Phase 3 使用

### 验收标准（2c）

```
☑ node scripts/i18n-e2e-merge.mjs   → 7/7 通过
☑ 试点页无 gray-*/indigo-* 新增硬编码样式
☑ Playwright 截图：上传态、文件列表态、处理中态、成功态、危险操作确认弹窗
☑ 主操作按钮松柏绿，危险按钮危险红，视觉一眼可分
☑ 移动端（375px）布局正常
☑ npm run build 通过
```

---

### Phase 2d · 10 个高频工具批量迁移

| #   | 工具页                                  | 首页快捷入口 |
| --- | --------------------------------------- | ------------ |
| 1   | `split-pdf`                             | ✓            |
| 2   | `compress-pdf`                          | ✓            |
| 3   | `jpg-to-pdf`                            | ✓            |
| 4   | `edit-pdf`                              | ✓            |
| 5   | `sign-pdf`                              | ✓            |
| 6   | `ocr-pdf`                               | —            |
| 7   | `pdf-to-docx`（原 `pdf-to-word`）       | —            |
| 8   | `rotate-pdf`                            | —            |
| 9   | `page-numbers`（原 `add-page-numbers`） | —            |
| 10  | `add-watermark`（原 `watermark-pdf`）   | —            |

- 新增 `scripts/migrate-visual-batch.mjs`：读取工具页列表，自动替换上传区、按钮类、输入框类为对应 `.ui-*` 组件类
- 每页执行后人工抽查截图 + `node scripts/i18n-smoke-test.mjs` 中文首屏断言通过
- 批次结束后运行 `npm run build`，确认 SEO 审计通过

### 验收标准（2d）

```
☑ 10 个工具页：无 gray-*/indigo-* 新增硬编码样式
☑ node scripts/i18n-smoke-test.mjs → 10 个工具页中文首屏断言全部通过
☑ Playwright 截图：每个工具的上传态 + 主操作态
☑ npm run build 通过（含 SEO 审计）
```

### Phase 2 总验收标准（Phase 2 门控）

```
☑ Phase 2a–2d 子阶段验收全部通过
☑ npm run test:run           → 800/800 通过
☑ npm run check:translations → 通过
☑ 工作台外壳 + 10 个高频工具页：token 驱动，无直接颜色硬编码
☑ 深色主题在 Windows Chromium 下通过自动化截图与人工抽查，对比度可接受
☑ 移动端 375px Chromium 模拟：主流程无溢出、误触，主要点击目标 ≥ 44px
```

> 平台说明：当前 Windows 环境未安装 Playwright Firefox，且 Windows 无法执行 Safari 实机验收；因此未将 Firefox / Safari 写成已验证。已使用 Chromium 桌面和 375px 移动端模拟覆盖同等布局与交互门控，后续如获得对应平台需补做兼容性抽查。

---

## Phase 3 · v1.2 完整统一

### 入口条件

- Phase 2 全部验收标准通过

### 任务

#### 3-A 剩余 ~109 个工具页批量迁移

- 复用 `docs/tool-page-migration-guide.md` 和 `scripts/migrate-visual-batch.mjs`
- 按工具类别分批：文件操作类 → 格式转换类 → 编辑类 → 安全类 → 其他
- 每批：脚本执行 → `npm run build` → 每类抽样截图
- 完成后：`rg 'indigo-|bg-gray-[2-9]' src/pages/` 结果为 0

#### 3-B 暖白主题（`data-theme="light"`）

在 `src/css/styles.css` 新增 token 覆盖（断言文件第四节暖白主题 Token 表全量）：

```css
[data-theme='light'] {
  --color-canvas: #f5f3ec;
  --color-surface: #ffffff;
  --color-surface-raised: #f0f2ec;
  --color-surface-sunken: #e8eae3;
  --color-border-subtle: #e1e4db;
  --color-border: #d1d7cc;
  --color-text-primary: #252b27;
  --color-text-secondary: #5d685f;
  --color-text-tertiary: #818a81;
  --color-action: #39785c;
  --color-action-hover: #2d674d;
  --color-focus: #317d8d;
  --color-brand-accent: #b8513d;
}
```

- `src/js/workbench.ts`：读写 `localStorage.getItem('tuhe-theme')`，顶栏新增主题切换按钮（sun / moon 图标，Lucide）
- **验收**：深色 / 暖白两种主题下，所有 `.ui-*` 组件对比度 WCAG AA；`localStorage` 持久化

#### 3-C zh-TW 人工润色

- 新增 `docs/zh-TW-review-checklist.md`：列出高频工具文案、操作动词（合併 / 分割 / 壓縮 / 旋轉 / 簽名）和 UI 控件需要人工校对的位置
- 由具备繁体中文能力的人员逐页复核 `public/locales/zh-TW/tools.json`（4211 键）
- **验收**：清单全部完成 ✓；`npm run check:translations` 通过

#### 3-D 构建期中文正文渲染（可选优化）

- 扩展 `scripts/generate-i18n-pages.mjs`，构建期将 `/zh/*.html` 工具页可见正文直接替换为中文（不只是 meta）
- **目标**：禁用 JavaScript 时 `/zh/*.html` 正文已是中文，改善 SEO 抓取
- **验收**：`node scripts/check-i18n-static-pages.mjs` 在正文级别通过

### Phase 3 验收标准（Phase 3 门控）

```
□ 全部 119 个工具页：无 indigo-*/bg-gray-[2-9] 硬编码颜色
□ 深色 / 暖白主题切换：localStorage 持久化，所有组件正确响应
□ npm run test:run → 全部通过
□ npm run build   → 全部通过，无新增错误
```

---

## Phase 1 · v1.0.0 生产部署（整体完成后执行）

### 入口条件

- Phase 0 + Phase 2 + Phase 3 全部验收标准通过

### 任务

#### 1-A ECS 服务器准备

- 安装 Caddy：`curl -fsSL https://caddyserver.com/install.sh | sudo bash`（服务器执行）
- 创建 `/etc/caddy/Caddyfile`（基于 `deploy/Caddyfile` 模板）：
  ```
  www.tuhepdf.cn {
    root * /var/www/tuhepdf
    file_server
    encode gzip
    header Cache-Control "public, max-age=31536000, immutable" /assets/*
    header Cache-Control "no-cache" /index.html
  }
  tuhepdf.cn {
    redir https://www.tuhepdf.cn{uri} permanent
  }
  ```
- `sudo caddy validate --config /etc/caddy/Caddyfile`

#### 1-B 生产构建与镜像部署

```bash
# 本地
SITE_URL=https://www.tuhepdf.cn npm run setup:wasm && npm run build
docker build -t tuhe-pdf:1.0.0 .
docker save tuhe-pdf:1.0.0 | gzip > tuhe-pdf-1.0.0.tar.gz
scp tuhe-pdf-1.0.0.tar.gz user@ecs-ip:/home/user/
# ECS 上
gunzip -c tuhe-pdf-1.0.0.tar.gz | docker load
docker compose -f deploy/compose.production.yml up -d
```

#### 1-C HTTPS 与安全验证

- `curl -I https://www.tuhepdf.cn` → 200，`Strict-Transport-Security` 头存在
- `curl -I http://www.tuhepdf.cn` → 301 → HTTPS
- 页脚备案号可见：苏ICP备2026010377号 + 苏公网安备32132202001544号
- 阻断 `cdn.jsdelivr.net` 后，合并 PDF 功能可用（Service Worker 回退验证）

#### 1-D ADR 补记：同源静态资源策略

- **文件**：新增 `docs/adr/0002-same-origin-only-resources.md`
- **内容**：为何禁用 jsDelivr / githack / CDN；与中国大陆网络可达性和 CONTEXT.md 约束的关系；Service Worker 回退机制

### 验收标准（Phase 1 门控）

```
□ https://www.tuhepdf.cn         → 200，HTTPS，TLS 证书有效
□ http://www.tuhepdf.cn          → 301 → HTTPS
□ 首页页脚显示苏ICP备2026010377号 + 苏公网安备32132202001544号
□ 阻断 cdn.jsdelivr.net 后，合并 PDF 功能可用
□ npm run check:local-resources --dist 通过
```

---

## ADR 索引

| 编号 | 标题                      | 创建阶段                |
| ---- | ------------------------- | ----------------------- |
| 0001 | iframe 工作台架构         | Phase 0（补记历史决策） |
| 0002 | 同源静态资源策略          | Phase 1                 |
| 0003 | Design Token 渐进迁移策略 | Phase 2a                |

---

## 关键文件路径速查

| 目的                | 路径                                                 |
| ------------------- | ---------------------------------------------------- |
| 视觉 token + 组件类 | `src/css/styles.css` 头部                            |
| 工作台主逻辑        | `src/js/workbench.ts`                                |
| WASM 资源准备脚本   | `scripts/setup-wasm.mjs`（Phase 0 新增）             |
| 字体子集脚本        | `scripts/subset-fonts.mjs`（Phase 2a 新增）          |
| 视觉迁移批处理脚本  | `scripts/migrate-visual-batch.mjs`（Phase 2d 新增）  |
| 工具页迁移指南      | `docs/tool-page-migration-guide.md`（Phase 2c 产出） |
| 断言方案原文        | `docs/TuHe PDF 界面视觉系统：最终断言方案.md`        |
| 领域词汇表          | `CONTEXT.md`                                         |
| ADR 目录            | `docs/adr/`                                          |

---

_本文档由 grill-with-docs 会话（2026-08-12）生成。每阶段完成时，在对应日期日志中追加验收结果，并将本文档对应阶段标记为 ✅ 完成。_
