import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { DialogProvider, useAppDialog } from "@/components/AppDialog";
import BuilderWrapper from "@/BuilderWrapper";
import IntegrationsPage from "@/pages/IntegrationsPage";
import InAppWorkflowsPage from "@/pages/InAppWorkflowsPage";
import RunsPage from "@/pages/RunsPage";
import SettingsPage from "@/pages/SettingsPage";
import TemplatesPage from "@/pages/TemplatesPage";
import WorkflowsPage from "@/pages/WorkflowPage";
import type { AppSettings } from "@/types/settings";
import type { Workflow } from "@/types/workflow";
import "./App.css";

const DEFAULT_SETTINGS: AppSettings = {
  storageMode: "local",
  mongodbUri: "",
  mongodbDatabase: "advflow",
  mongodbCollection: "workflows",
  autoSaveDelayMs: 900,
  commandTimeoutSeconds: 120,
  maxParallelNodes: 4,
  compactMode: true,
  useSystemAppearance: true,
  reduceMotion: false,
  confirmDestructiveActions: true,
  launchOnStartup: false,
  reopenLastWorkspace: true,
  developerMode: false,
  telemetryEnabled: false,
  syncOnOpen: false,
  preferredBrowser: "chrome",
  preferredEditor: "vscode",
  aiProvider: "gemini",
  geminiApiKey: "",
  geminiModel: "gemini-2.5-flash",
  localModelEndpoint: "http://127.0.0.1:1234/v1",
  localModelApiKey: "",
  localModelName: "",
};

function AppRouter() {
  const navigate = useNavigate();
  const dialog = useAppDialog();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loadingWorkflows, setLoadingWorkflows] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(true);

  async function loadWorkflows() {
    setLoadingWorkflows(true);
    try {
      const data = await invoke<Workflow[]>("get_workflows");
      setWorkflows(data);
    } finally {
      setLoadingWorkflows(false);
    }
  }

  async function loadSettings() {
    setLoadingSettings(true);
    try {
      const data = await invoke<AppSettings>("get_settings");
      setSettings(data);
      document.documentElement.dataset.compact = String(data.compactMode);
      document.documentElement.dataset.reduceMotion = String(data.reduceMotion);
      document.documentElement.dataset.systemAppearance = String(data.useSystemAppearance);
      if (data.syncOnOpen && data.storageMode === "mongodb") {
        await invoke("sync_mongodb_workflows_to_local");
      }
    } finally {
      setLoadingSettings(false);
    }
  }

  useEffect(() => {
    void loadWorkflows();
    void loadSettings();
    void invoke("ensure_in_app_listener").catch(() => undefined);
  }, []);

  async function handleCreateWorkflow(payload?: Partial<Workflow>) {
    const created = await invoke<Workflow>("create_workflow", {
      payload: {
        name: payload?.name || "New Workflow",
        description: payload?.description || "",
        kind: payload?.kind || "desktop",
        baseAppId: payload?.baseAppId || "",
        entryHotkey: payload?.entryHotkey || "",
        tags: payload?.tags || [],
        favorite: payload?.favorite || false,
        nodes: payload?.nodes || [],
        edges: payload?.edges || [],
      },
    });
    await loadWorkflows();
    navigate(`/builder/${created.id || created._id}`);
  }

  async function handleDuplicateWorkflow(id: string) {
    await invoke("duplicate_workflow", { id });
    await loadWorkflows();
    await dialog.success("Workflow duplicated", "A copy was added to your library.");
  }

  async function handleDeleteWorkflow(id: string) {
    if (settings.confirmDestructiveActions) {
      const confirmed = await dialog.confirm({
        title: "Delete workflow?",
        message: "This removes the workflow from the current library.",
        confirmLabel: "Delete",
      });
      if (!confirmed) return;
    }

    await invoke("delete_workflow", { id });
    await loadWorkflows();
    await dialog.info("Workflow deleted", "The workflow was removed.");
  }

  async function handleToggleFavorite(id: string) {
    await invoke("toggle_favorite", { id });
    await loadWorkflows();
  }

  async function handleRunWorkflow(id: string, name: string) {
    try {
      await invoke("execute_workflow", { id });
      await dialog.success("Workflow started", `${name} was sent to the runner.`);
    } catch (error) {
      await dialog.error("Run failed", error instanceof Error ? error.message : String(error));
    }
  }

  async function handleSaveSettings(next: AppSettings) {
    const saved = await invoke<AppSettings>("save_settings", { settings: next });
    setSettings(saved);
    document.documentElement.dataset.compact = String(saved.compactMode);
    document.documentElement.dataset.reduceMotion = String(saved.reduceMotion);
    document.documentElement.dataset.systemAppearance = String(saved.useSystemAppearance);
    await loadWorkflows();
  }

  if (loadingSettings) {
    return <div className="loading-screen">Loading desktop workspace...</div>;
  }

  return (
    <div style={{ overflow: "hidden", width: "100%", height: "100%" }}>
      <Routes>
        <Route path="/" element={<Navigate to="/workflows" replace />} />
        <Route
          path="/workflows"
          element={
            <WorkflowsPage
              workflows={workflows}
              loading={loadingWorkflows}
              onCreateWorkflow={() => void handleCreateWorkflow()}
              onOpenWorkflow={(id: string) => navigate(`/builder/${id}`)}
              onDuplicateWorkflow={(id: string) => void handleDuplicateWorkflow(id)}
              onDeleteWorkflow={(id: string) => void handleDeleteWorkflow(id)}
              onToggleFavorite={(id: string) => void handleToggleFavorite(id)}
              onImportComplete={loadWorkflows}
              onRunWorkflow={handleRunWorkflow}
            />
          }
        />
        <Route
          path="/in-app"
          element={
            <InAppWorkflowsPage
              workflows={workflows}
              loading={loadingWorkflows}
              onCreateWorkflow={(payload) => void handleCreateWorkflow(payload)}
              onOpenWorkflow={(id: string) => navigate(`/builder/${id}?from=in-app`)}
              onDuplicateWorkflow={(id: string) => void handleDuplicateWorkflow(id)}
              onDeleteWorkflow={(id: string) => void handleDeleteWorkflow(id)}
              onToggleFavorite={(id: string) => void handleToggleFavorite(id)}
            />
          }
        />
        <Route
          path="/templates"
          element={
            <TemplatesPage
              onCreateFromTemplate={(payload) => void handleCreateWorkflow(payload)}
            />
          }
        />
        <Route path="/runs" element={<RunsPage workflows={workflows} />} />
        <Route
          path="/integrations"
          element={<IntegrationsPage settings={settings} />}
        />
        <Route
          path="/settings"
          element={
            <SettingsPage
              settings={settings}
              onSaveSettings={handleSaveSettings}
              onTestMongo={async () => invoke<string>("test_mongodb_connection")}
              onSyncLocalToMongo={async () => {
                const count = await invoke<number>("sync_local_workflows_to_mongodb");
                return `Synced ${count} local workflows to MongoDB.`;
              }}
              onSyncMongoToLocal={async () => {
                const count = await invoke<number>("sync_mongodb_workflows_to_local");
                await loadWorkflows();
                return `Pulled ${count} MongoDB workflows into local storage.`;
              }}
            />
          }
        />
        <Route path="/builder/:id" element={<BuilderWrapper />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <DialogProvider>
      <AppRouter />
    </DialogProvider>
  );
}
