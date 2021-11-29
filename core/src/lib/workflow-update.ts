export enum WorkflowUpdateType {
    beginWorkflow,
    beginStep,
    endStep,
    endWorkflow,
}

export interface WorkflowUpdate {
    type: WorkflowUpdateType;
    stepLabel?: string;
    stepIndex?: number;
    workflowName: string;
}
