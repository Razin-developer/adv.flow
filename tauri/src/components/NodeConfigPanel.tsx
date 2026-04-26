'use client';
import { useEffect, useState } from 'react';
import type { Node } from 'reactflow';
import { invoke } from '@tauri-apps/api/core';
import { BROWSERS } from '@/lib/plugins';
import { open } from '@tauri-apps/plugin-dialog';
import { Sparkles } from 'lucide-react';
import { useAppDialog } from '@/components/AppDialog';
import AppPicker from '@/components/AppPicker';
import type { InstalledApp } from '@/types/workflow';

interface NodeConfigPanelProps {
  node: Node | null;
  onChange: (updater: (node: Node) => Node) => void;
}

export default function NodeConfigPanel({ node, onChange }: NodeConfigPanelProps) {
  const dialog = useAppDialog();
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);

  useEffect(() => {
    void invoke<InstalledApp[]>('list_installed_apps')
      .then(setInstalledApps)
      .catch(() => setInstalledApps([]));
  }, []);

  if (!node) {
    return (
      <section className="config-panel">
        <div className="panel-header">
          <h3>Node settings</h3>
          <p>Select a block to configure it.</p>
        </div>
      </section>
    );
  }

  const updateField = (key: string, value: string | number | boolean | string[]) => {
    onChange((currentNode) => ({
      ...currentNode,
      data: {
        ...currentNode.data,
        [key]: value,
      },
    }));
  };

  const handleAppChange = (appId: string) => {
    const app = installedApps.find((item) => item.id === appId);
    if (!app) return;
    onChange((currentNode) => ({
      ...currentNode,
      data: {
        ...currentNode.data,
        appId: app.id,
        appName: app.name,
        command: app.command,
        args: app.args,
        appPath: app.path || '',
        source: app.source,
        label: currentNode.data.label || `Open ${app.name}`,
      },
    }));
  };

  const handleBrowse = async (key: string) => {
    const selected = await open({
      directory: true,
      multiple: false,
    });
    if (selected) {
      updateField(key, selected as string);
    }
  };

  const handleAiEdit = async () => {
    if (!node) return;
    const prompt = await dialog.prompt({
      title: 'Edit this node with AI',
      message: 'Describe the change. Examples: build, test, start dev server, or label:Open editor.',
      placeholder: 'Make this run npm test in the selected directory',
    });
    if (!prompt) return;
    const selected = await open({ directory: true, multiple: false });
    const nextNode = await invoke<Node>('suggest_node_update', {
      prompt,
      node,
      directory: selected || '',
    });
    onChange(() => nextNode);
    await dialog.success('Node updated', 'The node settings were adjusted from your prompt.');
  };

  return (
    <>
      <section className="config-panel">
        <div className="panel-header">
          <div>
            <h3>Node settings</h3>
            <p>{node.data.type}</p>
          </div>
          <button type="button" className="icon-button" onClick={() => void handleAiEdit()} title="AI edit node">
            <Sparkles size={14} />
          </button>
        </div>

        <label className="field">
          <span>Label</span>
          <input value={node.data.label || ''} onChange={(event) => updateField('label', event.target.value)} />
        </label>

        {node.data.type === 'openApp' ? (
          <>
            <label className="field">
              <span>App</span>
              <AppPicker
                apps={installedApps}
                value={node.data.appId || ''}
                onChange={(app) => handleAppChange(app.id)}
              />
            </label>
            <label className="field">
              <span>Launch command</span>
              <input value={node.data.command || ''} onChange={(event) => updateField('command', event.target.value)} />
            </label>
            <label className="field">
              <span>Folder path</span>
              <div className="input-row">
                <input value={node.data.folderPath || ''} onChange={(event) => updateField('folderPath', event.target.value)} />
                <button type="button" className="ghost-button" onClick={() => handleBrowse('folderPath')}>
                  Browse
                </button>
              </div>
            </label>
          </>
        ) : null}

        {node.data.type === 'runCommand' ? (
          <>
            <label className="field">
              <span>Command</span>
              <textarea value={node.data.command || ''} onChange={(event) => updateField('command', event.target.value)} rows={4} />
            </label>
            <label className="field">
              <span>Working directory</span>
              <div className="input-row">
                <input value={node.data.workingDirectory || ''} onChange={(event) => updateField('workingDirectory', event.target.value)} />
                <button type="button" className="ghost-button" onClick={() => handleBrowse('workingDirectory')}>
                  Browse
                </button>
              </div>
            </label>
            <label className="field">
              <span>Terminal mode</span>
              <select value={node.data.terminalType || 'background'} onChange={(event) => updateField('terminalType', event.target.value)}>
                <option value="background">Background</option>
                <option value="newWindow">New window</option>
              </select>
            </label>
            <label className="field">
              <span>Shell</span>
              <select value={node.data.shellType || 'cmd'} onChange={(event) => updateField('shellType', event.target.value)}>
                <option value="cmd">Command Prompt</option>
                <option value="powershell">PowerShell</option>
              </select>
            </label>
          </>
        ) : null}

        {node.data.type === 'openBrowser' ? (
          <>
            <label className="field">
              <span>URL</span>
              <input value={node.data.url || ''} onChange={(event) => updateField('url', event.target.value)} />
            </label>
            <label className="field">
              <span>Browser</span>
              <select value={node.data.browser || 'chrome'} onChange={(event) => updateField('browser', event.target.value)}>
                {BROWSERS.map((browser) => (
                  <option key={browser.id} value={browser.id}>
                    {browser.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Wait mode</span>
              <select value={node.data.waitMode || 'delay'} onChange={(event) => updateField('waitMode', event.target.value)}>
                <option value="delay">Fixed delay</option>
                <option value="waitForServer">Wait for server</option>
              </select>
            </label>
            <label className="field">
              <span>Delay (ms)</span>
              <input type="number" value={node.data.delay ?? 0} onChange={(event) => updateField('delay', Number(event.target.value))} />
            </label>
          </>
        ) : null}

        {node.data.type === 'delay' ? (
          <>
            <label className="field">
              <span>Delay (ms)</span>
              <input type="number" value={node.data.delay ?? 1000} onChange={(event) => updateField('delay', Number(event.target.value))} />
            </label>
            <label className="field">
              <span>Wait URL</span>
              <input value={node.data.waitUrl || ''} onChange={(event) => updateField('waitUrl', event.target.value)} />
            </label>
          </>
        ) : null}

        {node.data.type === 'editorTerminalCommand' ? (
          <>
            <label className="field">
              <span>Command</span>
              <textarea
                value={node.data.command || ''}
                onChange={(event) => updateField('command', event.target.value)}
                rows={4}
              />
            </label>
            <label className="field">
              <span>Terminal hotkey</span>
              <input
                value={node.data.terminalHotkey || 'ctrl+shift+`'}
                onChange={(event) => updateField('terminalHotkey', event.target.value)}
              />
            </label>
            <label className="field">
              <span>Terminal ready delay (ms)</span>
              <input
                type="number"
                min={1000}
                value={node.data.terminalReadyDelayMs ?? 1000}
                onChange={(event) => updateField('terminalReadyDelayMs', Number(event.target.value))}
              />
            </label>
            <label className="toggle-card">
              <div>
                <strong>Submit with Enter</strong>
                <span>Send the command immediately after typing it.</span>
              </div>
              <input
                type="checkbox"
                checked={node.data.submit ?? true}
                onChange={(event) => updateField('submit', event.target.checked)}
              />
            </label>
          </>
        ) : null}

        {node.data.type === 'moveMouse' ? (
          <div className="setting-row">
            <label className="field">
              <span>X</span>
              <input type="number" value={node.data.x ?? 0} onChange={(event) => updateField('x', Number(event.target.value))} />
            </label>
            <label className="field">
              <span>Y</span>
              <input type="number" value={node.data.y ?? 0} onChange={(event) => updateField('y', Number(event.target.value))} />
            </label>
          </div>
        ) : null}

        {node.data.type === 'mouseClick' || node.data.type === 'mouseDoubleClick' ? (
          <label className="field">
            <span>Button</span>
            <select value={node.data.button || 'left'} onChange={(event) => updateField('button', event.target.value)}>
              <option value="left">Left</option>
              <option value="right">Right</option>
              <option value="middle">Middle</option>
            </select>
          </label>
        ) : null}

        {node.data.type === 'mouseScroll' ? (
          <label className="field">
            <span>Scroll amount</span>
            <input type="number" value={node.data.amount ?? -1} onChange={(event) => updateField('amount', Number(event.target.value))} />
          </label>
        ) : null}

        {node.data.type === 'typeText' ? (
          <label className="field">
            <span>Text</span>
            <textarea value={node.data.text || ''} onChange={(event) => updateField('text', event.target.value)} rows={4} />
          </label>
        ) : null}

        {node.data.type === 'pressKey' ? (
          <label className="field">
            <span>Key</span>
            <input value={node.data.key || ''} onChange={(event) => updateField('key', event.target.value)} />
          </label>
        ) : null}

        {node.data.type === 'hotkey' ? (
          <label className="field">
            <span>Keys (comma separated)</span>
            <input
              value={Array.isArray(node.data.keys) ? node.data.keys.join(', ') : ''}
              onChange={(event) => updateField('keys', event.target.value.split(',').map((value) => value.trim()).filter(Boolean))}
            />
          </label>
        ) : null}

      </section>

    </>
  );
}
