import type {
  AgentTaskDetail,
  AgentTaskEvent,
  CreateAgentTaskInput,
  ProviderHealth,
  ProviderSnapshot,
  ProviderTarget
} from "./providers.js";

export const IPC_CHANNELS = {
  getProviderSnapshot: "hakoniwa:providers:get-snapshot",
  saveCodexGatewaySettings: "hakoniwa:providers:save-codex-gateway",
  checkProviderHealth: "hakoniwa:providers:check-health",
  listTargets: "hakoniwa:targets:list",
  createTask: "hakoniwa:tasks:create",
  getTask: "hakoniwa:tasks:get",
  subscribeTask: "hakoniwa:tasks:subscribe",
  unsubscribeTask: "hakoniwa:tasks:unsubscribe",
  taskEvent: "hakoniwa:tasks:event"
} as const;

export interface SaveCodexGatewaySettingsInput {
  gatewayUrl: string;
  token?: string;
  preferSse: boolean;
  pollingIntervalMs: number;
}

export interface HakoniwaApi {
  getProviderSnapshot(): Promise<ProviderSnapshot>;
  saveCodexGatewaySettings(input: SaveCodexGatewaySettingsInput): Promise<ProviderSnapshot>;
  checkProviderHealth(providerId: string): Promise<ProviderHealth>;
  listTargets(providerId: string): Promise<ProviderTarget[]>;
  createTask(input: CreateAgentTaskInput): Promise<AgentTaskDetail>;
  getTask(taskId: string): Promise<AgentTaskDetail>;
  subscribeTask(taskId: string): Promise<void>;
  unsubscribeTask(taskId: string): Promise<void>;
  onTaskEvent(handler: (event: AgentTaskEvent) => void): () => void;
}
