export interface Plugin {
  id: string;
  name: string;
  command: string;
  args: string[];
  icon: string;
  color: string;
}

export const PLUGINS: Plugin[] = [
  { id: 'vscode', name: 'VS Code', command: 'code', args: ['{path}'], icon: 'VS', color: '#007ACC' },
  { id: 'cursor', name: 'Cursor', command: 'cursor', args: ['{path}'], icon: 'CU', color: '#111827' },
  { id: 'antigravity', name: 'Antigravity', command: 'antigravity', args: ['{path}'], icon: 'AG', color: '#FF6B35' },
];

export const BROWSERS = [
  { id: 'chrome', name: 'Google Chrome', command: ['cmd', ['/c', 'start', 'chrome']], icon: 'CH' },
  { id: 'edge', name: 'Microsoft Edge', command: ['cmd', ['/c', 'start', 'msedge']], icon: 'ED' },
  { id: 'brave', name: 'Brave', command: ['cmd', ['/c', 'start', 'brave']], icon: 'BR' },
  { id: 'comet', name: 'Comet', command: ['cmd', ['/c', 'start', 'comet']], icon: 'CO' },
] as const;
