# Project Log Index

This directory is the chronological record of repository work. Files use the `YYYY-MM-DD.md` format; multiple tasks on the same day are appended as separate entries.

## Log Files

| Date                        | Summary                                                                                   | Tags                                      |
| --------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------- |
| [2026-08-08](2026-08-08.md) | Personal-project baseline, local Docker deployment, testing findings, and logging policy. | bootstrap, cleanup, docker, testing, logs |
| [2026-08-09](2026-08-09.md) | Progress review based on repository logs; prioritized next steps and remaining risks.     | progress, planning, testing, deployment   |

## Query Workflow

Before changing code or configuration, read this index and search the logs for the affected area:

```powershell
rg -n "Dockerfile|compose|<feature-or-file-name>" docs/logs
```

Use the matching entries to identify previous rationale, files affected, verification results, and unresolved risks. Append the result of that review to the new task entry.

## Current Constraints

- `LICENSE` remains AGPL-3.0-only and must be preserved.
- The local Docker service is named `tuhe-pdf` and exposes port `8080`.
- Shell scripts copied into the Linux image may have Windows CRLF endings; Dockerfile normalizes them before startup.
- Two qpdf integration tests require missing PDF fixtures. See the 2026-08-08 test entry before changing tests.
