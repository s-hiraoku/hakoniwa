import { app, BrowserWindow, ipcMain } from "electron";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { IPC_CHANNELS, type SaveCodexGatewaySettingsInput } from "../shared/ipc.js";
import type { CreateAgentTaskInput } from "../shared/providers.js";
import { ProviderRuntime } from "./providerRuntime.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);

let mainWindow: BrowserWindow | undefined;
const providerRuntime = new ProviderRuntime(() => mainWindow);

app.setName("Hakoniwa");

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1100,
    minHeight: 760,
    title: "Hakoniwa",
    acceptFirstMouse: true,
    focusable: true,
    show: false,
    backgroundColor: "#f7f6f1",
    webPreferences: {
      preload: join(__dirname, "../preload/preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  attachWindowDiagnostics(mainWindow);
  mainWindow.once("ready-to-show", () => {
    focusMainWindow();
  });

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    void mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

function focusMainWindow(): void {
  if (process.platform === "darwin") {
    app.focus({ steal: true });
  }
  mainWindow?.show();
  mainWindow?.focus();
  mainWindow?.webContents.focus();
}

function attachWindowDiagnostics(window: BrowserWindow): void {
  window.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedUrl) => {
    console.error(
      `[hakoniwa] renderer load failed: ${errorCode} ${errorDescription} ${validatedUrl}`
    );
  });

  window.webContents.on("render-process-gone", (_event, details) => {
    console.error(`[hakoniwa] renderer process gone: ${details.reason} ${details.exitCode}`);
  });

  window.webContents.on("preload-error", (_event, preloadPath, error) => {
    console.error(`[hakoniwa] preload failed: ${preloadPath}: ${error.message}`);
  });

  window.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    const label = ["verbose", "info", "warning", "error"][level] ?? "log";
    console.log(`[hakoniwa:renderer:${label}] ${sourceId}:${line} ${message}`);
  });

  window.on("focus", () => {
    window.webContents.focus();
  });
}

app.whenReady().then(() => {
  if (process.platform === "darwin") {
    app.setActivationPolicy("regular");
  }
  registerIpcHandlers();
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
      return;
    }
    focusMainWindow();
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
      providerRuntime.saveCodexGatewaySettings(saveCodexGatewaySettingsSchema.parse(input))
  );
  ipcMain.handle(IPC_CHANNELS.checkProviderHealth, (_event, providerId: string) =>
    providerRuntime.checkProviderHealth(providerIdSchema.parse(providerId))
  );
  ipcMain.handle(IPC_CHANNELS.listTargets, (_event, providerId: string) =>
    providerRuntime.listTargets(providerIdSchema.parse(providerId))
  );
  ipcMain.handle(IPC_CHANNELS.createTask, (_event, input: CreateAgentTaskInput) =>
    providerRuntime.createTask(createTaskInputSchema.parse(input))
  );
  ipcMain.handle(IPC_CHANNELS.getTask, (_event, taskId: string) =>
    providerRuntime.getTask(taskIdSchema.parse(taskId))
  );
  ipcMain.handle(IPC_CHANNELS.subscribeTask, (_event, taskId: string) =>
    providerRuntime.subscribeTask(taskIdSchema.parse(taskId))
  );
  ipcMain.handle(IPC_CHANNELS.unsubscribeTask, (_event, taskId: string) =>
    providerRuntime.unsubscribeTask(taskIdSchema.parse(taskId))
  );
}

const providerIdSchema = z.string().min(1).max(200);
const taskIdSchema = z.string().min(1).max(200);

const gatewayUrlSchema = z.string().url().refine(
  (value) => {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  },
  { message: "Gateway URL must be an http or https URL." }
);

const saveCodexGatewaySettingsSchema = z.object({
  gatewayUrl: gatewayUrlSchema,
  token: z.string().max(20_000).optional(),
  preferSse: z.boolean(),
  pollingIntervalMs: z.number().int().min(1000).max(60_000)
});

const createTaskInputSchema = z.object({
  providerId: providerIdSchema,
  repoId: z.string().min(1).max(300),
  prompt: z.string().min(1).max(20_000),
  mode: z.enum(["read-only", "workspace-write"])
}) satisfies z.ZodType<CreateAgentTaskInput>;
