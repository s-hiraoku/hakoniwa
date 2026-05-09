---
name: release-check
description: Check whether a change is ready to release by reviewing diff, tests, docs, risks, and migration notes.
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

