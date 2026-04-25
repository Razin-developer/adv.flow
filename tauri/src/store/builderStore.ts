import { create } from 'zustand';
import type { ExecutionLog, NodeStatus } from '@/types/workflow';

interface BuilderStore {
  running: boolean;
  done: boolean;
  failed: boolean;
  stopped: boolean;
  logs: ExecutionLog[];
  nodeStatuses: Record<string, NodeStatus>;
  execute: (workflowId: string) => Promise<void>;
  stop: () => void;
  clearLogs: () => void;
}

let currentAbort: AbortController | null = null;

export const useBuilderStore = create<BuilderStore>((set) => ({
  running: false,
  done: false,
  failed: false,
  stopped: false,
  logs: [],
  nodeStatuses: {},

  clearLogs: () => set({ logs: [], done: false, failed: false, stopped: false, nodeStatuses: {} }),

  stop: () => {
    currentAbort?.abort();
  },

  execute: async (workflowId) => {
    currentAbort = new AbortController();
    set({ running: true, done: false, failed: false, stopped: false, logs: [], nodeStatuses: {} });

    try {
      // Temporarily mock execution for Tauri port
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('execute_workflow', { id: workflowId });
      
      const now = new Date().toISOString();
      set((state) => ({
        logs: [
          ...state.logs,
          { nodeId: 'engine', nodeName: 'Engine', status: 'success', message: 'Workflow execution triggered via native backend.', timestamp: now },
        ],
        running: false,
        done: true,
        failed: false,
      }));
    } catch (error) {
      const now = new Date().toISOString();

      if (error instanceof Error && error.name === 'AbortError') {
        set((state) => ({
          running: false,
          done: true,
          failed: false,
          stopped: true,
          nodeStatuses: Object.fromEntries(
            Object.entries(state.nodeStatuses).map(([key, value]) => [key, value === 'running' ? 'stopped' : value])
          ),
          logs: [
            ...state.logs,
            {
              nodeId: 'engine',
              nodeName: 'Engine',
              status: 'stopped',
              message: 'Stopped by user',
              timestamp: now,
            },
          ],
        }));
      } else {
        set((state) => ({
          running: false,
          done: true,
          failed: true,
          logs: [
            ...state.logs,
            {
              nodeId: 'engine',
              nodeName: 'Engine',
              status: 'error',
              message: error instanceof Error ? error.message : String(error),
              timestamp: now,
            },
          ],
        }));
      }
    }
  },
}));
