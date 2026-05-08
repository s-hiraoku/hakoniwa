import { app, BrowserWindow, ipcMain } from "electron";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { IPC_CHANNELS, type SaveCodexGatewaySettingsInput } from "../shared/ipc.js";
import type { CreateAgentTaskInput } from "../shared/providers.js";
import { ProviderRuntime } from "./providerRuntime.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);

let mainWindow: BrowserWindow | undefined;
const providerRuntime = new ProviderRuntime(() => mainWindow);

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1100,
    minHeight: 760,
    title: "Hakoniwa",
    backgroundColor: "#f7f6f1",
    webPreferences: {
      preload: join(__dirname, "../preload/preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    void mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

function registerIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.getProviderSnapshot, () => providerRuntime.snapshot());
  ipcMain.handle(
    IPC_CHANNELS.saveCodexGatewaySettings,
    (_event, input: SaveCodexGatewaySettingsInput) =>
      providerRuntime.saveCodexGatewaySettings({
        gatewayUrl: String(input.gatewayUrl ?? ""),
        token: input.token,
        preferSse: Boolean(input.preferSse),
        pollingIntervalMs: Number(input.pollingIntervalMs)
      })
  );
  ipcMain.handle(IPC_CHANNELS.checkProviderHealth, (_event, providerId: string) =>
    providerRuntime.checkProviderHealth(providerId)
  );
  ipcMain.handle(IPC_CHANNELS.listTargets, (_event, providerId: string) =>
    providerRuntime.listTargets(providerId)
  );
  ipcMain.handle(IPC_CHANNELS.createTask, (_event, input: CreateAgentTaskInput) =>
    providerRuntime.createTask(input)
  );
  ipcMain.handle(IPC_CHANNELS.getTask, (_event, taskId: string) => providerRuntime.getTask(taskId));
  ipcMain.handle(IPC_CHANNELS.subscribeTask, (_event, taskId: string) =>
    providerRuntime.subscribeTask(taskId)
  );
  ipcMain.handle(IPC_CHANNELS.unsubscribeTask, (_event, taskId: string) =>
    providerRuntime.unsubscribeTask(taskId)
  );
}
