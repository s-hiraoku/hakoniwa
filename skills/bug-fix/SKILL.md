---
name: bug-fix
description: Fix bugs with reproduction, minimal changes, regression coverage, and targeted verification.
---

# Bug Fix

Use this workflow when correcting broken or unexpected behavior.

## Workflow

1. Reproduce the bug, or clearly reason about it when reproduction is not practical.
2. Identify the likely cause in the current implementation.
3. Make the smallest fix that addresses the cause.
4. Add a regression test when possible.
5. Run targeted verification for the affected area.
6. Run broader checks if the fix touches shared behavior.

## Final Report

Include:

- what failed before
- why the fix addresses it
- regression test coverage, if added
- verification run
- remaining risks

