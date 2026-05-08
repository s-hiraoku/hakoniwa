import { BrowserWindow } from "electron";
import type {
  AgentBackendProvider,
  AgentTaskDetail,
  AgentTaskEvent,
  AgentTaskEventSubscription,
  ProviderConfig,
  ProviderHealth,
  ProviderSnapshot
} from "../shared/providers.js";
import { IPC_CHANNELS } from "../shared/ipc.js";
import { SessionCredentialVault } from "./credentials/sessionCredentialVault.js";
import {
  CODEX_GATEWAY_PROVIDER_ID,
  createDefaultProviderConfigs
} from "./providers/defaults.js";
import { CodexGatewayProvider } from "./providers/codex-gateway/adapter.js";

export class ProviderRuntime {
  private readonly vault = new SessionCredentialVault();
  private readonly configs = createDefaultProviderConfigs();
  private readonly health = new Map<string, ProviderHealth>();
  private readonly tasks = new Map<string, AgentTaskDetail>();
  private readonly subscriptions = new Map<string, AgentTaskEventSubscription>();

  constructor(private readonly getMainWindow: () => BrowserWindow | undefined) {
    const codex = this.configs.agentBackends.find((config) => config.id === CODEX_GATEWAY_PROVIDER_ID);
    const token = process.env.CODEX_GATEWAY_TOKEN;
    if (codex?.credentialRefs.token && token) {
      void this.vault.set(codex.credentialRefs.token, token);
    }
  }

  async snapshot(): Promise<ProviderSnapshot> {
    const credentialStates: ProviderSnapshot["credentialStates"] = {};
    for (const config of [...this.configs.agentBackends, ...this.configs.modelProviders]) {
      for (const ref of Object.values(config.credentialRefs)) {
        credentialStates[ref.id] = (await this.vault.has(ref)) ? "configured" : "missing";
      }
    }

    return {
      agentBackends: this.configs.agentBackends,
      modelProviders: this.configs.modelProviders,
      health: Object.fromEntries(this.health),
      credentialStates
    };
  }

  async saveCodexGatewaySettings(input: {
    gatewayUrl: string;
    token?: string;
    preferSse: boolean;
    pollingIntervalMs: number;
  }): Promise<ProviderSnapshot> {
    const config = this.getConfig(CODEX_GATEWAY_PROVIDER_ID);
    const previousGatewayUrl = String(config.settings.gatewayUrl ?? "");
    const nextGatewayUrl = input.gatewayUrl;
    const tokenRef = config.credentialRefs.token;
    const nextToken = input.token?.trim();

    config.settings = {
      gatewayUrl: nextGatewayUrl,
      preferSse: input.preferSse,
      pollingIntervalMs: input.pollingIntervalMs
    };
    config.updatedAt = new Date().toISOString();

    if (tokenRef && nextToken) {
      await this.vault.set(tokenRef, nextToken);
    } else if (tokenRef && previousGatewayUrl && previousGatewayUrl !== nextGatewayUrl) {
      await this.vault.delete(tokenRef);
    }

    return this.snapshot();
  }

  async checkProviderHealth(providerId: string): Promise<ProviderHealth> {
    const provider = this.getAgentBackend(providerId);
    const result = await provider.healthCheck();
    this.health.set(providerId, result);
    return result;
  }

  async listTargets(providerId: string) {
    const provider = this.getAgentBackend(providerId);
    if (!provider.listTargets) return [];
    return provider.listTargets();
  }

  async createTask(input: {
    providerId: string;
    repoId: string;
    prompt: string;
    mode: "read-only" | "workspace-write";
  }): Promise<AgentTaskDetail> {
    const provider = this.getAgentBackend(input.providerId);
    const ref = await provider.createTask(input);
    const localDetail: AgentTaskDetail = {
      ...ref,
      prompt: input.prompt,
      mode: input.mode,
      title: input.prompt.slice(0, 80),
      changedFiles: [],
      events: [
        {
          id: crypto.randomUUID(),
          taskId: ref.id,
          type: "task.created" as const,
          message: "Task created.",
          createdAt: ref.createdAt
        }
      ]
    };
    const detail = await provider
      .getTask(ref.id)
      .then((fetched) => mergeLocalTask(localDetail, fetched))
      .catch(() => localDetail);
    this.tasks.set(detail.id, detail);
    this.emitTaskUpdated(detail);
    return detail;
  }

  async getTask(taskId: string): Promise<AgentTaskDetail> {
    const cached = this.tasks.get(taskId);
    if (!cached) {
      throw new Error("Task is not known in this Hakoniwa session.");
    }
    const provider = this.getAgentBackend(cached.providerId);
    const detail = await provider.getTask(taskId);
    this.tasks.set(taskId, mergeLocalTask(cached, detail));
    const updated = this.tasks.get(taskId)!;
    this.emitTaskUpdated(updated);
    return updated;
  }

  async subscribeTask(taskId: string): Promise<void> {
    if (this.subscriptions.has(taskId)) return;
    const task = this.tasks.get(taskId);
    if (!task) throw new Error("Task is not known in this Hakoniwa session.");
    const provider = this.getAgentBackend(task.providerId);
    const config = this.getConfig(task.providerId);
    const preferSse = Boolean(config.settings.preferSse ?? true);

    if (preferSse && provider.subscribeTaskEvents) {
      const subscription = provider.subscribeTaskEvents(taskId, {
        onEvent: (event) => {
          this.recordEvent(taskId, event);
          void this.refreshTaskSnapshot(taskId);
        },
        onError: () => {
          this.subscriptions.delete(taskId);
          this.startPolling(taskId);
        }
      });
      this.subscriptions.set(taskId, subscription);
      return;
    }

    this.startPolling(taskId);
  }

  async unsubscribeTask(taskId: string): Promise<void> {
    this.subscriptions.get(taskId)?.unsubscribe();
    this.subscriptions.delete(taskId);
  }

  private startPolling(taskId: string): void {
    if (this.subscriptions.has(taskId)) return;
    const task = this.tasks.get(taskId);
    if (!task) return;
    const intervalMs = Number(this.getConfig(task.providerId).settings.pollingIntervalMs ?? 3000);
    const timer = setInterval(() => {
      void this.getTask(taskId)
        .then((detail) => {
          this.recordEvent(taskId, {
            id: crypto.randomUUID(),
            taskId,
            type: "polling.updated",
            message: `Task status is ${detail.status}.`,
            createdAt: new Date().toISOString()
          });
          if (isTerminalStatus(detail.status)) {
            void this.unsubscribeTask(taskId);
          }
        })
        .catch((error) => {
          this.recordEvent(taskId, {
            id: crypto.randomUUID(),
            taskId,
            type: "task.failed",
            message: error instanceof Error ? error.message : "Task polling failed.",
            createdAt: new Date().toISOString()
          });
        });
    }, Math.max(1000, intervalMs));

    this.subscriptions.set(taskId, {
      unsubscribe() {
        clearInterval(timer);
      }
    });
  }

  private recordEvent(taskId: string, event: AgentTaskEvent): void {
    const current = this.tasks.get(taskId);
    if (current) {
      this.tasks.set(taskId, {
        ...current,
        events: [...current.events, event],
        updatedAt: event.createdAt
      });
    }
    this.getMainWindow()?.webContents.send(IPC_CHANNELS.taskEvent, event);
  }

  private async refreshTaskSnapshot(taskId: string): Promise<void> {
    try {
      const detail = await this.getTask(taskId);
      if (isTerminalStatus(detail.status)) {
        await this.unsubscribeTask(taskId);
      }
    } catch (error) {
      this.recordEvent(taskId, {
        id: crypto.randomUUID(),
        taskId,
        type: "task.failed",
        message: error instanceof Error ? error.message : "Task refresh failed.",
        createdAt: new Date().toISOString()
      });
    }
  }

  private emitTaskUpdated(task: AgentTaskDetail): void {
    this.getMainWindow()?.webContents.send(IPC_CHANNELS.taskUpdated, task);
  }

  private getAgentBackend(providerId: string): AgentBackendProvider {
    const config = this.getConfig(providerId);
    if (!config.enabled) {
      throw new Error(`${config.displayName} is not enabled yet.`);
    }
    if (config.kind === "codex-gateway") {
      return new CodexGatewayProvider(config, this.vault);
    }
    throw new Error(`${config.displayName} is a placeholder provider.`);
  }

  private getConfig(providerId: string): ProviderConfig {
    const config = this.configs.agentBackends.find((item) => item.id === providerId);
    if (!config) throw new Error("Provider is not registered.");
    return config;
  }
}

function mergeLocalTask(previous: AgentTaskDetail, next: AgentTaskDetail): AgentTaskDetail {
  const eventIds = new Set(next.events.map((event) => event.id));
  const localEvents = previous.events.filter((event) => !eventIds.has(event.id));
  return {
    ...next,
    prompt: next.prompt || previous.prompt,
    mode: next.mode ?? previous.mode,
    title: next.title.startsWith("Task ") ? previous.title : next.title,
    events: [...next.events, ...localEvents].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  };
}

function isTerminalStatus(status: AgentTaskDetail["status"]): boolean {
  return status === "completed" || status === "failed" || status === "cancelled";
}
