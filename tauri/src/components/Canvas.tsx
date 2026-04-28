'use client';
import { invoke } from '@tauri-apps/api/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import BlockSidebar from '@/components/BlockSidebar';
import NodeConfigPanel from '@/components/NodeConfigPanel';
import ExecutionPanel from '@/components/ExecutionPanel';
import BlockNode from '@/components/nodes/BlockNode';
import { getDefaultOpenApp, getDefaultShell } from '@/lib/plugins';
import { useBuilderStore } from '@/store/builderStore';
import type { WorkflowKind } from '@/types/workflow';

const nodeTypes = { block: BlockNode };

interface CanvasProps {
  workflowId: string | null;
  initialNodes: Node[];
  initialEdges: Edge[];
  onChange: (nodes: Node[], edges: Edge[]) => void;
  onBeforeRun: () => Promise<string | null>;
  workflowKind: WorkflowKind;
}

function defaultNodeData(type: string) {
  switch (type) {
    case 'openApp':
      return { type, id: '', label: 'Open App', ...getDefaultOpenApp(), folderPath: '' };
    case 'runCommand':
      return { type, id: '', label: 'Run Command', command: '', workingDirectory: '', terminalType: 'background', shellType: getDefaultShell() };
    case 'openBrowser':
      return { type, id: '', label: 'Open Browser', url: 'http://localhost:3000', browser: 'system', waitMode: 'delay', delay: 0 };
    case 'macroKeyCombo':
      return { type, id: '', label: 'Key Combo', combo: 'Alt+Left' };
    case 'macroTypeText':
      return { type, id: '', label: 'Type Text', text: 'Hello from adv.flow macro' };
    case 'macroMouseClick':
      return { type, id: '', label: 'Mouse Click', button: 'left' };
    case 'macroMoveMouse':
      return { type, id: '', label: 'Move Mouse', x: 0, y: 0, coordinate: 'absolute' };
    case 'macroScroll':
      return { type, id: '', label: 'Scroll', amount: 3, axis: 'vertical' };
    case 'waitActiveApp':
      return { type, id: '', label: 'Wait Active App', targetApp: '', timeoutMs: 5000 };
    case 'delay':
      return { type, id: '', label: 'Delay', delay: 1000, waitUrl: '' };
    default:
      return { type, id: '', label: 'Block' };
  }
}

function InnerCanvas({ workflowId, initialNodes, initialEdges, onChange, onBeforeRun, workflowKind }: CanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [testStates, setTestStates] = useState<Record<string, 'idle' | 'running' | 'success' | 'error'>>({});
  const { nodeStatuses } = useBuilderStore();
  const reactFlow = useReactFlow();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    onChange(nodes, edges);
  }, [nodes, edges, onChange]);

  const selectedNode = useMemo(() => nodes.find((node) => node.id === selectedNodeId) || null, [nodes, selectedNodeId]);

  function updateNode(nodeId: string, updater: (node: Node) => Node) {
    setNodes((currentNodes) => currentNodes.map((node) => (node.id === nodeId ? updater(node) : node)));
  }

  function createNode(type: string, position: { x: number; y: number }) {
    const id = `node_${Date.now()}`;
    return {
      id,
      type: 'block',
      position,
      data: {
        ...defaultNodeData(type),
        id,
      },
    } as Node;
  }

  function addNode(type: string, position?: { x: number; y: number }) {
    const nextPosition =
      position ||
      reactFlow.screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });
    const newNode = createNode(type, nextPosition);
    setNodes((currentNodes) => [...currentNodes, newNode]);
    setSelectedNodeId(newNode.id);
  }

  async function testNode(nodeId: string) {
    const node = nodes.find((item) => item.id === nodeId);
    if (!node) return;

    setTestStates((state) => ({ ...state, [nodeId]: 'running' }));

    try {
      await invoke('test_node', { payload: node.data });
      setTestStates((state) => ({ ...state, [nodeId]: 'success' }));
    } catch {
      setTestStates((state) => ({ ...state, [nodeId]: 'error' }));
    } finally {
      window.setTimeout(() => {
        setTestStates((state) => ({ ...state, [nodeId]: 'idle' }));
      }, 3000);
    }
  }

  const decoratedNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          status: nodeStatuses[node.id] || 'idle',
          testState: testStates[node.id] || 'idle',
          onTest: () => void testNode(node.id),
        },
      })),
    [nodeStatuses, nodes, testStates]
  );

  return (
    <div className="canvas-shell">
      <BlockSidebar workflowKind={workflowKind} onAddBlock={(type) => addNode(type)} />

      <div
        ref={wrapperRef}
        className="canvas-stage"
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
        }}
        onDrop={(event) => {
          event.preventDefault();
          const type =
            event.dataTransfer.getData('application/advflow-block') ||
            event.dataTransfer.getData('text/plain');
          if (!type || !wrapperRef.current) return;
          addNode(
            type,
            reactFlow.screenToFlowPosition({
              x: event.clientX,
              y: event.clientY,
            }),
          );
        }}
      >
        <ReactFlow
          nodes={decoratedNodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={(connection: Connection) =>
            setEdges((currentEdges) => addEdge({ ...connection, id: `edge_${Date.now()}`, animated: true }, currentEdges))
          }
          onNodeClick={(_, node) => setSelectedNodeId(node.id)}
          fitView
          deleteKeyCode={['Backspace', 'Delete']}
        >
          <MiniMap />
          <Controls />
          <Background gap={20} size={1} />
        </ReactFlow>
      </div>

      <div className="builder-right-rail">
        <NodeConfigPanel
          node={selectedNode}
          onChange={(updater) => {
            if (!selectedNodeId) return;
            updateNode(selectedNodeId, updater);
          }}
        />
        <ExecutionPanel workflowId={workflowId} onBeforeRun={onBeforeRun} />
      </div>
    </div>
  );
}

export default function Canvas(props: CanvasProps) {
  return (
    <ReactFlowProvider>
      <InnerCanvas {...props} />
    </ReactFlowProvider>
  );
}
