'use client';

import { useEffect, useRef, useState } from 'react';
import type { Edge, Node } from 'reactflow';
import AppPicker from '@/components/AppPicker';
import type { InstalledApp, Workflow, WorkflowKind } from '@/types/workflow';
import type { AppSettings } from '@/types/settings';
import Canvas from '@/components/Canvas';
import { invoke } from "@tauri-apps/api/core";
import { ArrowLeft, Save, Star } from 'lucide-react';
import { useAppDialog } from '@/components/AppDialog';

const EMPTY_WORKFLOW: Workflow = {
  name: 'Untitled workflow',
  description: '',
  kind: 'desktop',
  baseAppId: '',
  entryHotkey: '',
  tags: [],
  favorite: false,
  nodes: [],
  edges: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

type BuilderSnapshot = {
  workflowId: string | null;
  name: string;
  description: string;
  kind: WorkflowKind;
  baseAppId: string;
  entryHotkey: string;
  tags: string[];
  favorite: boolean;
  nodes: Node[];
  edges: Edge[];
};

interface BuilderShellProps {
  mode: 'create' | 'edit';
  workflowId?: string;
  onBack: () => void;
}

function toReactFlowNode(node: Workflow['nodes'][number]): Node {
  const data = node.data || ({ id: node.id, type: node.type, label: node.type } as Workflow['nodes'][number]['data']);
  return {
    id: node.id || data.id,
    type: 'block',
    position: node.position || { x: 80, y: 80 },
    data: {
      ...data,
      id: data.id || node.id,
      type: data.type || node.type,
      label: data.label || data.type || node.type || 'Block',
    },
  };
}

function toReactFlowEdge(edge: Workflow['edges'][number]): Edge {
  return {
    id: edge.id || `edge_${edge.source}_${edge.target}`,
    source: edge.source,
    target: edge.target,
    animated: edge.animated ?? true,
  };
}

function fromReactFlowNode(node: Node): Workflow['nodes'][number] {
  return {
    id: node.id,
    type: node.data.type,
    position: node.position,
    data: node.data,
  };
}

function fromReactFlowEdge(edge: Edge): Workflow['edges'][number] {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    animated: edge.animated ?? true,
  };
}

export default function BuilderShell({ mode, workflowId, onBack }: BuilderShellProps) {
  const dialog = useAppDialog();
  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [canvasKey, setCanvasKey] = useState(0);
  const [name, setName] = useState(EMPTY_WORKFLOW.name);
  const [description, setDescription] = useState(EMPTY_WORKFLOW.description);
  const [tagsInput, setTagsInput] = useState('');
  const [favorite, setFavorite] = useState(false);
  const [kind, setKind] = useState<WorkflowKind>('desktop');
  const [baseAppId, setBaseAppId] = useState('');
  const [entryHotkey, setEntryHotkey] = useState('');
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(workflowId ?? null);
  const [autoSaveDelay, setAutoSaveDelay] = useState(900);
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);

  const hydratedRef = useRef(false);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const savePromiseRef = useRef<Promise<string | null> | null>(null);
  const lastSaveFailedRef = useRef(false);
  const latestRef = useRef<BuilderSnapshot>({
    workflowId: workflowId ?? null,
      name: EMPTY_WORKFLOW.name,
      description: EMPTY_WORKFLOW.description,
      kind: 'desktop',
      baseAppId: '',
      entryHotkey: '',
      tags: [],
    favorite: false,
    nodes: [],
    edges: [],
  });

  useEffect(() => {
    latestRef.current = {
      workflowId: currentId,
      name,
      description,
      kind,
      baseAppId,
      entryHotkey,
      tags: tagsInput.split(',').map((tag) => tag.trim()).filter(Boolean),
      favorite,
      nodes,
      edges,
    };
  }, [currentId, name, description, kind, baseAppId, entryHotkey, tagsInput, favorite, nodes, edges]);

  useEffect(() => {
    let mounted = true;
    invoke<AppSettings>('get_settings')
      .then((settings) => {
        if (mounted) setAutoSaveDelay(settings.autoSaveDelayMs);
      })
      .catch(() => {});
    void invoke<InstalledApp[]>('list_installed_apps')
      .then((apps) => {
        if (mounted) setInstalledApps(apps);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (mode !== 'edit' || !workflowId) {
      hydratedRef.current = true;
      return;
    }

    let active = true;
    setLoading(true);

    invoke<Workflow>('get_workflow', { id: workflowId })
      .then((workflow: Workflow) => {
        if (!active) return;
        const nextNodes = (workflow.nodes || []).map(toReactFlowNode);
        const nextEdges = (workflow.edges || []).map(toReactFlowEdge);
        const nextId = workflow.id || workflow._id || workflowId;

        setName(workflow.name || EMPTY_WORKFLOW.name);
        setDescription(workflow.description || '');
        setKind((workflow.kind as WorkflowKind) || 'desktop');
        setBaseAppId(workflow.baseAppId || '');
        setEntryHotkey(workflow.entryHotkey || '');
        setTagsInput((workflow.tags || []).join(', '));
        setFavorite(Boolean(workflow.favorite));
        setNodes(nextNodes);
        setEdges(nextEdges);
        setCurrentId(nextId);
        latestRef.current = {
          workflowId: nextId,
          name: workflow.name || EMPTY_WORKFLOW.name,
          description: workflow.description || '',
          kind: (workflow.kind as WorkflowKind) || 'desktop',
          baseAppId: workflow.baseAppId || '',
          entryHotkey: workflow.entryHotkey || '',
          tags: workflow.tags || [],
          favorite: Boolean(workflow.favorite),
          nodes: nextNodes,
          edges: nextEdges,
        };
        setCanvasKey((key) => key + 1);
        hydratedRef.current = true;
      })
      .catch((error: Error) => {
        if (!active) return;
        setSaveError(error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [mode, workflowId]);

  async function persist(force = false): Promise<string | null> {
    if (!hydratedRef.current && !force) return latestRef.current.workflowId;
    if (savePromiseRef.current) return savePromiseRef.current;

    const snapshot = latestRef.current;
    const payload: Workflow = {
      name: snapshot.name.trim() || EMPTY_WORKFLOW.name,
      description: snapshot.description,
      kind: snapshot.kind,
      baseAppId: snapshot.baseAppId,
      entryHotkey: snapshot.entryHotkey,
      tags: snapshot.tags,
      favorite: snapshot.favorite,
      nodes: snapshot.nodes.map(fromReactFlowNode),
      edges: snapshot.edges.map(fromReactFlowEdge),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setSaving(true);
    setSaveError(null);
    lastSaveFailedRef.current = false;

    let promise: Promise<Workflow>;
    if (snapshot.workflowId) {
      promise = invoke<Workflow>('update_workflow', { id: snapshot.workflowId, payload });
    } else {
      promise = invoke<Workflow>('create_workflow', { payload });
    }

    savePromiseRef.current = promise
      .then((saved: Workflow) => {
        const nextId = saved.id || saved._id || null;
        setCurrentId(nextId);
        latestRef.current.workflowId = nextId;
        return nextId;
      })
      .catch((error: Error) => {
        lastSaveFailedRef.current = true;
        setSaveError(error.message);
        if (force) {
          void dialog.error('Save failed', error.message);
        }
        return snapshot.workflowId;
      })
      .finally(() => {
        setSaving(false);
        savePromiseRef.current = null;
      });

    return savePromiseRef.current;
  }

  useEffect(() => {
    if (!hydratedRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(() => {
      void persist();
    }, autoSaveDelay);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [autoSaveDelay, name, description, kind, baseAppId, entryHotkey, tagsInput, favorite, nodes, edges]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void persist(true);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  if (loading) return <div className="builder-loading">Loading workflow...</div>;

  return (
    <div className="builder-shell">
      <header className="builder-toolbar">
        <button onClick={onBack} className="builder-nav-button" type="button" title="Back">
          <ArrowLeft size={15} />
          Back
        </button>
        <div className="builder-meta">
          <input
            className="builder-title"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Workflow name"
          />
          <input
            className="builder-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Describe what this workflow does"
          />
          {kind === 'inApp' ? (
            <div className="builder-in-app-meta">
              <label className="field" style={{ marginTop: 0 }}>
                <span>Base app</span>
                <AppPicker
                  apps={installedApps.filter((app) => ['vscode', 'cursor', 'antigravity'].includes(app.id))}
                  value={baseAppId}
                  onChange={(app) => setBaseAppId(app.id)}
                />
              </label>
              <label className="field" style={{ marginTop: 0 }}>
                <span>Entry hotkey</span>
                <input
                  value={entryHotkey}
                  onChange={(event) => setEntryHotkey(event.target.value)}
                  placeholder="ctrl+shift+i"
                />
              </label>
            </div>
          ) : null}
        </div>

        <div className="builder-actions">
          <input
            className="builder-tags"
            value={tagsInput}
            onChange={(event) => setTagsInput(event.target.value)}
            placeholder="Tags, comma separated"
          />
          <select
            className="builder-chip"
            value={kind}
            onChange={(event) => setKind(event.target.value as WorkflowKind)}
            title="Workflow type"
          >
            <option value="desktop">Desktop</option>
            <option value="inApp">In-app</option>
          </select>
          <button
            type="button"
            className={`favorite-toggle ${favorite ? 'is-active' : ''}`}
            onClick={() => setFavorite((value) => !value)}
            title={favorite ? 'Remove favorite' : 'Favorite workflow'}
          >
            <Star size={14} />
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => {
              void persist(true).then(() => {
                if (!lastSaveFailedRef.current) {
                  void dialog.success('Workflow saved', 'Your changes are synced.');
                }
              });
            }}
          >
            <Save size={14} />
            Save
          </button>
        </div>
      </header>

      <div className="builder-statusbar">
        <span>{currentId ? `Workflow ID: ${currentId}` : 'Unsaved workflow'}</span>
        <span>{kind === 'inApp' ? `In-app trigger: ${baseAppId || 'pick app'} / ${entryHotkey || 'pick hotkey'}` : 'Desktop workflow'}</span>
        <span>{saving ? 'Saving...' : 'All changes synced'}</span>
        {saveError ? <span className="status-error">{saveError}</span> : null}
      </div>

      <Canvas
        key={canvasKey}
        workflowId={currentId}
        initialNodes={nodes}
        initialEdges={edges}
        onChange={(nextNodes, nextEdges) => {
          setNodes(nextNodes);
          setEdges(nextEdges);
        }}
        onBeforeRun={() => persist(true)}
        workflowKind={kind}
      />
    </div>
  );
}
