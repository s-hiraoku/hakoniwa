import type {
  AgentBackendProvider,
  AgentTaskDetail,
  AgentTaskEvent,
  AgentTaskEventHandlers,
  AgentTaskEventSubscription,
  AgentTaskRef,
  AgentTaskStatus,
  CreateAgentTaskInput,
  ProviderConfig,
  ProviderHealth,
  ProviderTarget
} from "../../../shared/providers.js";
import type { CredentialVault } from "../../credentials/sessionCredentialVault.js";
import { CodexGatewayClient, CodexGatewayError, type CodexGatewayTask } from "./client.js";

export class CodexGatewayProvider implements AgentBackendProvider {
  readonly kind = "codex-gateway";
  readonly id: string;
  readonly displayName: string;

  constructor(
    private readonly config: ProviderConfig,
    private readonly vault: CredentialVault
  ) {
    this.id = config.id;
    this.displayName = config.displayName;
  }

  async healthCheck(): Promise<ProviderHealth> {
    if (!this.config.enabled) {
      return health("disabled", "Local Agent Gateway is disabled.");
    }

    try {
      const client = await this.client();
      const response = await client.health();
      return health(
        "connected",
        "Local Agent Gateway is reachable.",
        "capabilities" in response ? response.capabilities : undefined
      );
    } catch (error) {
      return health("error", errorMessage(error));
    }
  }

  async listTargets(): Promise<ProviderTarget[]> {
    const client = await this.client();
    const repos = await client.listRepos();
    return repos.map((repo) => ({
      id: repo.id,
      displayName: repo.displayName ?? repo.name ?? repo.id,
      defaultMode: repo.defaultMode ?? "workspace-write",
      allowedModes: repo.allowedModes ?? ["read-only", "workspace-write"],
      providerId: this.id,
      status: "connected"
    }));
  }

  async createTask(input: CreateAgentTaskInput): Promise<AgentTaskRef> {
    const client = await this.client();
    return toTaskDetail(
      await client.createTask({
        repo: input.repoId,
        prompt: input.prompt,
        mode: input.mode
      }),
      this.id,
      input.repoId,
      input.prompt,
      input.mode
    );
  }

  async getTask(taskId: string): Promise<AgentTaskDetail> {
    const client = await this.client();
    return toTaskDetail(await client.getTask(taskId), this.id);
  }

  subscribeTaskEvents(taskId: string, handlers: AgentTaskEventHandlers): AgentTaskEventSubscription {
    const controller = new AbortController();

    void this.streamEvents(taskId, controller.signal, handlers);

    return {
      unsubscribe() {
        controller.abort();
      }
    };
  }

  private async streamEvents(
    taskId: string,
    signal: AbortSignal,
    handlers: AgentTaskEventHandlers
  ): Promise<void> {
    let lastEventId: string | undefined;
    let retryMs = 2000;

    try {
      const client = await this.client();
      while (!signal.aborted) {
        const stream = await client.taskEvents(taskId, signal, lastEventId);
        const reader = stream.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (!signal.aborted) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const chunks = buffer.split("\n\n");
          buffer = chunks.pop() ?? "";
          for (const chunk of chunks) {
            const parsed = parseSseEvent(taskId, chunk);
            if (parsed.retryMs) retryMs = parsed.retryMs;
            if (parsed.event) {
              lastEventId = parsed.event.id;
              handlers.onEvent(parsed.event);
            }
          }
        }

        if (!signal.aborted) {
          await sleep(retryMs, signal);
        }
      }
    } catch (error) {
      if (!signal.aborted) {
        handlers.onError(error instanceof Error ? error : new Error("Task event stream failed."));
      }
    }
  }

  private async client(): Promise<CodexGatewayClient> {
    const tokenRef = this.config.credentialRefs.token;
    const token = tokenRef ? await this.vault.get(tokenRef) : undefined;
    const gatewayUrl = String(this.config.settings.gatewayUrl ?? "");
    return new CodexGatewayClient({ baseUrl: gatewayUrl, token });
  }
}

function toTaskDetail(
  task: CodexGatewayTask,
  providerId: string,
  repoId = task.repo,
  prompt = "",
  mode: "read-only" | "workspace-write" = task.mode ?? "workspace-write"
): AgentTaskDetail {
  const now = new Date().toISOString();
  const createdAt = task.createdAt ?? now;
  return {
    id: task.taskId,
    providerId,
    repoId,
    status: normalizeStatus(task.status),
    createdAt,
    updatedAt: task.completedAt ?? createdAt,
    prompt,
    mode,
    title: prompt.slice(0, 80) || `Task ${task.taskId}`,
    summary: task.summary,
    changedFiles: (task.changedFiles ?? []).map((file) =>
      typeof file === "string" ? { path: file, status: "modified" } : file
    ),
    events: (task.events ?? []).map((event, index) => ({
      id: event.id ?? `${task.taskId}.${index}`,
      taskId: task.taskId,
      type: normalizeEventType(event.type),
      message: event.message ?? event.type,
      createdAt: event.createdAt ?? now,
      metadata: event.metadata
    })),
    error: task.error ?? undefined
  };
}

function normalizeStatus(status: string | undefined): AgentTaskStatus {
  if (status === "pending") {
    return "queued";
  }
  if (
    status === "draft" ||
    status === "queued" ||
    status === "running" ||
    status === "completed" ||
    status === "failed" ||
    status === "cancelled"
  ) {
    return status;
  }
  return "unknown";
}

function normalizeEventType(type: string): AgentTaskEvent["type"] {
  if (
    type === "task.created" ||
    type === "task.running" ||
    type === "task.completed" ||
    type === "task.failed" ||
    type === "agent.message.delta" ||
    type === "agent.message.completed" ||
    type === "file.changed" ||
    type === "diff.available" ||
    type === "polling.updated"
  ) {
    return type;
  }
  return "polling.updated";
}

function parseSseEvent(
  taskId: string,
  chunk: string
): { event?: AgentTaskEvent; retryMs?: number } {
  const fields = parseSseFields(chunk);
  const retryMs = parseRetryMs(fields.retry);
  if (!fields.data) return { retryMs };

  try {
    const raw = JSON.parse(fields.data) as {
      id?: string;
      taskId?: string;
      type?: string;
      message?: string;
      payload?: Record<string, unknown>;
      createdAt?: string;
      metadata?: AgentTaskEvent["metadata"];
    };
    return {
      retryMs,
      event: {
        id: raw.id ?? fields.id ?? crypto.randomUUID(),
        taskId: raw.taskId ?? taskId,
        type: normalizeEventType(raw.type ?? fields.event ?? "polling.updated"),
        message: eventMessage(raw.type ?? fields.event, raw.message, raw.payload),
        createdAt: raw.createdAt ?? new Date().toISOString(),
        metadata: raw.metadata
      }
    };
  } catch {
    return {
      retryMs,
      event: {
        id: fields.id ?? crypto.randomUUID(),
        taskId,
        type: "agent.message.delta",
        message: fields.data,
        createdAt: new Date().toISOString()
      }
    };
  }
}

function parseSseFields(chunk: string): {
  id?: string;
  event?: string;
  data?: string;
  retry?: string;
} {
  const data: string[] = [];
  let id: string | undefined;
  let event: string | undefined;
  let retry: string | undefined;

  for (const line of chunk.split("\n")) {
    if (line.startsWith("id:")) {
      id = line.slice("id:".length).trim();
    } else if (line.startsWith("event:")) {
      event = line.slice("event:".length).trim();
    } else if (line.startsWith("data:")) {
      data.push(line.slice("data:".length).trim());
    } else if (line.startsWith("retry:")) {
      retry = line.slice("retry:".length).trim();
    }
  }

  return {
    id,
    event,
    data: data.length > 0 ? data.join("\n") : undefined,
    retry
  };
}

function parseRetryMs(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function eventMessage(
  type: string | undefined,
  message: string | undefined,
  payload: Record<string, unknown> | undefined
): string {
  if (message) return message;
  const text = stringPayload(payload, "text");
  if (text) return text;
  const summary = stringPayload(payload, "summary");
  if (summary) return summary;
  const changedFiles = arrayPayload(payload, "changedFiles");
  if (changedFiles.length > 0) return `Changed files: ${changedFiles.join(", ")}`;
  return type ?? "Task event received.";
}

function stringPayload(payload: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = payload?.[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function arrayPayload(payload: Record<string, unknown> | undefined, key: string): string[] {
  const value = payload?.[key];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timeout = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timeout);
        resolve();
      },
      { once: true }
    );
  });
}

function health(
  status: ProviderHealth["status"],
  message: string,
  capabilities?: string[]
): ProviderHealth {
  return {
    status,
    message,
    checkedAt: new Date().toISOString(),
    capabilities
  };
}

function errorMessage(error: unknown): string {
  if (error instanceof CodexGatewayError) return error.message;
  if (error instanceof Error) return error.message;
  return "Local Agent Gateway health check failed.";
}
