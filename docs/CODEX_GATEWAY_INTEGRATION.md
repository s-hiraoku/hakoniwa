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
CODEX_GATEWAY_URL=http://127.0.0.1:8787
CODEX_GATEWAY_TOKEN=...
```

Tokens are held in main-process session memory. The renderer sees only configured/missing state. If the Gateway URL changes and no replacement token is entered, Hakoniwa clears the existing token so it cannot be sent to a different origin.

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

Codex Gateway's current event endpoint may replay the events available at request time and then close. Hakoniwa reconnects with `Last-Event-ID` so it can keep collecting normalized events until the task reaches a terminal state.

`agent.message.completed` payloads are normalized into Hakoniwa timeline messages and the task detail Agent Response panel. If the Gateway only reports status, the UI shows that no final response has been reported yet.

If `/events` is unavailable or fails, Hakoniwa falls back to polling `GET /v1/tasks/:id` and emits synthetic `polling.updated` timeline events.

Polling also sends sanitized task snapshots to the renderer so status, summary, changed files, and error state stay current. Polling stops when a task reaches `completed`, `failed`, or `cancelled`.

## Repo Targets

Repo targets are displayed by ID and display name, with default mode and allowed modes. D1 does not display or send raw absolute local paths.

## Task Creation

D1 sends:

- `repo`
- prompt
- mode

The Gateway request body is exactly:

```json
{
  "repo": "repo-id",
  "prompt": "task prompt",
  "mode": "read-only"
}
```

Hakoniwa accepts the current Gateway task response shape:

```json
{
  "taskId": "task_...",
  "status": "pending",
  "repo": "repo-id",
  "mode": "read-only",
  "summary": "",
  "changedFiles": ["README.md"],
  "createdAt": "2026-05-05T00:00:00.000Z",
  "completedAt": null,
  "error": null
}
```

The Codex Gateway adapter normalizes this wire schema into Hakoniwa's internal `AgentTaskDetail`. UI components do not consume raw Gateway responses.

D1 does not send worktree paths. Worktree targets require a future safe server-side workspace target registry or equivalent Gateway capability.
