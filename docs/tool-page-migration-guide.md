# 工具页视觉迁移指南

## 目标

Phase 2 采用 Design Token + `.ui-*` 语义组件类的渐进迁移方式。工具页保留 Tailwind 的布局、间距和响应式 utility，但颜色、边框、交互状态由 `src/css/styles.css` 中的 token 驱动，避免在页面或运行时代码继续维护 `gray-*`、`indigo-*` 等直接颜色类。

## 组件对照

| 页面区域       | 语义类                                                            | 说明                                                 |
| -------------- | ----------------------------------------------------------------- | ---------------------------------------------------- |
| 页面根节点     | `.phase2-tool-page`                                               | 深色画布和主文字颜色                                 |
| 普通面板       | `.ui-panel` / `.ui-surface-raised`                                | 边框驱动，8px 圆角                                   |
| 上传区         | `.ui-panel.ui-drop-zone`                                          | sunken 背景、虚线边框；拖入时增加 `.is-dragging`     |
| 输入控件       | `.ui-input`                                                       | 输入框、select、textarea；焦点色来自 `--color-focus` |
| 主操作         | `.ui-button-primary`                                              | 松柏绿，限于流程主动作                               |
| 次操作         | `.ui-button-secondary`                                            | raised surface + border                              |
| 危险操作       | `.ui-button-danger`                                               | 危险红；删除、清空等不可逆操作                       |
| 成功/警告/失败 | `.ui-status-success` / `.ui-status-warning` / `.ui-status-danger` | 状态容器，不只依赖文字颜色                           |
| 分段选择       | `.ui-segmented` + `.ui-segment.is-active`                         | 运行时代码只切换 `.is-active`                        |

兼容层中的 `.ui-bg-*`、`.ui-text-*`、`.ui-border-*` 用于迁移期保留原有结构；新增功能应优先使用上表中的高层组件类。

## 运行时状态

- 拖放区：`.is-dragging`
- 分段按钮：`.is-active`
- 隐藏/显示：继续使用既有 `.hidden`
- 禁用：使用元素原生 `disabled`，由 `.ui-button-*` 统一渲染
- 危险操作：先显示确认弹窗，确认按钮必须使用 `.ui-button-danger`
- 处理中：同时显示阶段文字、进度条和百分比；不能只显示 spinner
- 成功：保留结果区和显式下载按钮，不能只依赖自动下载或提示弹窗

## 批处理脚本

`scripts/migrate-visual-batch.mjs` 内置 10 个 Phase 2d 工具及其逻辑文件。ROADMAP 的逻辑 slug 与实际文件映射如下：

- `pdf-to-word` → `src/pages/pdf-to-docx.html`
- `add-page-numbers` → `src/pages/page-numbers.html`
- `watermark-pdf` → `src/pages/add-watermark.html`

命令：

```powershell
node scripts/migrate-visual-batch.mjs --check
node scripts/migrate-visual-batch.mjs --write
node scripts/migrate-visual-batch.mjs --tool=split-pdf --write
node scripts/migrate-visual-batch.mjs --tool=split-pdf,compress-pdf --check
```

- `--write`：确定性、幂等地写入迁移结果。
- `--check`：默认模式；如果仍需迁移或存在未解决的 `gray-*` / `indigo-*` 视觉类则退出码为 1。
- `--tool=`：按逻辑 slug 选择一个或多个工具；支持上面的别名。

脚本只迁移颜色、上传区、按钮和输入控件，不替换布局、间距或业务状态。运行时生成的 class 同样在相应 TypeScript 文件中处理。

## 人工验证清单

1. 桌面 Chrome：上传态和主操作态各截图一次。
2. 375px viewport：无横向溢出，上传区、输入框和按钮可点击。
3. 键盘 Tab：焦点环可见，按钮顺序合理。
4. hover：卡片和按钮不发生位移，边框/背景变化可辨识。
5. 危险操作：确认弹窗中主危险动作与取消动作可一眼区分。
6. 处理中：阶段文字、进度条、百分比同步可见。
7. 成功态：结果容器与下载按钮可见。
8. 运行 `node scripts/i18n-smoke-test.mjs`、`npm run check:translations`、`npm run build`。
