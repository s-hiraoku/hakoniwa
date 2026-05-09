# Provider Architecture

Hakoniwa separates Agent Backend Providers from Model Providers.

## Agent Backend Providers

Agent Backend Providers run or manage AI development tasks.

Initial and planned kinds:

- `codex-gateway`: Codex Gateway / codex-app-server integration
- `opencode`: placeholder in D1
- `direct-api-agent`: placeholder in D1

A task selects an Agent Backend Provider. Some backends manage model choice internally.

## Model Providers

Model Providers expose LLM models or local model endpoints.

Planned kinds:

- `openai`
- `anthropic`
- `gemini`
- `openrouter`
- `ollama`
- `lmstudio`
- `openai-compatible`
- `custom`

Model Providers are not necessarily task runners. Direct API Agent may later combine an Agent Backend with a selected Model Provider and model.

## Config And Credentials

`ProviderConfig` contains only non-secret settings and credential references. Raw token/API key values are not stored in renderer state, localStorage, plain JSON config, or logs.

D1 credential storage:

- environment variables read by main process
- UI token entry passed once over IPC
- encrypted local vault in the main process using Electron `safeStorage`
- session-memory fallback when OS encryption is unavailable

Future storage:

- OS keychain
- provider-specific credential rotation and audit metadata

## Interfaces

Provider interfaces live in `src/shared/providers.ts`:

- `AgentBackendProvider`
- `ModelProvider`
- `ProviderConfig`
- `CredentialRef`
- `ProviderHealth`
- `ProviderTarget`
- `AgentTaskDetail`
- `AgentTaskEvent`

UI components should not depend on provider-specific response shapes.
