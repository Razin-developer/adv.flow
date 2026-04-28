import type { Workflow } from "@/types/workflow";

export const IN_APP_NODE_TYPES = new Set([
  "macroKeyCombo",
  "macroTypeText",
  "macroMouseClick",
  "macroMoveMouse",
  "macroScroll",
  "waitActiveApp",
]);

export function isInAppWorkflow(workflow: Workflow) {
  return Boolean(
    workflow.shortcut?.trim() ||
      workflow.targetApp?.trim() ||
      workflow.nodes.some((node) => IN_APP_NODE_TYPES.has(node.data?.type || node.type)),
  );
}
