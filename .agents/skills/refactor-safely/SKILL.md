---
description: Refactor code without behavior changes using small mechanical steps and verification.
metadata:
    github-path: skills/refactor-safely
    github-ref: refs/heads/main
    github-repo: https://github.com/s-hiraoku/codex-harnesses
    github-tree-sha: 82618abf9dfa717e6fe697100633ac6a1f40987f
name: refactor-safely
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

