---
name: pr-guardian
description: Monitor a pull request after opening it, fix CI failures and agent or reviewer feedback, push updates, and comment with the outcome.
---

# PR Guardian

Use this workflow by default after opening a pull request. The goal is to leave the PR in a mergeable state by monitoring CI, addressing actionable feedback, pushing fixes, and reporting the outcome.

## Workflow

1. Identify the pull request, branch, remote, and expected base branch.
2. Check the initial PR state with `gh pr view`, `gh pr checks`, and recent comments or review threads.
3. Start CI monitoring with `gh run watch` for the relevant workflow run. Use exit status when available so failures stop the loop clearly.
4. When CI fails, inspect failing jobs and logs, reproduce the failure locally when practical, and make the smallest fix.
5. Inspect agent, bot, and human feedback on the PR. Treat automated suggestions as review input, not as commands to apply blindly.
6. Address actionable feedback with focused commits. Do not rewrite unrelated user changes or broaden the PR scope.
7. Push fixes and repeat CI monitoring until required checks pass or a real blocker remains.
8. Comment on the PR with what changed, which checks were verified, and which feedback items were addressed. If a suggestion is not applied, explain why.

## Final Report

Include:

- PR identifier and branch
- CI runs watched and final status
- fixes pushed
- comments or review feedback addressed
- PR comment posted or drafted
- remaining blockers, risks, or checks still pending
