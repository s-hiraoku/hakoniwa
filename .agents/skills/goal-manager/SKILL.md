---
description: Manage /goal usage for concrete Codex work, including objective writing, success criteria, done criteria, long-running implementation, verification, PR creation, resumption, and completion decisions.
metadata:
    github-path: skills/goal-manager
    github-ref: refs/heads/main
    github-repo: https://github.com/s-hiraoku/codex-harnesses
    github-tree-sha: 57aac991d3ac40268479cbbb263f033fc5ed8cfb
name: goal-manager
---
# Goal Manager

Use this workflow when a task should be tracked with `/goal` or goal-tool state.

## Workflow

1. Decide whether goal tracking is useful.
   - Create or use a goal when the user explicitly mentions `/goal`, asks for a goal or objective, or requests multi-step implementation, verification, release, or PR work.
   - Do not create a goal for quick questions, simple command output, casual brainstorming, or work that will clearly finish in one short response.
2. Shape the objective before creating the goal.
   - Make it outcome-focused, verifiable, and scoped to the current task.
   - Include expected verification and final reporting when they are part of the work.
   - Pass a token budget only when the user explicitly provides one.
3. Use the active goal during the task.
   - Check it after resuming, before broad edits, when the user changes direction, and before the final response.
   - If the newest user request conflicts with the active goal, follow the newest request and state the shift briefly.
4. Complete the goal only when the real outcome is done.
   - Required implementation or investigation is complete.
   - Relevant checks have run, or blocked checks are clearly reported.
   - The final response can summarize changed files, verification, and remaining risks.

For objective examples, read `references/examples.md` only when wording is unclear.

## Final Report

Include:

- the final goal status
- what changed or was learned
- checks or verification run
- known risks, blockers, or follow-up work
