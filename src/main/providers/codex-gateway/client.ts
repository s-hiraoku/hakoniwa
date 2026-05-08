import { z } from "zod";

export interface CodexGatewayClientOptions {
  baseUrl: string;
  token?: string;
}

export class CodexGatewayClient {
  private readonly baseUrl: string;
  private readonly token?: string;

  constructor(options: CodexGatewayClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.token = options.token;
  }

  async health(): Promise<CodexGatewayHealth> {
    return healthSchema.parse(await this.request("/healthz"));
  }

  async listRepos(): Promise<CodexGatewayRepo[]> {
    const body = await this.request("/v1/repos");
    return reposResponseSchema.parse(body).repos;
  }

  async createTask(input: CodexGatewayCreateTaskInput): Promise<CodexGatewayTask> {
    return taskSchema.parse(
      await this.request("/v1/tasks", {
        method: "POST",
        body: JSON.stringify({
          repo: input.repo,
          prompt: input.prompt,
          mode: input.mode
        })
      })
    );
  }

  async getTask(taskId: string): Promise<CodexGatewayTask> {
    return taskSchema.parse(await this.request(`/v1/tasks/${encodeURIComponent(taskId)}`));
  }

  async taskEvents(taskId: string, signal: AbortSignal): Promise<ReadableStream<Uint8Array>> {
    const response = await fetch(`${this.baseUrl}/v1/tasks/${encodeURIComponent(taskId)}/events`, {
      headers: this.headers(),
      signal
    });
    if (!response.ok || !response.body) {
      throw new CodexGatewayError(response.status, sanitizeGatewayError(response.status));
    }
    return response.body;
  }

  private async request(path: string, init: RequestInit = {}): Promise<unknown> {
    if (!this.baseUrl) {
      throw new CodexGatewayError(0, "Codex Gateway URL is not configured.");
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        ...this.headers(),
        "Content-Type": "application/json",
        ...init.headers
      }
    });

    if (!response.ok) {
      throw new CodexGatewayError(response.status, sanitizeGatewayError(response.status));
    }

    if (response.status === 204) {
      return {};
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return response.json();
    }
    return response.text();
  }

  private headers(): HeadersInit {
    return this.token ? { Authorization: `Bearer ${this.token}` } : {};
  }
}

export class CodexGatewayError extends Error {
  constructor(
    readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "CodexGatewayError";
  }
}

function sanitizeGatewayError(status: number): string {
  if (status === 401 || status === 403) {
    return "Codex Gateway rejected the credentials.";
  }
  if (status === 404) {
    return "Codex Gateway endpoint is unavailable.";
  }
  if (status >= 500) {
    return "Codex Gateway returned a server error.";
  }
  return "Codex Gateway request failed.";
}

const healthSchema = z.union([
  z
    .object({
      status: z.string().default("ok"),
      version: z.string().optional(),
      capabilities: z.array(z.string()).optional()
    })
    .passthrough(),
  z.string().transform((status) => ({ status }))
]);

const repoSchema = z
  .object({
    id: z.string(),
    displayName: z.string().optional(),
    name: z.string().optional(),
    defaultMode: z.enum(["read-only", "workspace-write"]).optional(),
    allowedModes: z.array(z.enum(["read-only", "workspace-write"])).optional(),
    provider: z.string().optional()
  })
  .passthrough();

const reposResponseSchema = z.union([
  z.object({ repos: z.array(repoSchema) }),
  z.array(repoSchema).transform((repos) => ({ repos }))
]);

const changedFileSchema = z.union([
  z.string(),
  z
    .object({
      path: z.string(),
      status: z.enum(["added", "modified", "deleted", "renamed", "unknown"]).default("unknown")
    })
    .passthrough()
]);

const eventSchema = z
  .object({
    id: z.string().optional(),
    type: z.string(),
    message: z.string().optional(),
    createdAt: z.string().optional(),
    metadata: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional()
  })
  .passthrough();

const taskSchema = z
  .object({
    taskId: z.string(),
    repo: z.string(),
    status: z.string().optional(),
    mode: z.enum(["read-only", "workspace-write"]).optional(),
    summary: z.string().optional().default(""),
    changedFiles: z.array(changedFileSchema).optional(),
    events: z.array(eventSchema).optional().default([]),
    error: z.string().nullable().optional(),
    createdAt: z.string().optional(),
    completedAt: z.string().nullable().optional()
  })
  .passthrough();

export type CodexGatewayHealth = z.infer<typeof healthSchema>;
export type CodexGatewayRepo = z.infer<typeof repoSchema>;
export type CodexGatewayTask = z.infer<typeof taskSchema>;

export interface CodexGatewayCreateTaskInput {
  repo: string;
  prompt: string;
  mode: "read-only" | "workspace-write";
}
