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

function App() {
  const [snapshot, setSnapshot] = useState<ProviderSnapshot>();
  const [targets, setTargets] = useState<ProviderTarget[]>([]);
  const [tasks, setTasks] = useState<AgentTaskDetail[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>();
  const [notice, setNotice] = useState<string>("Configure Codex Gateway to start supervising tasks.");
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? tasks[0];

  useEffect(() => {
    if (!window.hakoniwa) {
      setNotice("Hakoniwa preload bridge is unavailable. Restart the app after rebuilding.");
      return;
    }

    void window.hakoniwa.getProviderSnapshot().then(setSnapshot).catch((error: unknown) => {
      setNotice(error instanceof Error ? error.message : "Provider snapshot failed.");
    });

    const offTaskEvent = window.hakoniwa.onTaskEvent((event) => {
      setTasks((current) =>
        current.map((task) =>
          task.id === event.taskId
            ? { ...task, events: [...task.events, event], updatedAt: event.createdAt }
            : task
        )
      );
    });
    const offTaskUpdated = window.hakoniwa.onTaskUpdated((updatedTask) => {
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
  }, []);

  async function refreshTargets() {
    if (!window.hakoniwa) {
      setNotice("Hakoniwa preload bridge is unavailable.");
      return;
    }
    try {
      const repos = await window.hakoniwa.listTargets(CODEX_GATEWAY_PROVIDER_ID);
      setTargets(repos);
      setNotice(repos.length ? "Repository targets loaded from Codex Gateway." : "No repositories returned.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Repository list failed.");
    }
  }

  async function addTask(task: AgentTaskDetail) {
    if (!window.hakoniwa) {
      setNotice("Hakoniwa preload bridge is unavailable.");
      return;
    }
    setTasks((current) => [task, ...current.filter((item) => item.id !== task.id)]);
    setSelectedTaskId(task.id);
    await window.hakoniwa.subscribeTask(task.id);
  }

  return (
    <div className="app-shell">
      <Sidebar
        snapshot={snapshot}
        targets={targets}
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

function Sidebar(props: {
  snapshot?: ProviderSnapshot;
  targets: ProviderTarget[];
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
          {props.targets.length === 0 ? (
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
          <strong>Codex Gateway</strong>
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
        <p>Create a Codex Gateway task to see status, timeline, diff readiness, and review surfaces.</p>
      </section>
    );
  }

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
        <InfoTile label="Provider" value="Codex Gateway" />
        <InfoTile label="Repository" value={task.repoId} />
        <InfoTile label="Mode" value={task.mode} />
        <InfoTile label="Changed files" value={String(task.changedFiles.length)} />
      </div>

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
  onRefreshTargets(): Promise<void>;
  onTaskCreated(task: AgentTaskDetail): Promise<void>;
  setNotice(message: string): void;
}) {
  return (
    <aside className="right-rail">
      <SettingsPanel {...props} />
      <TaskComposer
        targets={props.targets}
        onTaskCreated={props.onTaskCreated}
        setNotice={props.setNotice}
      />
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
  onRefreshTargets(): Promise<void>;
  setNotice(message: string): void;
}) {
  const codex = props.snapshot?.agentBackends.find((provider) => provider.id === CODEX_GATEWAY_PROVIDER_ID);
  const [gatewayUrl, setGatewayUrl] = useState("");
  const [token, setToken] = useState("");
  const [preferSse, setPreferSse] = useState(true);
  const [pollingIntervalMs, setPollingIntervalMs] = useState(3000);

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
  const savedGatewayUrl = String(codex?.settings.gatewayUrl ?? "");
  const gatewayUrlChanged = Boolean(savedGatewayUrl && savedGatewayUrl !== gatewayUrl);
  const requiresTokenReentry = gatewayUrlChanged && credentialState === "configured" && !token.trim();

  async function save() {
    if (!window.hakoniwa) {
      props.setNotice("Hakoniwa preload bridge is unavailable.");
      return;
    }
    const next = await window.hakoniwa.saveCodexGatewaySettings({
      gatewayUrl,
      token,
      preferSse,
      pollingIntervalMs
    });
    setToken("");
    props.setSnapshot(next);
    props.setNotice(
      requiresTokenReentry
        ? "Gateway URL changed; re-enter the token before connecting."
        : "Codex Gateway settings saved for this session."
    );
  }

  async function checkHealth() {
    if (!window.hakoniwa) {
      props.setNotice("Hakoniwa preload bridge is unavailable.");
      return;
    }
    try {
      const health = await window.hakoniwa.checkProviderHealth(CODEX_GATEWAY_PROVIDER_ID);
      props.setSnapshot(await window.hakoniwa.getProviderSnapshot());
      props.setNotice(health.message);
      if (health.status === "connected") await props.onRefreshTargets();
    } catch (error) {
      props.setNotice(error instanceof Error ? error.message : "Health check failed.");
    }
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
            onChange={(event) => setToken(event.target.value)}
            placeholder={credentialState === "configured" ? "Configured for this session" : "Missing"}
          />
        </label>
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
          <button onClick={checkHealth}>Health check</button>
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
      <span>Agent backend: Codex Gateway</span>
      <span>Model: managed by provider for Codex Gateway tasks</span>
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
      props.setNotice(error instanceof Error ? error.message : "Task creation failed.");
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
        <div className="managed-model">Model: managed by Codex Gateway</div>
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

createRoot(document.getElementById("root")!).render(<App />);
