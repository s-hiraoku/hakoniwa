import { contextBridge, ipcRenderer } from "electron";
import { IPC_CHANNELS, type HakoniwaApi, type SaveCodexGatewaySettingsInput } from "../shared/ipc.js";
import type { AgentTaskDetail, AgentTaskEvent, CreateAgentTaskInput } from "../shared/providers.js";

const api: HakoniwaApi = {
  getProviderSnapshot: () => ipcRenderer.invoke(IPC_CHANNELS.getProviderSnapshot),
  saveCodexGatewaySettings: (input: SaveCodexGatewaySettingsInput) =>
    ipcRenderer.invoke(IPC_CHANNELS.saveCodexGatewaySettings, input),
  checkProviderHealth: (providerId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.checkProviderHealth, providerId),
  listTargets: (providerId: string) => ipcRenderer.invoke(IPC_CHANNELS.listTargets, providerId),
  createTask: (input: CreateAgentTaskInput) => ipcRenderer.invoke(IPC_CHANNELS.createTask, input),
  getTask: (taskId: string) => ipcRenderer.invoke(IPC_CHANNELS.getTask, taskId),
  subscribeTask: (taskId: string) => ipcRenderer.invoke(IPC_CHANNELS.subscribeTask, taskId),
  unsubscribeTask: (taskId: string) => ipcRenderer.invoke(IPC_CHANNELS.unsubscribeTask, taskId),
  onTaskEvent: (handler: (event: AgentTaskEvent) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: AgentTaskEvent) => handler(payload);
    ipcRenderer.on(IPC_CHANNELS.taskEvent, listener);
    return () => ipcRenderer.off(IPC_CHANNELS.taskEvent, listener);
  },
  onTaskUpdated: (handler: (task: AgentTaskDetail) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: AgentTaskDetail) => handler(payload);
    ipcRenderer.on(IPC_CHANNELS.taskUpdated, listener);
    return () => ipcRenderer.off(IPC_CHANNELS.taskUpdated, listener);
  }
};

contextBridge.exposeInMainWorld("hakoniwa", api);
