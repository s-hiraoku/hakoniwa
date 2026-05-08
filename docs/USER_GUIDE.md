# Hakoniwa User Guide

Hakoniwa is an independent desktop app for supervising AI development tasks. The D1 build focuses on a clean path from Codex Gateway configuration to task monitoring.

## Quick Start

Requirements:

- Node.js
- npm
- a running Codex Gateway, usually at `http://127.0.0.1:8787`

Install and launch:

```bash
npm install
npm run dev
```

The app opens as an Electron desktop window. The development command builds the main/preload process first, starts the Vite renderer, and launches Electron.

## Codex Gateway

Hakoniwa treats Codex Gateway as an Agent Backend Provider. It is not hardcoded as the whole product architecture.

Default Gateway URL:

```text
http://127.0.0.1:8787
```

You can configure the Gateway from the Settings panel:

1. Enter the Gateway URL.
2. Enter the Gateway token if required.
3. Keep "Prefer SSE events" enabled unless the Gateway does not support events.
4. Click "Save".
5. Click "Health check".

Environment variables are also supported:

```bash
CODEX_GATEWAY_URL=http://127.0.0.1:8787 CODEX_GATEWAY_TOKEN=... npm run dev
```

Secrets are held only in the Electron main process session memory. The renderer sees configured/missing state, not the token value. If the Gateway URL changes without a new token, Hakoniwa clears the previous token and asks for re-entry.

## Load Repositories

After the health check succeeds, Hakoniwa loads Gateway repo targets from:

```text
GET /v1/repos
```

The left panel shows repo display name, default mode, allowed modes, provider, and connection status. Hakoniwa does not display or send raw absolute worktree paths in D1.

## Create A Task

Use the Task Composer:

1. Select a repository.
2. Choose `read-only` or `workspace-write`.
3. Enter a prompt.
4. Click "Create task".

Hakoniwa sends:

```json
{
  "repo": "repo-id",
  "prompt": "task prompt",
  "mode": "read-only"
}
```

The Codex Gateway adapter normalizes the Gateway task response into Hakoniwa's internal task shape before the UI sees it.

## Monitor A Task

Task detail shows:

- prompt
- provider
- repo
- mode
- status
- summary
- changed files
- timeline
- error state

Hakoniwa prefers `GET /v1/tasks/:id/events` when available. If events are unavailable, fail, or close before the task reaches a terminal state, Hakoniwa polls:

```text
GET /v1/tasks/:id
```

Polling updates task status, summary, changed files, error state, and timeline. Polling stops when the task reaches `completed`, `failed`, or `cancelled`.

## Current Limits

D1 intentionally leaves these as placeholders:

- managed worktrees
- full terminal
- full browser preview
- full diff viewer
- approval center
- OpenCode provider
- Direct API Agent
- direct model provider execution

The visible placeholders reserve the product shape without adding unsafe shell execution, browser automation, or raw worktree path transfer too early.

## Troubleshooting

Gateway URL not configured:

- Confirm the Settings panel uses `http://127.0.0.1:8787` or your actual Gateway URL.

Unauthorized:

- Re-enter the Gateway token.
- If you changed the Gateway URL, Hakoniwa clears the previous token by design.

No repos returned:

- Confirm Codex Gateway supports `GET /v1/repos`.
- Check that the token has access to the expected repo targets.

Task timeline stops:

- Hakoniwa should fall back to polling when events close. If it does not, reload the app and run a health check again.

## Related Docs

- [Architecture](./ARCHITECTURE.md)
- [Provider Architecture](./PROVIDER_ARCHITECTURE.md)
- [Codex Gateway Integration](./CODEX_GATEWAY_INTEGRATION.md)
- [Implementation Plan](./IMPLEMENTATION_PLAN.md)
