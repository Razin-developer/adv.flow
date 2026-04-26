import { AppWindow, KeyRound, Plus, Star, Trash2 } from "lucide-react";
import AppShell from "@/components/AppShell";
import type { Workflow } from "@/types/workflow";

export default function InAppWorkflowsPage({
  workflows,
  loading,
  onCreateWorkflow,
  onOpenWorkflow,
  onDuplicateWorkflow,
  onDeleteWorkflow,
  onToggleFavorite,
}: {
  workflows: Workflow[];
  loading: boolean;
  onCreateWorkflow: (payload?: Partial<Workflow>) => void;
  onOpenWorkflow: (id: string) => void;
  onDuplicateWorkflow: (id: string) => void;
  onDeleteWorkflow: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}) {
  const inAppWorkflows = workflows.filter((workflow) => workflow.kind === "inApp");

  return (
    <AppShell
      title="In-app workflows"
      subtitle="Attach workflows to a base desktop app and launch them from an entry hotkey while that app is focused."
      actions={
        <button
          className="primary-button"
          type="button"
          onClick={() =>
            onCreateWorkflow({
              kind: "inApp",
              name: "New in-app workflow",
              description: "Runs inside a focused editor app from a hotkey.",
              baseAppId: "vscode",
              entryHotkey: "ctrl+shift+i",
              tags: ["in-app"],
            })
          }
        >
          <Plus size={14} />
          New in-app workflow
        </button>
      }
    >
      <section className="section-card">
        <div className="section-header">
          <div>
            <h2>Hotkey-triggered flows</h2>
            <p>These workflows are hidden from the standard desktop runner and only trigger in their target app context.</p>
          </div>
        </div>

        {loading ? (
          <div className="empty-inline">Loading in-app workflows...</div>
        ) : inAppWorkflows.length === 0 ? (
          <div className="empty-state-panel">
            <div className="empty-state-copy">
              <h3>No in-app workflows yet</h3>
              <p>Start one for VS Code, Cursor, or Antigravity and bind it to a hotkey.</p>
            </div>
            <button
              className="primary-button"
              type="button"
              onClick={() =>
                onCreateWorkflow({
                  kind: "inApp",
                  name: "New in-app workflow",
                  description: "Runs inside a focused editor app from a hotkey.",
                  baseAppId: "vscode",
                  entryHotkey: "ctrl+shift+i",
                  tags: ["in-app"],
                })
              }
            >
              <Plus size={14} />
              Create in-app workflow
            </button>
          </div>
        ) : (
          <div className="workflow-grid">
            {inAppWorkflows.map((workflow) => {
              const id = workflow.id || workflow._id || "";
              return (
                <article key={id} className="workflow-card">
                  <button
                    type="button"
                    className="workflow-open-hit"
                    onClick={() => onOpenWorkflow(id)}
                    aria-label={`Open ${workflow.name}`}
                  />

                  <div className="workflow-card-top">
                    <div className="workflow-card-icon">
                      <AppWindow size={16} />
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

                  <button type="button" className="workflow-card-copy" onClick={() => onOpenWorkflow(id)}>
                    <h3>{workflow.name}</h3>
                    <p>{workflow.description || "No description yet."}</p>
                  </button>

                  <div className="workflow-meta-row">
                    <span className="meta-badge">{workflow.baseAppId || "No base app"}</span>
                    <span className="meta-badge">
                      <KeyRound size={12} />
                      {workflow.entryHotkey || "No hotkey"}
                    </span>
                  </div>

                  <div className="workflow-card-actions">
                    <button type="button" className="secondary-action" onClick={() => onOpenWorkflow(id)}>
                      Open
                    </button>
                    <button type="button" className="secondary-action" onClick={() => onDuplicateWorkflow(id)}>
                      Duplicate
                    </button>
                    <button type="button" className="secondary-action danger" onClick={() => onDeleteWorkflow(id)}>
                      <Trash2 size={13} />
                      Delete
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </AppShell>
  );
}
