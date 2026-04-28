import WorkflowsPage from "@/pages/WorkflowPage";
import { isInAppWorkflow } from "@/lib/workflowKinds";
import type { Workflow } from "@/types/workflow";

export default function InAppPage(props: {
  workflows: Workflow[];
  loading: boolean;
  onCreateWorkflow: () => void;
  onOpenWorkflow: (id: string) => void;
  onDuplicateWorkflow: (id: string) => void;
  onDeleteWorkflow: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onImportComplete: () => Promise<void>;
  onRunWorkflow: (id: string, name: string) => Promise<void>;
}) {
  return (
    <WorkflowsPage
      {...props}
      workflows={props.workflows.filter(isInAppWorkflow)}
      title="In-app"
      subtitle="Shortcut-triggered and active-app workflows for macros automation."
      emptyLabel="No in-app workflows yet"
      createLabel="New in-app workflow"
    />
  );
}
