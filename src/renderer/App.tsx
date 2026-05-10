import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import type {
  AgentTaskDetail,
  AgentTaskEvent,
  AgentTaskMode,
  ProviderSnapshot,
  ProviderTarget
} from "../shared/providers.js";
import "./styles/app.css";

const CODEX_GATEWAY_PROVIDER_ID = "agent-backend.codex-gateway.default";
const MASKED_TOKEN_VALUE = "••••••••";

function App() {
  return window.hakoniwa ? <HakoniwaApp /> : <BridgeUnavailable />;
}

function HakoniwaApp() {
  const hakoniwa = window.hakoniwa!;
  const [snapshot, setSnapshot] = useState<ProviderSnapshot>();
  const [targets, setTargets] = useState<ProviderTarget[]>([]);
  const [targetError, setTargetError] = useState<string>();
  const [tasks, setTasks] = useState<AgentTaskDetail[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>();
  const [notice, setNotice] = useState<string>("Configure Local Agent Gateway to start supervising tasks.");
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? tasks[0];

  useEffect(() => {
    const focusEditableTarget = (event: PointerEvent) => {
      const target = event.target;
      if (!isEditableElement(target)) return;
      window.requestAnimationFrame(() => {
        target.focus();
      });
    };
    document.addEventListener("pointerdown", focusEditableTarget, true);
    return () => {
      document.removeEventListener("pointerdown", focusEditableTarget, true);
    };
  }, []);

  useEffect(() => {
    void hakoniwa.getProviderSnapshot().then(setSnapshot).catch((error: unknown) => {
      setNotice(uiErrorMessage(error, "Provider snapshot failed."));
    });

    const offTaskEvent = hakoniwa.onTaskEvent((event) => {
      setTasks((current) =>
        current.map((task) =>
          task.id === event.taskId
            ? { ...task, events: [...task.events, event], updatedAt: event.createdAt }
            : task
        )
      );
    });
    const offTaskUpdated = hakoniwa.onTaskUpdated((updatedTask) => {
      setTasks((current) =>
        current.map((task) =>
          task.id === updatedTask.id
            ? mergeTaskForRenderer(task, updatedTask)
            : task
        )
      );
    });
    return () => {
      offTaskEvent();
      offTaskUpdated();
    };
  }, [hakoniwa]);

  async function refreshTargets() {
    try {
      const repos = await hakoniwa.listTargets(CODEX_GATEWAY_PROVIDER_ID);
      setTargets(repos);
      setTargetError(undefined);
      setNotice(repos.length ? "Repository targets loaded from Local Agent Gateway." : "No repositories returned.");
    } catch (error) {
      const message = uiErrorMessage(error, "Repository list failed.");
      setTargets([]);
      setTargetError(message);
      setNotice(message);
    }
  }

  async function addTask(task: AgentTaskDetail) {
    setTasks((current) => [task, ...current.filter((item) => item.id !== task.id)]);
    setSelectedTaskId(task.id);
    await hakoniwa.subscribeTask(task.id);
  }

  return (
    <div className="app-shell">
      <Sidebar
        snapshot={snapshot}
        targets={targets}
        targetError={targetError}
        tasks={tasks}
        selectedTaskId={selectedTask?.id}
        onSelectTask={setSelectedTaskId}
        onRefreshTargets={refreshTargets}
      />
      <main className="workspace">
        <TopBar notice={notice} />
        <section className="content-grid">
          <TaskWorkspace task={selectedTask} />
          <RightRail
            snapshot={snapshot}
            setSnapshot={setSnapshot}
            targets={targets}
            targetError={targetError}
            onRefreshTargets={refreshTargets}
            onTaskCreated={addTask}
            setNotice={setNotice}
          />
        </section>
        <TerminalDock task={selectedTask} />
      </main>
    </div>
  );
}

function isEditableElement(target: EventTarget | null): target is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  return target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement;
}

function BridgeUnavailable() {
  return (
    <div className="bridge-screen">
      <section>
        <div className="brand-mark">H</div>
        <h1>Hakoniwa requires the Electron app shell</h1>
        <p>
          This renderer is open without the preload bridge, which usually means it is running in a
          browser or web preview. Gateway settings, credentials, and health checks only work inside
          the Hakoniwa Electron window.
        </p>
        <div className="status-box">
          <strong>How to open it</strong>
          <span>Run npm run dev and use the separate window titled Hakoniwa.</span>
          <span>Do not use http://127.0.0.1:5173 for Gateway checks.</span>
        </div>
      </section>
    </div>
  );
}

function Sidebar(props: {
  snapshot?: ProviderSnapshot;
  targets: ProviderTarget[];
  targetError?: string;
  tasks: AgentTaskDetail[];
  selectedTaskId?: string;
  onSelectTask(taskId: string): void;
  onRefreshTargets(): void;
}) {
  const codexHealth = props.snapshot?.health[CODEX_GATEWAY_PROVIDER_ID];
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">H</div>
        <div>
          <h1>Hakoniwa</h1>
          <p>AI development workbench</p>
        </div>
      </div>

      <section className="panel-section">
        <div className="section-heading">
          <span>Projects</span>
          <button onClick={props.onRefreshTargets}>Refresh</button>
        </div>
        <div className="stack">
          {props.targetError ? (
            <div className="error-box">
              <strong>Repo load failed</strong>
              <span>{props.targetError}</span>
            </div>
          ) : props.targets.length === 0 ? (
            <p className="muted">No Gateway repositories loaded.</p>
          ) : (
            props.targets.map((target) => (
              <div className="repo-row" key={target.id}>
                <strong>{target.displayName}</strong>
                <span>{target.defaultMode ?? "workspace-write"}</span>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="panel-section">
        <div className="section-heading">
          <span>Providers</span>
          <StatusPill status={codexHealth?.status ?? "not-configured"} />
        </div>
        <div className="provider-mini">
          <strong>Local Agent Gateway</strong>
          <span>{codexHealth?.message ?? "URL and token can be configured in settings."}</span>
        </div>
      </section>

      <section className="panel-section task-list">
        <div className="section-heading">
          <span>Tasks</span>
          <span>{props.tasks.length}</span>
        </div>
        {props.tasks.length === 0 ? (
          <p className="muted">Created tasks will appear here with repo, mode, status, and file signals.</p>
        ) : (
          props.tasks.map((task) => (
            <button
              className={task.id === props.selectedTaskId ? "task-card active" : "task-card"}
              key={task.id}
              onClick={() => props.onSelectTask(task.id)}
            >
              <strong>{task.title}</strong>
              <span>{task.repoId}</span>
              <small>
                {task.status} · {task.mode} · {task.changedFiles.length} files
              </small>
            </button>
          ))
        )}
      </section>
    </aside>
  );
}

function TopBar({ notice }: { notice: string }) {
  return (
    <header className="topbar">
      <div>
        <strong>Task-first workspace</strong>
        <span>{notice}</span>
      </div>
      <div className="topbar-actions">
        <span>Diff-first</span>
        <span>Worktree-ready</span>
        <span>Provider-agnostic</span>
      </div>
    </header>
  );
}

function TaskWorkspace({ task }: { task?: AgentTaskDetail }) {
  if (!task) {
    return (
      <section className="task-workspace empty-state">
        <h2>No task selected</h2>
        <p>Create a Local Agent Gateway task to see status, timeline, diff readiness, and review surfaces.</p>
      </section>
    );
  }

  const agentResponse = agentResponseText(task);

  return (
    <section className="task-workspace">
      <div className="task-header">
        <div>
          <h2>{task.title}</h2>
          <p>{task.prompt}</p>
        </div>
        <StatusPill status={task.status} />
      </div>

      <div className="detail-grid">
        <InfoTile label="Provider" value="Local Agent Gateway" />
        <InfoTile label="Repository" value={task.repoId} />
        <InfoTile label="Mode" value={task.mode} />
        <InfoTile label="Changed files" value={String(task.changedFiles.length)} />
      </div>

      <section className="agent-response">
        <div>
          <h3>Agent Response</h3>
          <p className={agentResponse ? "response-text" : "muted"}>
            {agentResponse ?? "No final response has been reported by the Gateway yet."}
          </p>
        </div>
      </section>

      <section className="review-band">
        <div>
          <h3>Diff Review</h3>
          <p>Changed files and hunks will be reviewed here before approval.</p>
        </div>
        <div className="file-list">
          {task.changedFiles.length === 0 ? (
            <span>No changed files reported yet.</span>
          ) : (
            task.changedFiles.map((file) => (
              <span key={`${file.status}:${file.path}`}>
                {file.status} · {file.path}
              </span>
            ))
          )}
        </div>
      </section>

      <section className="timeline">
        <h3>Timeline</h3>
        {task.error ? <div className="error-box">{task.error}</div> : null}
        {task.events.length === 0 ? (
          <p className="muted">Gateway events or polling updates will appear here.</p>
        ) : (
          task.events.map((event) => <TimelineEvent event={event} key={event.id} />)
        )}
      </section>
    </section>
  );
}

function RightRail(props: {
  snapshot?: ProviderSnapshot;
  setSnapshot(snapshot: ProviderSnapshot): void;
  targets: ProviderTarget[];
  targetError?: string;
  onRefreshTargets(): Promise<void>;
  onTaskCreated(task: AgentTaskDetail): Promise<void>;
  setNotice(message: string): void;
}) {
  return (
    <aside className="right-rail">
      <TaskComposer
        targets={props.targets}
        onTaskCreated={props.onTaskCreated}
        setNotice={props.setNotice}
      />
      <SettingsPanel {...props} />
      <PlaceholderPanel
        title="Agent Panel"
        body="Provider messages, approvals, steering, and backend capability state will live here."
      />
      <PlaceholderPanel
        title="Browser Preview"
        body="Local preview, console errors, network failures, and review comments are planned for a later phase."
      />
    </aside>
  );
}

function SettingsPanel(props: {
  snapshot?: ProviderSnapshot;
  setSnapshot(snapshot: ProviderSnapshot): void;
  targets: ProviderTarget[];
  targetError?: string;
  onRefreshTargets(): Promise<void>;
  setNotice(message: string): void;
}) {
  const codex = props.snapshot?.agentBackends.find((provider) => provider.id === CODEX_GATEWAY_PROVIDER_ID);
  const [gatewayUrl, setGatewayUrl] = useState("");
  const [token, setToken] = useState("");
  const [preferSse, setPreferSse] = useState(true);
  const [pollingIntervalMs, setPollingIntervalMs] = useState(3000);
  const [healthChecking, setHealthChecking] = useState(false);
  const [localHealth, setLocalHealth] = useState<ProviderSnapshot["health"][string]>();

  useEffect(() => {
    if (codex) {
      setGatewayUrl(String(codex.settings.gatewayUrl ?? ""));
      setPreferSse(Boolean(codex.settings.preferSse ?? true));
      setPollingIntervalMs(Number(codex.settings.pollingIntervalMs ?? 3000));
    }
  }, [codex]);

  const credentialState = codex?.credentialRefs.token
    ? props.snapshot?.credentialStates[codex.credentialRefs.token.id]
    : "missing";
  const health = localHealth ?? props.snapshot?.health[CODEX_GATEWAY_PROVIDER_ID];
  const savedGatewayUrl = String(codex?.settings.gatewayUrl ?? "");
  const gatewayUrlChanged = Boolean(savedGatewayUrl && savedGatewayUrl !== gatewayUrl);
  const tokenIsMasked = token === MASKED_TOKEN_VALUE;
  const tokenForSave = tokenIsMasked ? undefined : token;
  const hasTokenInput = Boolean(tokenForSave?.trim());
  const requiresTokenReentry = gatewayUrlChanged && credentialState === "configured" && !hasTokenInput;
  const tokenStatusMessage = hasTokenInput
    ? "New token will be saved in the local encrypted credential vault."
    : credentialState === "configured"
      ? "Token is saved locally. The value is hidden."
      : "No token is saved.";

  useEffect(() => {
    if (credentialState === "configured" && !token) {
      setToken(MASKED_TOKEN_VALUE);
    }
    if (credentialState !== "configured" && tokenIsMasked) {
      setToken("");
    }
  }, [credentialState, token, tokenIsMasked]);

  async function saveSettings() {
    if (!window.hakoniwa) {
      props.setNotice("Hakoniwa preload bridge is unavailable.");
      return undefined;
    }
    const next = await window.hakoniwa.saveCodexGatewaySettings({
      gatewayUrl,
      token: tokenForSave,
      preferSse,
      pollingIntervalMs
    });
    setToken(next.credentialStates[codex?.credentialRefs.token?.id ?? ""] === "configured" ? MASKED_TOKEN_VALUE : "");
    props.setSnapshot(next);
    props.setNotice(
      requiresTokenReentry
        ? "Gateway URL changed; re-enter the token before connecting."
        : "Local Agent Gateway settings saved."
    );
    return next;
  }

  async function save() {
    await saveSettings();
  }

  async function checkHealth() {
    const startedAt = new Date().toISOString();
    if (!window.hakoniwa) {
      const unavailableHealth = {
        status: "error" as const,
        message: "Hakoniwa preload bridge is unavailable.",
        checkedAt: startedAt
      };
      setLocalHealth(unavailableHealth);
      props.setNotice(unavailableHealth.message);
      return;
    }
    setHealthChecking(true);
    setLocalHealth({
      status: "configured",
      message: "Health check started. Waiting for Local Agent Gateway response...",
      checkedAt: startedAt
    });
    props.setNotice("Checking Local Agent Gateway health...");
    try {
      const health = await window.hakoniwa.checkProviderHealth(CODEX_GATEWAY_PROVIDER_ID);
      const nextSnapshot = await window.hakoniwa.getProviderSnapshot();
      setLocalHealth(health);
      props.setSnapshot({
        ...nextSnapshot,
        health: {
          ...nextSnapshot.health,
          [CODEX_GATEWAY_PROVIDER_ID]: health
        }
      });
      props.setNotice(health.message);
      if (health.status === "connected") await props.onRefreshTargets();
    } catch (error) {
      const message = uiErrorMessage(error, "Health check failed.");
      setLocalHealth({
        status: "error",
        message,
        checkedAt: new Date().toISOString()
      });
      props.setNotice(message);
    }
    setHealthChecking(false);
  }

  return (
    <section className="rail-panel">
      <h3>Settings</h3>
      <div className="form-stack">
        <label>
          Gateway URL
          <input
            value={gatewayUrl}
            onChange={(event) => setGatewayUrl(event.target.value)}
            placeholder="http://127.0.0.1:8787"
          />
        </label>
        {requiresTokenReentry ? (
          <div className="warning-box">Gateway URL changed; please re-enter the token.</div>
        ) : null}
        <label>
          Gateway token
          <input
            value={token}
            type="password"
            onFocus={() => {
              if (tokenIsMasked) setToken("");
            }}
            onChange={(event) => setToken(event.target.value)}
            placeholder={credentialState === "configured" ? "Configured" : "Missing"}
          />
        </label>
        <div className="help-box">{tokenStatusMessage}</div>
        <div className="setting-row">
          <label className="check-row">
            <input
              type="checkbox"
              checked={preferSse}
              onChange={(event) => setPreferSse(event.target.checked)}
            />
            Prefer SSE events
          </label>
          <input
            className="short-input"
            type="number"
            min={1000}
            value={pollingIntervalMs}
            onChange={(event) => setPollingIntervalMs(Number(event.target.value))}
          />
        </div>
        <div className="button-row">
          <button onClick={save}>Save</button>
          <button onClick={checkHealth} disabled={healthChecking}>
            {healthChecking ? "Checking..." : "Health check"}
          </button>
        </div>
        <div className={health?.status === "error" ? "error-box" : "status-box"}>
          <strong>Gateway health</strong>
          <span>
            {healthChecking
              ? "checking: waiting for Local Agent Gateway..."
              : health
                ? `${health.status}: ${health.message}`
                : "Not checked yet."}
          </span>
          {health?.status === "connected" ? (
            <span>Repo targets loaded: {props.targets.length}.</span>
          ) : null}
          {props.targetError ? <span>Repo access: {props.targetError}</span> : null}
        </div>
      </div>

      <ProviderGroups snapshot={props.snapshot} />
    </section>
  );
}

function ProviderGroups({ snapshot }: { snapshot?: ProviderSnapshot }) {
  return (
    <div className="provider-groups">
      <strong>Agent Backends</strong>
      {(snapshot?.agentBackends ?? []).map((provider) => (
        <span key={provider.id}>
          {provider.displayName} {provider.enabled ? "" : "coming soon"}
        </span>
      ))}
      <strong>Model Providers</strong>
      {(snapshot?.modelProviders ?? []).map((provider) => (
        <span key={provider.id}>{provider.displayName} placeholder</span>
      ))}
      <strong>Defaults</strong>
      <span>Agent backend: Local Agent Gateway</span>
      <span>Model: managed by provider for Local Agent Gateway tasks</span>
    </div>
  );
}

function TaskComposer(props: {
  targets: ProviderTarget[];
  onTaskCreated(task: AgentTaskDetail): Promise<void>;
  setNotice(message: string): void;
}) {
  const [repoId, setRepoId] = useState("");
  const [mode, setMode] = useState<AgentTaskMode>("workspace-write");
  const [prompt, setPrompt] = useState("");
  const selectedTarget = useMemo(
    () => props.targets.find((target) => target.id === repoId),
    [props.targets, repoId]
  );

  useEffect(() => {
    if (!repoId && props.targets[0]) {
      setRepoId(props.targets[0].id);
      setMode(props.targets[0].defaultMode ?? "workspace-write");
    }
  }, [props.targets, repoId]);

  async function submit() {
    if (!window.hakoniwa) {
      props.setNotice("Hakoniwa preload bridge is unavailable.");
      return;
    }
    if (!repoId || !prompt.trim()) {
      props.setNotice("Select a repository and enter a task prompt.");
      return;
    }
    try {
      const task = await window.hakoniwa.createTask({
        providerId: CODEX_GATEWAY_PROVIDER_ID,
        repoId,
        mode,
        prompt: prompt.trim()
      });
      setPrompt("");
      await props.onTaskCreated(task);
      props.setNotice("Task created and monitoring started.");
    } catch (error) {
      props.setNotice(uiErrorMessage(error, "Task creation failed."));
    }
  }

  return (
    <section className="rail-panel">
      <h3>Task Composer</h3>
      <div className="form-stack">
        <label>
          Repository
          <select value={repoId} onChange={(event) => setRepoId(event.target.value)}>
            <option value="">Select Gateway repo</option>
            {props.targets.map((target) => (
              <option value={target.id} key={target.id}>
                {target.displayName}
              </option>
            ))}
          </select>
        </label>
        <label>
          Mode
          <select value={mode} onChange={(event) => setMode(event.target.value as AgentTaskMode)}>
            {(selectedTarget?.allowedModes ?? ["read-only", "workspace-write"]).map((allowedMode) => (
              <option value={allowedMode} key={allowedMode}>
                {allowedMode}
              </option>
            ))}
          </select>
        </label>
        <label>
          Prompt
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Describe the development task to run in the selected repo."
          />
        </label>
        <div className="managed-model">Model: managed by Local Agent Gateway</div>
        <button onClick={submit}>Create task</button>
      </div>
    </section>
  );
}

function TerminalDock({ task }: { task?: AgentTaskDetail }) {
  return (
    <footer className="terminal-dock">
      <div>
        <strong>Terminal</strong>
        <span>{task ? `Scoped view planned for ${task.repoId}` : "Project/worktree scoped terminal placeholder"}</span>
      </div>
      <div className="terminal-lines">
        <span>Human terminal and agent command runner will remain separated.</span>
        <span>Renderer does not spawn shells in D1.</span>
      </div>
    </footer>
  );
}

function PlaceholderPanel({ title, body }: { title: string; body: string }) {
  return (
    <section className="rail-panel placeholder">
      <h3>{title}</h3>
      <p>{body}</p>
    </section>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-tile">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function TimelineEvent({ event }: { event: AgentTaskEvent }) {
  return (
    <div className="timeline-event">
      <span>{event.createdAt}</span>
      <strong>{event.type}</strong>
      <p>{event.message}</p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  return <span className={`status-pill status-${status}`}>{status}</span>;
}

function mergeTaskForRenderer(previous: AgentTaskDetail, next: AgentTaskDetail): AgentTaskDetail {
  const eventIds = new Set(next.events.map((event) => event.id));
  const localEvents = previous.events.filter((event) => !eventIds.has(event.id));
  return {
    ...next,
    events: [...next.events, ...localEvents].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  };
}

function agentResponseText(task: AgentTaskDetail): string | undefined {
  const completedMessage = [...task.events]
    .reverse()
    .find((event) => event.type === "agent.message.completed" && event.message.trim());
  if (completedMessage) return completedMessage.message;
  return task.summary?.trim() || undefined;
}

function uiErrorMessage(error: unknown, fallback: string): string {
  const raw = error instanceof Error ? error.message : fallback;
  return raw
    .replace(/^Error invoking remote method '[^']+':\s*/, "")
    .replace(/^CodexGatewayError:\s*/, "");
}

createRoot(document.getElementById("root")!).render(<App />);
