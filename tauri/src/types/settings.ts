export interface AppSettings {
  storageMode: "local" | "mongodb";
  mongodbUri: string;
  mongodbDatabase: string;
  mongodbCollection: string;
  autoSaveDelayMs: number;
  commandTimeoutSeconds: number;
  maxParallelNodes: number;
  compactMode: boolean;
  useSystemAppearance: boolean;
  reduceMotion: boolean;
  confirmDestructiveActions: boolean;
  launchOnStartup: boolean;
  reopenLastWorkspace: boolean;
  developerMode: boolean;
  telemetryEnabled: boolean;
  syncOnOpen: boolean;
  preferredBrowser: string;
  preferredEditor: string;
  aiProvider: "gemini" | "local";
  geminiApiKey: string;
  geminiModel: string;
  localModelEndpoint: string;
  localModelApiKey: string;
  localModelName: string;
}
