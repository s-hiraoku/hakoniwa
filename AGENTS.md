# AGENTS.md

## Role

This repository is Hakoniwa.

Hakoniwa is an independent AI development desktop environment.

Hakoniwa is not a VS Code extension.
Hakoniwa is not Theia.
Hakoniwa is not local-agent-gateway.
Hakoniwa is not a generic LLM API server.

Hakoniwa provides an opinionated desktop UX for supervising AI development tasks across agents, worktrees, terminals, browser previews, diffs, approvals, and multiple AI providers.

The product should feel like a carefully arranged development workspace: a small, coherent world where many moving parts are visible, controllable, and easy to review.

## Product Concept

Hakoniwa brings the following into one calm, organized workspace:

- AI tasks
- worktrees
- terminal sessions
- browser previews
- diff reviews
- approvals
- agent backends
- LLM/model providers

The user should be able to supervise multiple AI development tasks, ideally isolated by worktree, and clearly understand what each agent changed, ran, verified, and needs approval for.

Chat is useful, but chat is not the whole product.

Task state, diffs, terminal output, browser state, and approvals should not be buried inside chat history.

## Core Product Direction

Hakoniwa should be:

- task-first
- worktree-first
- diff-first
- terminal-integrated
- browser-integrated
- provider-agnostic
- UX-first

The main product value is not only "AI can write code."

The main product value is that AI development work becomes observable, reviewable, controllable, and neatly organized.

## Responsibility Boundary

This repository owns:

- desktop app UX
- app shell
- task board
- project registry
- provider registry
- credential vault abstraction
- worktree manager
- terminal UI
- browser preview
- diff viewer
- approval UI
- provider settings
- provider client adapters
- local app state

This repository does not own:

- local-agent-gateway internals
- Codex App Server stdio protocol internals
- Local Agent Gateway token/scope/audit implementation
- generic LLM API server implementation
- VS Code extension implementation
- Theia integration
- OpenCode internals
- model provider backend infrastructure

local-agent-gateway is one possible external provider/backend.

It must not become a hardcoded assumption throughout Hakoniwa.

## Provider Architecture

Hakoniwa must support multiple kinds of AI backends and LLM/model providers in the future.

Do not hardcode the app around local-agent-gateway.

Distinguish between the following concepts.

### Agent Backend Providers

Agent Backend Providers can run or manage AI development tasks.

Examples:

- Local Agent Gateway / local-agent-gateway
- OpenCode
- Direct API Agent
- future local agent runtimes

A task selects an Agent Backend Provider.

Some Agent Backend Providers may manage model choice internally.
Other Agent Backend Providers may require a Model Provider and model selection.

### Model Providers

Model Providers expose LLM models or local model endpoints.

Examples:

- OpenAI
- Anthropic
- Google Gemini
- OpenRouter
- Ollama
- LM Studio
- Custom OpenAI-compatible API
- future local LLM providers

Model Providers are not necessarily task runners by themselves.

Do not mix Agent Backend Providers and Model Providers in the type system.

## Initial Provider Priorities

Implement first:

- Local Agent Gateway as an Agent Backend Provider

Design now, but do not fully implement yet:

- OpenCode Agent Backend
- Direct API Agent Backend
- OpenAI Model Provider
- Anthropic Model Provider
- Gemini Model Provider
- OpenRouter Model Provider
- Ollama Model Provider
- LM Studio Model Provider
- Custom OpenAI-compatible Model Provider

Provider placeholders are acceptable in early phases.

Hakoniwa must continue working when non-Codex providers are not configured.

## local-agent-gateway Relationship

local-agent-gateway is an external backend option.

Today it exposes local agent workflows through a Gateway API.
In the future it may evolve into a broader local agent or LLM API server.

Hakoniwa must treat local-agent-gateway as a provider with capabilities, not as the product's core architecture.

Good:

- Local Agent Gateway provider adapter
- compatibility for the existing internal `codex-gateway` provider kind while persisted settings still use it
- typed Local Agent Gateway client
- provider capability detection
- graceful fallback when Gateway APIs are unavailable

Bad:

- hardcoding all task state around Codex
- assuming every task has a Codex thread
- assuming every provider exposes the same APIs as local-agent-gateway
- sending raw local paths to local-agent-gateway
- making local-agent-gateway the only possible backend

## Security Rules

Hard rules:

- Do not expose tokens or API keys in UI, logs, screenshots, debug panels, or error messages.
- Do not store API keys in renderer state, localStorage, plain JSON config files, or plain text logs.
- Prefer OS keychain or a secure credential vault abstraction.
- In early phases, session-only in-memory credentials are acceptable.
- Renderer must not directly execute shell commands.
- Renderer must not directly perform privileged filesystem operations.
- Renderer must not directly access secrets after initial user entry.
- Network requests that require secrets should go through the main process or local backend layer.
- Do not send raw absolute worktree paths to local-agent-gateway.
- Do not assume local-agent-gateway is desktop-specific.
- Do not create arbitrary shell execution APIs.
- Do not silently run destructive commands.
- Do not implement dangerous agent autonomy without approval gates.

For Electron:

- `nodeIntegration` must be disabled.
- `contextIsolation` must be enabled.
- Use a minimal preload bridge.
- Expose only explicit, typed IPC APIs.
- Avoid leaking Node.js or Electron primitives into the renderer.

## UX Principles

UX is the main differentiator.

Hakoniwa should feel calm, clear, and review-oriented.

Prefer:

- clear task cards
- visible state
- readable errors
- diff-first review
- explicit approvals
- progressive disclosure
- small focused panels
- task/worktree scoped terminal and browser sessions

Avoid:

- chat-only UX
- huge unstructured logs
- hidden task state
- noisy debug output
- unclear provider errors
- forcing the user to understand backend protocol details

## Initial App Layout

The first useful layout should roughly be:

- left: projects, providers, task list
- center: task detail, timeline, diff placeholder
- right: agent panel, browser placeholder
- bottom: terminal placeholder

Do not overbuild the editor in the first phase.

A diff-first review interface is more important than a full IDE editor at the beginning.

## Worktree Direction

Worktrees should become a first-class feature.

A task may eventually own or use a managed worktree.

Hakoniwa should own worktree lifecycle and UX.

Do not send raw worktree paths to local-agent-gateway unless the external backend explicitly supports a safe server-side workspace target registry.

Early phases may include only placeholders or design docs for worktrees.

## Terminal Direction

Terminal should eventually be implemented as a project/worktree-scoped terminal.

Human terminal and agent command runner must be separated.

Early phases may include only a terminal placeholder.

Renderer must not directly spawn shells.

## Browser Direction

Browser preview should eventually support local dev server preview, console errors, network failures, browser comments, and later AI-assisted inspection.

Early phases may include only a browser placeholder.

Browser content is untrusted.

Do not enable Node integration in browser content.

Do not implement browser login/profile/cookie sharing in the MVP.

## Initial Implementation Priorities

1. Desktop app shell
2. Provider settings
3. Provider registry
4. Credential vault abstraction
5. Local Agent Gateway client
6. Gateway health check
7. Repo list
8. Task composer
9. Task board
10. Task detail
11. Event stream or polling fallback
12. Model Provider settings placeholders
13. Worktree / terminal / browser placeholders
14. Architecture docs

## Future Phases

- Managed worktrees
- Diff viewer
- Human terminal
- Browser preview
- Approval center
- OpenCode provider
- OpenCode Go support
- Direct API Agent
- OpenAI / Anthropic / Gemini / OpenRouter providers
- Ollama / LM Studio / local LLM providers
- Custom OpenAI-compatible provider
- Agent command runner
- Browser automation
- GitHub integration
- PR creation
- Cost / usage tracking
- Provider routing and fallback

## Development Rules

When working in this repository:

- Inspect existing files before changing anything.
- Preserve existing assets whenever possible.
- Do not rewrite the repository from scratch unless it is empty or explicitly requested.
- Prefer small, composable modules.
- Keep provider-specific code inside provider adapters.
- Keep UI components separate from provider protocol details.
- Keep secrets out of renderer and logs.
- Add docs when adding architecture.
- Add tests when adding logic.
- Run available checks before finishing.
- When opening a pull request for this repository, create a regular ready-for-review PR by default. Use a draft PR only when the user explicitly asks for draft.

Use existing package scripts when available.

Common checks may include:

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`

Do not invent missing scripts unless needed for the implementation.
