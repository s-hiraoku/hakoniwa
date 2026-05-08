# Hakoniwa Architecture

Hakoniwa is an independent AI development desktop environment. It owns the desktop UX, task board, project registry, provider registry, credential vault abstraction, worktree manager direction, terminal UI direction, browser preview direction, diff review direction, approval UI direction, provider settings, provider client adapters, and local app state.

Hakoniwa is not a VS Code extension, Theia fork, codex-app-server, or generic LLM API server.

## Process Model

- Electron main process owns privileged work: provider networking, secrets, future filesystem/worktree orchestration, and future terminal process management.
- Preload exposes a minimal typed IPC bridge through `window.hakoniwa` and is bundled to CommonJS for Electron sandbox compatibility.
- Renderer owns UI only. It does not receive Electron or Node primitives and does not execute shell commands.

Electron security defaults:

- `nodeIntegration: false`
- `contextIsolation: true`
- `sandbox: true`
- explicit IPC channels only

## D1 Modules

- `src/shared`: provider, task, credential, and IPC types shared across process boundaries.
- `src/main/credentials`: credential vault abstraction with session-memory implementation.
- `src/main/providers`: provider defaults and provider adapters.
- `src/main/providers/codex-gateway`: typed Codex Gateway client and Agent Backend Provider adapter.
- `src/preload`: narrow IPC bridge.
- `src/renderer`: Hakoniwa workbench shell.

## Local State

D1 stores created tasks in main-process memory for the current app session. Persistent project/task registries are a later phase.

## Boundaries

Provider-specific protocol shapes are converted inside adapters. UI components consume `AgentTaskDetail`, `ProviderTarget`, and `ProviderHealth`, not raw Codex Gateway responses.
