# Agent Operating Instructions

## Mandatory Task Logging

Every task performed in this repository must be recorded in `docs/logs/`, including investigation-only tasks that make no file changes.

Before planning, editing, deleting, or running a verification command:

1. Read `docs/logs/README.md`.
2. Search relevant prior entries with `rg -n "<file|feature|error|decision>" docs/logs`.
3. Identify prior decisions, changed files, known failures, and constraints that could be affected by the task.
4. Preserve those decisions unless the task explicitly supersedes them; record the reason when it does.

After each task:

1. Create or append to the current date file using `YYYY-MM-DD.md` in `docs/logs/`.
2. Add an entry with a clear task title and timestamp.
3. Update `docs/logs/README.md` when a date file is first created or its summary changes.
4. Do not consider the task complete until its log entry has been written.

Each log entry must include:

- Background and objective.
- Prior log entries consulted and decisions preserved or superseded.
- Files created, changed, moved, or deleted.
- Commands run and verification results.
- Known warnings, failures, risks, and follow-up work.

Keep entries concise, factual, searchable, and in Markdown. Use stable terms for files, features, errors, and deployment components. Never write secrets, tokens, private keys, passwords, user data, or full environment-variable values to logs.

## Change Safety

- Inspect existing files and relevant logs before modifying shared configuration, deployment files, or feature code.
- Prefer preserving working behavior over broad cleanup.
- For destructive changes, record the exact targets and the reason they are no longer needed.
- After code or configuration changes, run focused verification appropriate to the change and record the outcome.
