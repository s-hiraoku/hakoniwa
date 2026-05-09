# Implementation Plan

## D0 Complete

- repository inspected
- existing `AGENTS.md` preserved
- Electron + React + TypeScript + Vite scaffold added
- architecture docs added
- initial app shell designed

## D1 Complete

- secure Electron shell
- typed preload bridge
- provider registry foundation
- encrypted local credential vault with session-memory fallback
- Codex Gateway client and provider adapter
- Gateway health check
- Gateway repo list
- Gateway task creation
- task board and task detail
- timeline with SSE and polling fallback
- Codex Gateway wire schema normalization
- task snapshot updates from polling and SSE
- Gateway URL/token origin safety
- IPC payload validation
- clean-clone `npm run dev` startup
- model provider placeholders
- worktree, terminal, browser, and diff placeholders

## D2 Candidates

- persistent project registry
- persistent provider config without secret values
- provider credential rotation and audit metadata
- managed worktree registry and lifecycle UX
- full diff viewer
- project/worktree scoped xterm.js terminal through main-process PTY
- browser preview via isolated Electron WebContentsView
- approvals center
- richer Gateway capability detection

## Later Phases

- OpenCode Agent Backend
- Direct API Agent
- OpenAI, Anthropic, Gemini, OpenRouter, Ollama, LM Studio, and custom OpenAI-compatible Model Providers
- provider routing and fallback
- cost and usage tracking
- GitHub integration and PR creation
