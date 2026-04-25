import { useMemo } from "react";
import AppShell from "@/components/AppShell";
import type { Workflow } from "@/types/workflow";
import { formatDate } from "@/lib/format";

export default function RunsPage({ workflows }: { workflows: Workflow[] }) {
  const recentRuns = useMemo(
    () =>
      workflows
        .slice()
        .sort((left, right) => (right.updatedAt || "").localeCompare(left.updatedAt || ""))
        .slice(0, 8),
    [workflows],
  );

  return (
    <AppShell
      title="Runs"
      subtitle="A lightweight execution center for the workflows you are iterating on."
    >
      <section className="hero-grid">
        <div className="metric-card">
          <span>Ready to run</span>
          <strong>{workflows.filter((workflow) => workflow.nodes.length > 0).length}</strong>
          <small>Saved flows with at least one executable block.</small>
        </div>
        <div className="metric-card">
          <span>Average blocks</span>
          <strong>
            {workflows.length
              ? Math.round(
                  workflows.reduce((total, workflow) => total + workflow.nodes.length, 0) /
                    workflows.length,
                )
              : 0}
          </strong>
          <small>Useful for keeping your flows readable.</small>
        </div>
        <div className="metric-card">
          <span>Last activity</span>
          <strong>{recentRuns[0] ? formatDate(recentRuns[0].updatedAt) : "No runs yet"}</strong>
          <small>Based on workflow changes and manual launches.</small>
        </div>
      </section>

      <section className="section-card">
        <div className="section-header">
          <div>
            <h2>Execution queue</h2>
            <p>Use the builder run panel to execute a flow. This page keeps the list understandable.</p>
          </div>
        </div>
        <div className="run-list">
          {recentRuns.length === 0 ? (
            <div className="empty-inline">No activity yet.</div>
          ) : (
            recentRuns.map((workflow, index) => (
              <div key={workflow.id || workflow._id} className="run-item">
                <div className="run-dot" data-tone={index % 3} />
                <div className="run-copy">
                  <strong>{workflow.name}</strong>
                  <span>
                    {workflow.nodes.length} blocks · last edited {formatDate(workflow.updatedAt)}
                  </span>
                </div>
                <span className="meta-badge">
                  {workflow.favorite ? "Pinned" : "Ready"}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </AppShell>
  );
}
