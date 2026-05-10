# UX Spec

Hakoniwa should feel like a calm, review-oriented development workbench where AI work is observable and controllable.

## Product Principles

- task-first
- worktree-first
- diff-first
- terminal-integrated
- browser-integrated
- provider-agnostic
- UX-first

Chat is useful, but chat is not the whole product. Task state, diffs, terminal output, browser state, and approvals should not be buried in chat history.

## D1 Layout

- Left: projects, provider status, task list
- Center: task detail, timeline, diff review placeholder
- Right: settings, task composer, agent panel placeholder, browser placeholder
- Bottom: terminal placeholder

## D1 Screens

Provider Settings:

- Agent Backends: Local Agent Gateway active, OpenCode and Direct API Agent placeholders
- Model Providers: OpenAI, Anthropic, Gemini, OpenRouter, Ollama, LM Studio, custom OpenAI-compatible placeholders
- Credentials: configured/missing state only, never raw secret values
- Defaults: Local Agent Gateway as default agent backend, model managed by provider for Gateway tasks

Task Composer:

- repo selection from Gateway targets
- prompt
- read-only or workspace-write mode
- Agent Backend: Local Agent Gateway
- model shown as managed by provider

Task Detail:

- prompt
- provider
- repo
- mode
- status
- changed files
- timeline
- error state
- diff placeholder

## Placeholders

Worktree, terminal, browser, and diff surfaces are visible but intentionally limited. They establish the future product shape without unsafe shell execution, browser automation, or raw worktree path transfer.
