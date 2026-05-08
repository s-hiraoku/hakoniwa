# Hakoniwa

Hakoniwa is an independent desktop workbench for supervising AI development tasks.
It is task-first, worktree-first, diff-first, terminal-aware, browser-aware, and provider-agnostic.

Hakoniwa is not a VS Code extension, not Theia, not codex-app-server, and not a generic LLM API server.

## Development

```bash
npm install
npm run dev:electron
```

Useful checks:

```bash
npm run typecheck
npm run lint
npm run build
```

## Codex Gateway

D1 supports Codex Gateway as the first Agent Backend Provider.

Environment variables are optional:

```bash
CODEX_GATEWAY_URL=http://127.0.0.1:3000
CODEX_GATEWAY_TOKEN=...
```

Secrets are held in the Electron main process session memory. The renderer receives only configured/missing credential state.

## D1 Scope

Implemented:

- Electron + React + TypeScript + Vite app shell
- secure main/preload/renderer split
- typed IPC
- provider registry foundation
- Agent Backend Provider and Model Provider type separation
- Codex Gateway health, repo list, task create, task detail, SSE/polling monitoring
- provider settings and model provider placeholders
- task board, task detail, timeline, diff placeholder, terminal placeholder, browser placeholder
- architecture docs

Not implemented in D1:

- full terminal
- full browser preview or automation
- managed worktrees
- full diff viewer
- Monaco/editor surface
- OpenCode or Direct API Agent execution
- direct model provider execution
- PR creation or cloud sync
