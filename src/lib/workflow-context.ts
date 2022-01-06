import { Store } from "@ngrx/store";

export interface WorkflowContext extends Record<string, unknown> {
    readonly workflowName: string;
    readonly store: Store;
    readonly isBackgroundWorkflow?: boolean;
    [name: string]: unknown;
}
