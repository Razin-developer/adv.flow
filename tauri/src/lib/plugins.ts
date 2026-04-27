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
  { id: 'system', name: 'System default', command: 'default browser', icon: 'SY' },
  { id: 'chrome', name: 'Google Chrome', command: 'chrome', icon: 'CH' },
  { id: 'edge', name: 'Microsoft Edge', command: 'edge', icon: 'ED' },
  { id: 'brave', name: 'Brave', command: 'brave', icon: 'BR' },
  { id: 'firefox', name: 'Firefox', command: 'firefox', icon: 'FF' },
  { id: 'safari', name: 'Safari', command: 'safari', icon: 'SF' },
  { id: 'comet', name: 'Comet', command: 'comet', icon: 'CO' },
] as const;

export function getPlatform() {
  const value = navigator.userAgent.toLowerCase();
  if (value.includes('mac')) return 'macos';
  if (value.includes('win')) return 'windows';
  return 'linux';
}

export function getDefaultShell() {
  return getPlatform() === 'windows' ? 'powershell' : 'system';
}

export function getShellOptions() {
  if (getPlatform() === 'windows') {
    return [
      { id: 'powershell', name: 'PowerShell' },
      { id: 'cmd', name: 'Command Prompt' },
      { id: 'pwsh', name: 'PowerShell 7 (pwsh)' },
    ];
  }
  return [
    { id: 'system', name: 'System default shell' },
    { id: 'bash', name: 'Bash' },
    { id: 'zsh', name: 'Zsh' },
    { id: 'sh', name: 'POSIX sh' },
    { id: 'pwsh', name: 'PowerShell 7 (pwsh)' },
  ];
}

export function getDefaultOpenApp() {
  const platform = getPlatform();
  if (platform === 'windows') {
    return { appId: 'explorer', appName: 'File Explorer', command: 'explorer', args: ['{path}'], appPath: '', source: 'windows' };
  }
  if (platform === 'macos') {
    return { appId: 'finder', appName: 'Finder', command: 'open', args: ['-a', 'Finder', '{path}'], appPath: '', source: 'macos' };
  }
  return { appId: 'files', appName: 'Files', command: 'xdg-open', args: ['{path}'], appPath: '', source: 'linux' };
}
