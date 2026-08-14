# 代理工作说明

## 任务日志

仓库中的每项任务都必须记录在 `docs/logs/`，包括只调查、不修改文件的任务。

### 读取历史日志

只有用户明确要求查看、检索或整理日志时，才读取历史日志。用户要求查日志时，应先阅读 `docs/logs/README.md`，再用 `rg -n` 检索相关文件、功能、错误或决策。

### 记录任务

每项任务结束后：

1. 在 `docs/logs/` 创建或追加当前日期文件，文件名使用 `YYYY-MM-DD.md`。
2. 添加包含明确标题和时间戳的任务条目。
3. 如果首次创建日期文件，或当天索引摘要发生变化，更新 `docs/logs/README.md`。
4. 日志写入完成后，任务才算完成。

日志统一使用中文。保留代码路径、命令、类名、变量名、域名、品牌名和必要的英文专有名词，不翻译这些可检索标识。

### 日志格式

采用“YAML frontmatter + Markdown 正文”的 `.md` 格式：

- YAML frontmatter 用于 `date`、`tags`、`status` 等稳定元数据，便于脚本和 `rg` 检索。
- Markdown 正文用于背景、目标、决策、文件、命令、验证结果和风险，便于人工阅读。
- 不把整篇日志写成纯 YAML；纯 YAML 对长文本的阅读和局部查看不如 Markdown。

每个日志条目必须包含：

- 背景与目标。
- 查阅过的历史日志（如果本任务确实查阅过），以及保留或替代的决策。
- 创建、修改、移动或删除的文件。
- 执行的命令和验证结果。
- 已知警告、失败、风险和后续工作。

日志应简洁、客观、可检索。标题、标签、文件路径、命令和错误名称应保持稳定。不得写入密钥、令牌、私钥、密码、用户数据或完整环境变量值。

## 变更安全

- 修改共享配置、部署文件或功能代码前，先检查相关文件；历史日志仅在用户明确要求时读取。
- 优先保留已工作的行为，避免无关的大范围清理。
- 进行破坏性变更时，记录确切目标以及不再需要这些目标的原因。
- 完成代码或配置变更后，运行与变更风险相称的聚焦验证，并把结果记录到日志。

## 干净检出后的构建准备

- 执行正式构建或本地资源检查前，先运行 `npm install`，再运行 `npm run setup:wasm`，将固定版本 npm 包中的 PyMuPDF、Ghostscript 和 CoherentPDF 资源复制到 `public/wasm/` 并校验 SHA-256。
- `public/wasm/pymupdf/`、`public/wasm/ghostscript/`、`public/wasm/cpdf/` 为生成目录，不应手工修改或提交大文件；资源版本与 hash 由 `scripts/setup-wasm.mjs` 管理。

<!-- gitnexus:start -->

# GitNexus — Code Intelligence

This project is indexed by GitNexus as **TuHe_PDF** (19162 symbols, 33086 relationships, 300 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource                                  | Use for                                  |
| ----------------------------------------- | ---------------------------------------- |
| `gitnexus://repo/TuHe_PDF/context`        | Codebase overview, check index freshness |
| `gitnexus://repo/TuHe_PDF/clusters`       | All functional areas                     |
| `gitnexus://repo/TuHe_PDF/processes`      | All execution flows                      |
| `gitnexus://repo/TuHe_PDF/process/{name}` | Step-by-step execution trace             |

## CLI

| Task                                         | Read this skill file                                        |
| -------------------------------------------- | ----------------------------------------------------------- |
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md`       |
| Blast radius / "What breaks if I change X?"  | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?"             | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md`       |
| Rename / extract / split / refactor          | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md`     |
| Tools, resources, schema reference           | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md`           |
| Index, status, clean, wiki CLI commands      | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md`             |

<!-- gitnexus:end -->
