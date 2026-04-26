'use client';

import type { WorkflowKind } from "@/types/workflow";

const DESKTOP_BLOCKS = [
  { type: 'openApp', name: 'Open App', description: 'Launch a configured development app.' },
  { type: 'runCommand', name: 'Run Command', description: 'Run a terminal command in the background or a new window.' },
  { type: 'openBrowser', name: 'Open Browser', description: 'Open a URL in the selected browser.' },
  { type: 'delay', name: 'Delay', description: 'Pause or wait for a URL to respond.' },
] as const;

const IN_APP_BLOCKS = [
  ...DESKTOP_BLOCKS,
  { type: 'editorTerminalCommand', name: 'Editor Terminal', description: 'Open the integrated terminal and send a command in VS Code, Cursor, or Antigravity.' },
  { type: 'moveMouse', name: 'Move Cursor', description: 'Move the mouse to an absolute screen position.' },
  { type: 'mouseClick', name: 'Mouse Click', description: 'Click the left, right, or middle mouse button.' },
  { type: 'mouseDoubleClick', name: 'Double Click', description: 'Double click a mouse button.' },
  { type: 'mouseScroll', name: 'Mouse Scroll', description: 'Scroll vertically by the configured amount.' },
  { type: 'typeText', name: 'Type Text', description: 'Type raw text into the focused app.' },
  { type: 'pressKey', name: 'Press Key', description: 'Press one key in the focused app.' },
  { type: 'hotkey', name: 'Hotkey', description: 'Send a modifier key combination to the focused app.' },
] as const;

export default function BlockSidebar({
  onAddBlock,
  workflowKind,
}: {
  onAddBlock?: (type: string) => void;
  workflowKind: WorkflowKind;
}) {
  const blocks = workflowKind === "inApp" ? IN_APP_BLOCKS : DESKTOP_BLOCKS;

  return (
    <aside className="block-sidebar">
      <div className="sidebar-header">
        <h2>Blocks</h2>
        <p>Drag blocks onto the canvas.</p>
      </div>

      <div className="block-list">
        {blocks.map((block) => (
          <button
            key={block.type}
            type="button"
            className="block-card"
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData('application/advflow-block', block.type);
              event.dataTransfer.setData('text/plain', block.type);
              event.dataTransfer.effectAllowed = 'move';
            }}
            onClick={() => onAddBlock?.(block.type)}
          >
            <strong>{block.name}</strong>
            <span>{block.description}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
