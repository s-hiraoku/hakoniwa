export type AgentBackendKind = "codex-gateway" | "opencode" | "direct-api-agent";

export type ModelProviderKind =
  | "openai"
  | "anthropic"
  | "gemini"
  | "openrouter"
  | "ollama"
  | "lmstudio"
  | "openai-compatible"
  | "custom";

export type ProviderKind = AgentBackendKind | ModelProviderKind;

export type ProviderStatus =
  | "not-configured"
  | "configured"
  | "connected"
  | "error"
  | "disabled";

export type CredentialStorage = "os-keychain" | "encrypted-local" | "session-memory";

export interface CredentialRef {
  id: string;
  providerConfigId: string;
  key: string;
  label: string;
  storage: CredentialStorage;
}

export interface ProviderConfig {
  id: string;
  kind: ProviderKind;
  displayName: string;
  enabled: boolean;
  settings: Record<string, unknown>;
  credentialRefs: Record<string, CredentialRef>;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderHealth {
  status: ProviderStatus;
  message: string;
  checkedAt: string;
  capabilities?: string[];
}

export interface ProviderTarget {
  id: string;
  displayName: string;
  defaultMode?: AgentTaskMode;
  allowedModes: AgentTaskMode[];
  providerId: string;
  status: ProviderStatus;
}

export type AgentTaskMode = "read-only" | "workspace-write";

export type AgentTaskStatus =
  | "draft"
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "unknown";

export interface CreateAgentTaskInput {
  providerId: string;
  repoId: string;
  prompt: string;
  mode: AgentTaskMode;
}

export interface AgentTaskRef {
  id: string;
  providerId: string;
  repoId: string;
  status: AgentTaskStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ChangedFile {
  path: string;
  status: "added" | "modified" | "deleted" | "renamed" | "unknown";
}

export interface AgentTaskEvent {
  id: string;
  taskId: string;
  type:
    | "task.created"
    | "task.running"
    | "task.completed"
    | "task.failed"
    | "agent.message.delta"
    | "agent.message.completed"
    | "file.changed"
    | "diff.available"
    | "polling.updated";
  message: string;
  createdAt: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface AgentTaskDetail extends AgentTaskRef {
  prompt: string;
  mode: AgentTaskMode;
  title: string;
  summary?: string;
  changedFiles: ChangedFile[];
  events: AgentTaskEvent[];
  error?: string;
}

export interface AgentTaskEventHandlers {
  onEvent(event: AgentTaskEvent): void;
  onError(error: Error): void;
}

export interface AgentTaskEventSubscription {
  unsubscribe(): void;
}

export interface ModelInfo {
  id: string;
  displayName: string;
  contextWindow?: number;
  supportsTools?: boolean;
}

export interface AgentBackendProvider {
  kind: AgentBackendKind;
  id: string;
  displayName: string;
  healthCheck(): Promise<ProviderHealth>;
  listTargets?(): Promise<ProviderTarget[]>;
  createTask(input: CreateAgentTaskInput): Promise<AgentTaskRef>;
  getTask(taskId: string): Promise<AgentTaskDetail>;
  subscribeTaskEvents?(
    taskId: string,
    handlers: AgentTaskEventHandlers
  ): AgentTaskEventSubscription;
  cancelTask?(taskId: string): Promise<void>;
  steerTask?(taskId: string, input: string): Promise<void>;
}

export interface ModelProvider {
  kind: ModelProviderKind;
  id: string;
  displayName: string;
  healthCheck(): Promise<ProviderHealth>;
  listModels?(): Promise<ModelInfo[]>;
  getDefaultModel?(): Promise<string | undefined>;
}

export interface ProviderSnapshot {
  agentBackends: ProviderConfig[];
  modelProviders: ProviderConfig[];
  health: Record<string, ProviderHealth>;
  credentialStates: Record<string, "configured" | "missing">;
}
