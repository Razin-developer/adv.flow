export type BlockType =
  | 'openApp'
  | 'runCommand'
  | 'openBrowser'
  | 'delay';
export type Browser = 'system' | 'chrome' | 'edge' | 'brave' | 'firefox' | 'safari' | 'comet';
export type TerminalMode = 'background' | 'newWindow';
export type NodeStatus = 'idle' | 'running' | 'success' | 'error' | 'skipped' | 'stopped';
export type WorkflowKind = 'desktop';

export interface OpenAppConfig    { type: 'openApp';     appId: string; appName: string; command: string; args: string[]; appPath?: string; source?: string; folderPath: string; label: string; }
export interface RunCommandConfig { type: 'runCommand';  command: string; workingDirectory: string; terminalType: TerminalMode; shellType?: string; label: string; }
export interface OpenBrowserConfig{ type: 'openBrowser'; url: string; browser: Browser; waitMode: 'delay' | 'waitForServer'; delay: number; label: string; }
export interface DelayConfig      { type: 'delay';       delay: number; waitUrl?: string; label: string; }

export type BlockConfig =
  | OpenAppConfig
  | RunCommandConfig
  | OpenBrowserConfig
  | DelayConfig;

export interface InstalledApp {
  id: string;
  name: string;
  command: string;
  args: string[];
  path?: string | null;
  source: string;
}

export interface WorkflowNode {
  id: string;
  type: BlockType;
  position: { x: number; y: number };
  data: BlockConfig & { id: string };
}

export interface WorkflowEdge {
  id: string; source: string; target: string; animated?: boolean;
}

export interface Workflow {
  _id?: string; id?: string;
  name: string; description: string;
  kind?: WorkflowKind;
  tags: string[]; favorite: boolean;
  nodes: WorkflowNode[]; edges: WorkflowEdge[];
  createdAt: string; updatedAt: string;
}

export interface ExecutionLog {
  nodeId: string; nodeName: string;
  status: NodeStatus; message?: string; timestamp: string;
}

export type ExecutionEvent =
  | { type: 'node:start'; nodeId: string; nodeName: string }
  | { type: 'node:log';   nodeId: string; message: string }
  | { type: 'node:done';  nodeId: string; nodeName: string; status: 'success' | 'error'; error?: string }
  | { type: 'workflow:done'; status: 'completed' | 'failed' };
