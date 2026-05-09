# Hakoniwa

Hakoniwa is an independent desktop workbench for supervising AI development tasks.
It is task-first, worktree-first, diff-first, terminal-aware, browser-aware, and provider-agnostic.

Hakoniwa is not a VS Code extension, not Theia, not codex-app-server, and not a generic LLM API server.

## Development

```bash
npm install
npm run dev
```

`npm run dev` starts the Vite renderer but launches the packaged
`release/mac-arm64/Hakoniwa.app` shell so macOS focuses Hakoniwa with its own
bundle id. Avoid using the browser preview at `http://127.0.0.1:5173` for
Gateway settings because it cannot access the Electron preload bridge.

User guide:

- GitHub Pages entry: `docs/index.html`
- Markdown guide: [docs/USER_GUIDE.md](docs/USER_GUIDE.md)

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
CODEX_GATEWAY_URL=http://127.0.0.1:8787
CODEX_GATEWAY_TOKEN=...
```

Secrets are held in the Electron main process session memory. The renderer receives only configured/missing credential state. If the Gateway URL changes without a new token, Hakoniwa clears the previous token and asks for re-entry.

## D1 Scope

Implemented:

- Electron + React + TypeScript + Vite app shell
- secure main/preload/renderer split
- sandbox-compatible bundled CommonJS preload
- typed IPC
- provider registry foundation
- Agent Backend Provider and Model Provider type separation
- Codex Gateway health, repo list, task create, task detail, task snapshot updates, SSE/polling monitoring
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
