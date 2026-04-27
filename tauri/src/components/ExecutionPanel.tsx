'use client';

import { useBuilderStore } from '@/store/builderStore';

interface ExecutionPanelProps {
  workflowId: string | null;
  onBeforeRun: () => Promise<string | null>;
}

export default function ExecutionPanel({ workflowId, onBeforeRun }: ExecutionPanelProps) {
  const { running, done, failed, stopped, logs, execute, stop, clearLogs } = useBuilderStore();

  async function onRun() {
    const ensuredId = workflowId || (await onBeforeRun());
    if (!ensuredId) return;
    clearLogs();
    await execute(ensuredId);
  }

  return (
    <section className="execution-panel">
      <div className="panel-header">
        <div>
          <h3>Execution</h3>
          <p>
            {running
              ? 'Workflow is running.'
              : done
                ? (failed ? 'Workflow failed.' : stopped ? 'Workflow stopped.' : 'Workflow finished.')
                : 'Run the current graph.'}
          </p>
        </div>
        <div className="execution-actions">
          <button type="button" className="ghost-button" onClick={clearLogs}>
            Clear
          </button>
          {running ? (
            <button type="button" className="danger-button" onClick={stop}>
              Stop
            </button>
          ) : (
            <button type="button" className="primary-button" onClick={() => void onRun()}>
              Run
            </button>
          )}
        </div>
      </div>

      <div className="log-list">
        {!logs.length ? <div className="log-empty">No execution logs yet.</div> : null}
        {logs.map((log, index) => (
          <div key={`${log.timestamp}-${index}`} className={`log-item status-${log.status}`}>
            <div className="log-title">
              <strong>{log.nodeName}</strong>
              <span>{log.status}</span>
            </div>
            {log.message ? <p>{log.message}</p> : null}
            <small>{new Date(log.timestamp).toLocaleTimeString()}</small>
          </div>
        ))}
      </div>
    </section>
  );
}
