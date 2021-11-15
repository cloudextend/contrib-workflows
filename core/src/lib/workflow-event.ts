export enum WorkflowEventType {
    beginWorkflow,
    beginStep,
    endStep,
    endWorkflow,
}

export interface WorkflowEvent {
    eventType: WorkflowEventType;
    stepLabel?: string;
    stepIndex?: number;
    workflowName: string;
}
