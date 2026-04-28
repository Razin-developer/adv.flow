import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { ArrowRight, FolderOpen, Play, Sparkles } from "lucide-react";
import AppShell from "@/components/AppShell";
import { useAppDialog } from "@/components/AppDialog";
import type { Workflow } from "@/types/workflow";

export default function DashboardPage({
  workflows,
  onOpenWorkflow,
  onRefreshWorkflows,
  onRunWorkflow,
}: {
  workflows: Workflow[];
  onOpenWorkflow: (id: string) => void;
  onRefreshWorkflows: () => Promise<void>;
  onRunWorkflow: (id: string, name: string) => Promise<void>;
}) {
  const dialog = useAppDialog();
  const [folderBusy, setFolderBusy] = useState(false);
  const [folderPrompt, setFolderPrompt] = useState("");
  const [folderDirectory, setFolderDirectory] = useState("");

  const favoriteCount = workflows.filter((workflow) => workflow.favorite).length;
  const totalBlocks = workflows.reduce((total, workflow) => total + workflow.nodes.length, 0);
  const macroCount = workflows.filter((workflow) => workflow.shortcut?.trim() || workflow.targetApp?.trim()).length;
  const recent = workflows.slice(0, 3);
  const runnable = workflows.filter((workflow) => workflow.nodes.length > 0);

  async function browseFolderDirectory() {
    const selected = await open({ directory: true, multiple: false });
    if (typeof selected === "string") setFolderDirectory(selected);
  }

  async function handleGenerateFromFolder() {
    if (!folderDirectory.trim()) {
      await dialog.error("Pick a folder", "Choose the project folder to scan.");
      return;
    }
    setFolderBusy(true);
    try {
      const workflow = await invoke<Workflow>("generate_workflow_from_folder", {
        directory: folderDirectory,
        prompt: folderPrompt.trim() ? folderPrompt : null,
      });
      await onRefreshWorkflows();
      setFolderPrompt("");
      await dialog.success("Workflow created", `${workflow.name} is ready in your library.`);
      onOpenWorkflow(workflow.id || workflow._id || "");
    } catch (error) {
      await dialog.error(
        "Could not create workflow",
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setFolderBusy(false);
    }
  }

  return (
    <AppShell
      title="Dashboard"
      subtitle="Start workflows, scan project folders, and keep an eye on your automation library."
      actions={
        <button className="primary-button" type="button" onClick={() => void handleGenerateFromFolder()}>
          <Sparkles size={14} />
          Generate
        </button>
      }
    >
      <section className="section-card ai-workflow-panel">
        <div className="section-header">
          <div>
            <h2>AI Generate from folder</h2>
            <p>Scan a project folder and create a runnable desktop workflow from its packages.</p>
          </div>
        </div>
        <div className="ai-builder-grid">
          <label className="setting-field">
            <span>Project folder</span>
            <div className="input-row">
              <input
                value={folderDirectory}
                onChange={(event) => setFolderDirectory(event.target.value)}
                placeholder="C:\\path\\to\\your\\project"
              />
              <button
                type="button"
                className="ghost-button"
                onClick={() => void browseFolderDirectory()}
                title="Browse folders"
              >
                <FolderOpen size={14} />
              </button>
            </div>
          </label>
          <label className="setting-field ai-prompt-field">
            <span>Extra hint</span>
            <textarea
              value={folderPrompt}
              rows={2}
              placeholder="backend uses pnpm, run tests before dev, etc."
              onChange={(event) => setFolderPrompt(event.target.value)}
            />
          </label>
          <button
            className="primary-button ai-create-button"
            type="button"
            onClick={() => void handleGenerateFromFolder()}
            disabled={folderBusy}
          >
            <Sparkles size={14} />
            {folderBusy ? "Scanning..." : "Generate from folder"}
          </button>
        </div>
      </section>

      <section className="hero-grid">
        <div className="hero-card hero-card-primary">
          <div className="hero-kicker">Workspace summary</div>
          <div className="hero-value">{workflows.length}</div>
          <p>Reusable workflows saved in your current library.</p>
        </div>
        <div className="metric-card">
          <span>Favorite workflows</span>
          <strong>{favoriteCount}</strong>
          <small>Pin the flows you reach for most.</small>
        </div>
        <div className="metric-card">
          <span>Macro workflows</span>
          <strong>{macroCount}</strong>
          <small>Triggered by shortcuts or active-app targeting.</small>
        </div>
        <div className="metric-card">
          <span>Total blocks</span>
          <strong>{totalBlocks}</strong>
          <small>Across your local or Mongo-backed library.</small>
        </div>
      </section>

      <section className="section-card">
        <div className="section-header">
          <div>
            <h2>Recent</h2>
            <p>Open the flows you touched most recently.</p>
          </div>
        </div>
        <div className="recent-list">
          {recent.length === 0 ? (
            <div className="empty-inline">Nothing yet. Create a workflow to start building your library.</div>
          ) : (
            recent.map((workflow) => {
              const id = workflow.id || workflow._id || "";
              return (
                <div key={id} className="recent-item">
                  <button type="button" className="recent-open-button" onClick={() => onOpenWorkflow(id)}>
                    <div>
                      <strong>{workflow.name}</strong>
                      <span>{workflow.description || "No description yet."}</span>
                    </div>
                    <ArrowRight size={14} />
                  </button>
                  <button
                    type="button"
                    className="secondary-action"
                    onClick={() => void onRunWorkflow(id, workflow.name)}
                  >
                    <Play size={13} />
                    Run
                  </button>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="section-card">
        <div className="section-header">
          <div>
            <h2>Quick run</h2>
            <p>Launch recent runnable workflows without opening the builder.</p>
          </div>
        </div>
        <div className="quick-run-grid">
          {runnable.slice(0, 6).map((workflow) => {
            const id = workflow.id || workflow._id || "";
            return (
              <button
                key={id}
                type="button"
                className="quick-run-card"
                onClick={() => void onRunWorkflow(id, workflow.name)}
              >
                <span className="workflow-card-icon">
                  <Play size={15} />
                </span>
                <span>
                  <strong>{workflow.name}</strong>
                  <small>{workflow.nodes.length} blocks</small>
                </span>
              </button>
            );
          })}
          {runnable.length === 0 ? <div className="empty-inline">No runnable workflows yet.</div> : null}
        </div>
      </section>
    </AppShell>
  );
}
