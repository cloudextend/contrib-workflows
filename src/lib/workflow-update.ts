import { WorkflowContext } from "./workflow-context";

export enum WorkflowUpdateType {
    beginWorkflow,
    beginStep,
    endStep,
    endWorkflow,
}

export interface WorkflowUpdate<T extends WorkflowContext = WorkflowContext> {
    context: T;
    type: WorkflowUpdateType;
    stepLabel?: string;
    stepIndex?: number;
    workflowName: string;
}
