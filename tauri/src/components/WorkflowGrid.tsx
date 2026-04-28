import { Blocks, Play, Star } from "lucide-react";
import { formatDate } from "@/lib/format";
import type { Workflow } from "@/types/workflow";

export default function WorkflowGrid({
  workflows,
  emptyLabel = "No workflows yet.",
  onOpen,
  onDuplicate,
  onDelete,
  onToggleFavorite,
  onExport,
  onRun,
}: {
  workflows: Workflow[];
  emptyLabel?: string;
  onOpen: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onExport: (id: string, name: string) => void;
  onRun: (id: string, name: string) => void;
}) {
  if (workflows.length === 0) {
    return <div className="empty-inline">{emptyLabel}</div>;
  }

  return (
    <div className="workflow-grid">
      {workflows.map((workflow) => {
        const id = workflow.id || workflow._id || "";
        const isMacro = Boolean(workflow.shortcut?.trim() || workflow.targetApp?.trim());
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

            <button type="button" className="workflow-card-copy" onClick={() => onOpen(id)}>
              <h3>{workflow.name}</h3>
              <p>{workflow.description || "No description yet."}</p>
            </button>

            <div className="workflow-meta-row">
              <span className="meta-badge">{workflow.nodes.length} blocks</span>
              <span className="meta-badge">{workflow.edges.length} edges</span>
              <span className="meta-badge">{formatDate(workflow.updatedAt)}</span>
              {isMacro ? <span className="meta-badge">Macro</span> : null}
            </div>

            <div className="tag-row">
              {workflow.shortcut?.trim() ? (
                <span className="tag-chip">{workflow.shortcut}</span>
              ) : null}
              {workflow.targetApp?.trim() ? (
                <span className="tag-chip">{workflow.targetApp}</span>
              ) : null}
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
              <button type="button" className="secondary-action" onClick={() => onDuplicate(id)}>
                Duplicate
              </button>
              <button type="button" className="secondary-action" onClick={() => onExport(id, workflow.name)}>
                Export
              </button>
              <button type="button" className="secondary-action danger" onClick={() => onDelete(id)}>
                Delete
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
