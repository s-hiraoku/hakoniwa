---
description: Review code changes with a bug-first, risk-focused workflow before merge or release.
metadata:
    github-path: skills/review
    github-ref: refs/heads/main
    github-repo: https://github.com/s-hiraoku/codex-harnesses
    github-tree-sha: 35722aa00e82fcd53f75ac355ae0ae313c1f3e64
name: review
---
# Review

Use this workflow when reviewing a diff, pull request, branch, or local change set.

## Workflow

1. Identify the review scope: diff, files, commit range, pull request, or task goal.
2. Inspect changed behavior before style or cleanup concerns.
3. Prioritize bugs, regressions, security risks, data-loss risks, and missing verification.
4. Check whether tests, docs, migrations, and release notes match the behavioral impact.
5. Look for edge cases around empty input, permissions, concurrency, rollback, and failure paths.
6. Keep findings specific, reproducible, and tied to exact files or lines when possible.
7. Avoid broad refactor suggestions unless they block correctness, safety, or maintainability.
8. If no issues are found, say so clearly and note remaining test gaps or residual risk.

## Final Report

Lead with findings, ordered by severity.

For each finding, include:

- severity or priority
- file and line when available
- what can fail
- why it matters
- a concrete fix direction

Then include:

- open questions or assumptions
- verification reviewed or still missing
- brief summary of the reviewed change

