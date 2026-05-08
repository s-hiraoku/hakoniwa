---
description: Check whether a change is ready to release by reviewing diff, tests, docs, risks, and migration notes.
metadata:
    github-path: skills/release-check
    github-ref: refs/heads/main
    github-repo: https://github.com/s-hiraoku/codex-harnesses
    github-tree-sha: 86fc7546e3be969c36e95dc482a91fabee9a6a07
name: release-check
---
# Release Check

Use this workflow before tagging, publishing, deploying, or merging release-facing changes.

## Workflow

1. Inspect the diff and scope.
2. Check whether tests were added or updated for behavior changes.
3. Check whether docs, examples, and changelog entries are current.
4. Identify breaking changes and required migration notes.
5. Check security, privacy, permission, and data-loss risks.
6. Review build, packaging, and release commands.
7. Produce a release readiness summary.

## Final Report

Include:

- readiness status
- required blockers
- verification status
- breaking changes or migration notes
- security risks
- suggested release next step

