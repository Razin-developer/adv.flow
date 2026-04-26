'use client';

import { Handle, Position } from 'reactflow';
import { BROWSERS } from '@/lib/plugins';

const LABELS: Record<string, string> = {
  openApp: 'Open App',
  runCommand: 'Run Command',
  openBrowser: 'Open Browser',
  delay: 'Delay',
  editorTerminalCommand: 'Editor Terminal',
  moveMouse: 'Move Cursor',
  mouseClick: 'Mouse Click',
  mouseDoubleClick: 'Double Click',
  mouseScroll: 'Mouse Scroll',
  typeText: 'Type Text',
  pressKey: 'Press Key',
  hotkey: 'Hotkey',
};

interface BlockNodeData {
  type: string;
  label: string;
  appName?: string;
  browser?: string;
  status?: string;
  testState?: 'idle' | 'running' | 'success' | 'error';
  onTest?: () => void;
}

export default function BlockNode({ data, selected }: { data: BlockNodeData; selected?: boolean }) {
  const browser = BROWSERS.find((item) => item.id === data.browser);
  const badge = data.appName?.slice(0, 2).toUpperCase() || browser?.icon || LABELS[data.type]?.slice(0, 2).toUpperCase() || 'BL';

  return (
    <div className={`block-node status-${data.status || 'idle'} ${selected ? 'is-selected' : ''}`}>
      <Handle type="target" position={Position.Top} />
      <button
        type="button"
        className={`node-test-button is-${data.testState || 'idle'}`}
        onClick={(event) => {
          event.stopPropagation();
          data.onTest?.();
        }}
      >
        Test
      </button>

      <div className="node-badge">{badge}</div>
      <div className="node-copy">
        <strong>{data.label || LABELS[data.type] || 'Block'}</strong>
        <span>{LABELS[data.type] || data.type}</span>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
