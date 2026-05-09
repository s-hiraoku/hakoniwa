---
name: refactor-safely
description: Refactor code without behavior changes using small mechanical steps and verification.
---

# Refactor Safely

Use this workflow when improving structure without changing behavior.

## Workflow

1. Identify the current behavior and public interfaces.
2. Avoid broad rewrites unless they are explicitly justified.
3. Make small mechanical changes.
4. Preserve public APIs, data formats, and user-visible behavior.
5. Run tests after meaningful steps.
6. Update docs only if structure, commands, or contributor guidance changes.

## Final Report

Clearly state that behavior should be unchanged. Include changed files, verification run, and any areas that need extra review.

