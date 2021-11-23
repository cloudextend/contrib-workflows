export enum WorkflowChangeType {
    beginWorkflow,
    beginStep,
    endStep,
    endWorkflow,
}

export interface WorkflowChange {
    type: WorkflowChangeType;
    stepLabel?: string;
    stepIndex?: number;
    workflowName: string;
}
