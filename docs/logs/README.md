# 项目日志索引

本目录按日期记录仓库工作。文件名使用 `YYYY-MM-DD.md`；同一天的多个任务追加为独立条目。日志正文统一使用中文，代码路径、命令和专有名词按原样保留。

## 日志文件

| 日期                        | 摘要                                                                                                             | 标签                                                                                            |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| [2026-08-08](2026-08-08.md) | 项目基线、Docker 本地部署、测试结果和日志规范初始化。                                                            | bootstrap, cleanup, docker, testing, logs                                                       |
| [2026-08-09](2026-08-09.md) | 前端门面规划、办公用户审计、部署准备、DNS/安全组记录、TuHe T/H 标志探索和技能安装。                              | progress, planning, testing, deployment, frontend, design, logo, imagegen, office-users, skills |
| [2026-08-10](2026-08-10.md) | 工作台标签页无任务时复用替换、原位替换动画优化，并移除全部 115 个工具页面的页脚区块。                            | workbench, tabs, footer, animation, frontend                                                    |
| [2026-08-11](2026-08-11.md) | Review 国际化和品牌配置，实施同源资源与中文静态渲染；提交前审查记录资源复现、URL/CSP、DOM 和字体阻断。           | review, i18n, branding, seo, testing, wasm, ocr, offline, security, delivery                    |
| [2026-08-12](2026-08-12.md) | 中文 UX 与法律合规收敛；完成 Phase 0 稳定基线提交，并实施 Phase 2 Design Token、工作台与 10 个高频工具视觉迁移。 | review, phase0, phase2, design-token, workbench, tools, accessibility, i18n, testing            |

## 查询方式

只有用户明确要求检索日志时，才先读本索引并执行针对性搜索：

```powershell
rg -n "Dockerfile|compose|<功能或文件名>" docs/logs
```

不要为了形式而通读全部日志；只读取与当前任务直接相关的条目。

## 日志格式决定

日志采用“YAML frontmatter + Markdown 正文”。YAML 只保存日期、标签、状态等结构化元数据，Markdown 保存中文叙述和命令结果。这样同时兼顾机器检索、局部 `rg` 搜索和人工阅读；不建议把整篇日志写成纯 YAML。

## 当前约束

- 必须保留 `LICENSE` 的 AGPL-3.0-only 许可。
- 本地 Docker 服务名为 `tuhe-pdf`，暴露端口 `8080`。
- 复制到 Linux 镜像中的 Shell 脚本可能带有 Windows CRLF 换行；Dockerfile 会在启动前统一处理。
- 两个 qpdf 集成测试缺少 PDF fixture。修改测试前先查看 2026-08-08 日志中的测试记录。

## 2026-08-12 补充索引

- Phase 0 稳定基线补齐与验收：安全路径校验、800/800 测试、可复现 WASM、workflow 键盘无障碍、字体许可证、iframe ADR；提交 `eb75441`。
- Phase 2 视觉系统重构：Design Token、思源黑体子集、工作台外壳、`merge-pdf` 试点、10 个高频工具页迁移、32 张 Chromium 视觉截图与 375px 移动端门控。
