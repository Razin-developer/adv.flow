import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { Download, Sparkles, Upload } from "lucide-react";
import AppShell from "@/components/AppShell";
import { useAppDialog } from "@/components/AppDialog";
import WorkflowGrid from "@/components/WorkflowGrid";
import type { Workflow } from "@/types/workflow";

export default function WorkflowsPage({
  workflows,
  loading,
  title = "Workflows",
  subtitle = "Browse, run, duplicate, import, and export every workflow in your library.",
  emptyLabel = "No workflows yet.",
  createLabel = "New workflow",
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
  title?: string;
  subtitle?: string;
  emptyLabel?: string;
  createLabel?: string;
  onCreateWorkflow: () => void;
  onOpenWorkflow: (id: string) => void;
  onDuplicateWorkflow: (id: string) => void;
  onDeleteWorkflow: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onImportComplete: () => Promise<void>;
  onRunWorkflow: (id: string, name: string) => Promise<void>;
}) {
  const dialog = useAppDialog();

  async function handleImportLibrary() {
    const selected = await open({
      multiple: false,
      filters: [{ name: "Workflow JSON", extensions: ["json"] }],
    });
    if (!selected || typeof selected !== "string") return;
    const count = await invoke<number>("import_workflows", { path: selected });
    await invoke("refresh_macro_shortcuts");
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
      await invoke("refresh_macro_shortcuts");
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

  return (
    <AppShell
      title={title}
      subtitle={subtitle}
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
            {createLabel}
          </button>
        </>
      }
    >
      <section className="section-card">
        <div className="section-header">
          <div>
            <h2>Library</h2>
            <p>All workflows in the current collection.</p>
          </div>
        </div>
        {loading ? (
          <div className="empty-inline">Loading workflows...</div>
        ) : workflows.length === 0 ? (
          <div className="empty-state-panel">
            <div className="empty-state-copy">
              <h3>{emptyLabel}</h3>
              <p>Start with a blank flow or import an existing workflow JSON file.</p>
            </div>
            <button className="primary-button" type="button" onClick={onCreateWorkflow}>
              <Sparkles size={14} />
              {createLabel}
            </button>
          </div>
        ) : (
          <WorkflowGrid
            workflows={workflows}
            emptyLabel={emptyLabel}
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
