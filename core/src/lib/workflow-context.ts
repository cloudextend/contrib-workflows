export interface WorkflowContext extends Record<string, unknown> {
    readonly workflowName: string;
}
