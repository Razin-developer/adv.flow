import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { ArrowRight, Blocks, Download, FolderOpen, Play, Sparkles, Star, Upload } from "lucide-react";
import AppShell from "@/components/AppShell";
import { useAppDialog } from "@/components/AppDialog";
// import AppPicker from "@/components/AppPicker";
import type { InstalledApp, Workflow } from "@/types/workflow";
import { formatDate } from "@/lib/format";

function WorkflowGrid({
  workflows,
  onOpen,
  onDuplicate,
  onDelete,
  onToggleFavorite,
  onExport,
  onRun,
}: {
  workflows: Workflow[];
  onOpen: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onExport: (id: string, name: string) => void;
  onRun: (id: string, name: string) => void;
}) {
  return (
    <div className="workflow-grid">
      {workflows.map((workflow) => {
        const id = workflow.id || workflow._id || "";
        return (
          <article key={id} className="workflow-card">
            <button
              type="button"
              className="workflow-open-hit"
              onClick={() => onOpen(id)}
              aria-label={`Open ${workflow.name}`}
            />
            <div className="workflow-card-top">
              <div className="workflow-card-icon">
                <Blocks size={16} />
              </div>
              <button
                type="button"
                className={`icon-button ${workflow.favorite ? "is-favorite" : ""}`}
                onClick={() => onToggleFavorite(id)}
                title={workflow.favorite ? "Remove favorite" : "Favorite"}
              >
                <Star size={14} />
              </button>
            </div>

            <button
              type="button"
              className="workflow-card-copy"
              onClick={() => onOpen(id)}
            >
              <h3>{workflow.name}</h3>
              <p>{workflow.description || "No description yet."}</p>
            </button>

            <div className="workflow-meta-row">
              <span className="meta-badge">{workflow.nodes.length} blocks</span>
              <span className="meta-badge">{workflow.edges.length} edges</span>
              <span className="meta-badge">{formatDate(workflow.updatedAt)}</span>
            </div>

            <div className="tag-row">
              {workflow.tags.slice(0, 4).map((tag) => (
                <span key={tag} className="tag-chip">
                  {tag}
                </span>
              ))}
            </div>

            <div className="workflow-card-actions">
              <button
                type="button"
                className="secondary-action"
                onClick={() => onRun(id, workflow.name)}
              >
                <Play size={13} />
                Run
              </button>
              <button
                type="button"
                className="secondary-action"
                onClick={() => onDuplicate(id)}
              >
                Duplicate
              </button>
              <button
                type="button"
                className="secondary-action"
                onClick={() => onExport(id, workflow.name)}
              >
                Export
              </button>
              <button
                type="button"
                className="secondary-action danger"
                onClick={() => onDelete(id)}
              >
                Delete
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default function WorkflowsPage({
  workflows,
  loading,
  onCreateWorkflow,
  onOpenWorkflow,
  onDuplicateWorkflow,
  onDeleteWorkflow,
  onToggleFavorite,
  onImportComplete,
  onRunWorkflow,
}: {
  workflows: Workflow[];
  loading: boolean;
  onCreateWorkflow: () => void;
  onOpenWorkflow: (id: string) => void;
  onDuplicateWorkflow: (id: string) => void;
  onDeleteWorkflow: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onImportComplete: () => Promise<void>;
  onRunWorkflow: (id: string, name: string) => Promise<void>;
}) {
  const dialog = useAppDialog();
  // const [aiPrompt, setAiPrompt] = useState("");
  // const [aiDirectory, setAiDirectory] = useState("");
  const [_, setInstalledApps] = useState<InstalledApp[]>([]);
  const [__, setSelectedAppId] = useState("explorer");
  // const [aiBusy, setAiBusy] = useState(false);
  const [folderBusy, setFolderBusy] = useState(false);
  const [folderPrompt, setFolderPrompt] = useState("");
  const [folderDirectory, setFolderDirectory] = useState("");
  const favoriteCount = workflows.filter((workflow) => workflow.favorite).length;
  const totalBlocks = workflows.reduce(
    (total, workflow) => total + workflow.nodes.length,
    0,
  );
  const recent = workflows.slice(0, 3);

  useEffect(() => {
    void invoke<InstalledApp[]>("list_installed_apps")
      .then((apps) => {
        setInstalledApps(apps);
        if (apps.length) setSelectedAppId(apps[0].id);
      })
      .catch(() => setInstalledApps([]));
  }, []);

  // async function browseDirectory() {
  //   const selected = await open({ directory: true, multiple: false });
  //   if (typeof selected === "string") setAiDirectory(selected);
  // }

  async function handleImportLibrary() {
    const selected = await open({
      multiple: false,
      filters: [{ name: "Workflow JSON", extensions: ["json"] }],
    });
    if (!selected || typeof selected !== "string") return;
    const count = await invoke<number>("import_workflows", { path: selected });
    await onImportComplete();
    await dialog.success("Import complete", `Imported ${count} workflow${count === 1 ? "" : "s"}.`);
  }

  async function handleImportWorkflow() {
    const selected = await open({
      multiple: false,
      filters: [{ name: "Workflow JSON", extensions: ["json"] }],
    });
    if (!selected || typeof selected !== "string") return;
    try {
      const workflow = await invoke<Workflow>("import_workflow", { path: selected });
      await onImportComplete();
      await dialog.success("Workflow imported", `${workflow.name} was added to your library.`);
      onOpenWorkflow(workflow.id || workflow._id || "");
    } catch (error) {
      await dialog.error(
        "Could not import workflow",
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  async function handleExportAll() {
    const selected = await save({
      defaultPath: "advflow-workflows.json",
      filters: [{ name: "Workflow JSON", extensions: ["json"] }],
    });
    if (!selected) return;
    const count = await invoke<number>("export_all_workflows", { path: selected });
    await dialog.success("Export complete", `Exported ${count} workflow${count === 1 ? "" : "s"}.`);
  }

  async function handleExport(id: string, name: string) {
    const selected = await save({
      defaultPath: `${name.replace(/[<>:"/\\|?*]+/g, "-")}.json`,
      filters: [{ name: "Workflow JSON", extensions: ["json"] }],
    });
    if (!selected) return;
    await invoke("export_workflow", { id, path: selected });
    await dialog.success("Workflow exported", `${name} was saved as JSON.`);
  }

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
      await onImportComplete();
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

  // async function handleGenerateWorkflow() {
  //   setAiBusy(true);
  //   try {
  //     const workflow = await invoke<Workflow>("generate_workflow_from_prompt", {
  //       prompt: aiPrompt,
  //       directory: aiDirectory,
  //       appId: selectedAppId,
  //     });
  //     await onImportComplete();
  //     setAiPrompt("");
  //     await dialog.success("Workflow created", `${workflow.name} is ready in your library.`);
  //     onOpenWorkflow(workflow.id || workflow._id || "");
  //   } catch (error) {
  //     await dialog.error("Could not create workflow", error instanceof Error ? error.message : String(error));
  //   } finally {
  //     setAiBusy(false);
  //   }
  // }

  return (
    <AppShell
      title="Workflows"
      subtitle="Create clear automation flows for local apps, browsers, shells, and AI tools."
      actions={
        <>
          <button
            className="secondary-action"
            type="button"
            onClick={() => void handleImportWorkflow()}
            title="Import a single workflow JSON file"
          >
            <Upload size={14} />
            Import workflow
          </button>
          <button
            className="secondary-action"
            type="button"
            onClick={() => void handleImportLibrary()}
            title="Import a multi-workflow library JSON file"
          >
            <Upload size={14} />
            Import library
          </button>
          <button className="secondary-action" type="button" onClick={() => void handleExportAll()}>
            <Download size={14} />
            Export all
          </button>
          <button className="primary-button" type="button" onClick={onCreateWorkflow}>
            <Sparkles size={14} />
            New workflow
          </button>
        </>
      }
    >
      {/* <section className="section-card ai-workflow-panel">
        <div className="section-header">
          <div>
            <h2>AI workflow builder</h2>
            <p>Describe the automation, choose a project folder, and Advflow will draft the graph.</p>
          </div>
        </div>
        <div className="ai-builder-grid">
          <label className="setting-field ai-prompt-field">
            <span>Prompt</span>
            <textarea
              value={aiPrompt}
              rows={3}
              placeholder="Open this project in my editor, install dependencies, start dev server, and open browser."
              onChange={(event) => setAiPrompt(event.target.value)}
            />
          </label>
          <label className="setting-field">
            <span>Project directory</span>
            <div className="input-row">
              <input value={aiDirectory} onChange={(event) => setAiDirectory(event.target.value)} />
              <button type="button" className="ghost-button" onClick={() => void browseDirectory()} title="Browse folders">
                <FolderOpen size={14} />
              </button>
            </div>
          </label>
          <label className="setting-field">
            <span>Open with</span>
            <AppPicker
              apps={installedApps}
              value={selectedAppId}
              onChange={(app) => setSelectedAppId(app.id)}
            />
          </label>
          <button className="primary-button ai-create-button" type="button" onClick={() => void handleGenerateWorkflow()}>
            <Sparkles size={14} />
            {aiBusy ? "Creating..." : "Create workflow"}
          </button>
        </div>
      </section> */}

      <section className="section-card ai-workflow-panel">
        <div className="section-header">
          <div>
            <h2>AI integrated Generate from folder</h2>
            <p>
              Point at a project folder. Advflow scans every package.json (frontend, backend, monorepo) and
              builds a workflow that opens your editor, runs each dev server, then opens your browser when ready.
              Uses your preferred editor and browser from Settings.
            </p>
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
            <span>Extra hint (optional)</span>
            <textarea
              value={folderPrompt}
              rows={2}
              placeholder="e.g. backend uses pnpm, run tests before dev, etc."
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
          <p>Reusable desktop workflows saved in your current library.</p>
        </div>
        <div className="metric-card">
          <span>Favorite workflows</span>
          <strong>{favoriteCount}</strong>
          <small>Pin the flows you reach for most.</small>
        </div>
        <div className="metric-card">
          <span>Total configured blocks</span>
          <strong>{totalBlocks}</strong>
          <small>Across your current local or Mongo-backed library.</small>
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
            <div className="empty-inline">
              Nothing yet. Create a workflow to start building your library.
            </div>
          ) : (
            recent.map((workflow) => {
              const id = workflow.id || workflow._id || "";
              return (
                <div
                  key={id}
                  className="recent-item"
                >
                  <button
                    type="button"
                    className="recent-open-button"
                    onClick={() => onOpenWorkflow(id)}
                  >
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
            <p>Launch your most recent runnable workflows without opening the builder.</p>
          </div>
        </div>
        <div className="quick-run-grid">
          {workflows.filter((workflow) => workflow.nodes.length > 0).slice(0, 6).map((workflow) => {
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
          {workflows.filter((workflow) => workflow.nodes.length > 0).length === 0 ? (
            <div className="empty-inline">No runnable workflows yet.</div>
          ) : null}
        </div>
      </section>

      <section className="section-card">
        <div className="section-header">
          <div>
            <h2>Library</h2>
            <p>Everything in your current workflow collection.</p>
          </div>
        </div>
        {loading ? (
          <div className="empty-inline">Loading workflows...</div>
        ) : workflows.length === 0 ? (
          <div className="empty-state-panel">
            <div className="empty-state-copy">
              <h3>No workflows yet</h3>
              <p>
                Start with a blank flow, or use one of the templates from the next page.
              </p>
            </div>
            <button className="primary-button" type="button" onClick={onCreateWorkflow}>
              <Sparkles size={14} />
              Create workflow
            </button>
          </div>
        ) : (
          <WorkflowGrid
            workflows={workflows}
            onOpen={onOpenWorkflow}
            onDuplicate={onDuplicateWorkflow}
            onDelete={onDeleteWorkflow}
            onToggleFavorite={onToggleFavorite}
            onExport={(id, name) => void handleExport(id, name)}
            onRun={(id, name) => void onRunWorkflow(id, name)}
          />
        )}
      </section>
    </AppShell>
  );
}
