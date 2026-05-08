# Codex Gateway Integration

Codex Gateway is the first D1 Agent Backend Provider. It is treated as one provider adapter, not as Hakoniwa's core architecture.

## Configuration

Settings panel fields:

- Gateway URL
- Gateway token
- prefer SSE if available
- polling interval

Optional environment variables:

```bash
CODEX_GATEWAY_URL=http://127.0.0.1:3000
CODEX_GATEWAY_TOKEN=...
```

Tokens are held in main-process session memory. The renderer sees only configured/missing state.

## Supported API

Required D1 endpoints:

- `GET /healthz`
- `GET /v1/repos`
- `POST /v1/tasks`
- `GET /v1/tasks/:id`

Optional endpoint:

- `GET /v1/tasks/:id/events`

## Event Handling

Hakoniwa prefers Gateway events when available. Because Authorization headers may be required, the SSE request is made in the main process, not with renderer `EventSource`.

If `/events` is unavailable or fails, Hakoniwa falls back to polling `GET /v1/tasks/:id` and emits synthetic `polling.updated` timeline events.

## Repo Targets

Repo targets are displayed by ID and display name, with default mode and allowed modes. D1 does not display or send raw absolute local paths.

## Task Creation

D1 sends:

- repo ID
- prompt
- mode

D1 does not send worktree paths. Worktree targets require a future safe server-side workspace target registry or equivalent Gateway capability.
