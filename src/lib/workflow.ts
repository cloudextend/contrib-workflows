import { WorkflowContext } from "./workflow-context";
import { WorkflowStep } from "./workflow-step";
import { WorkflowStepAction } from "./workflow-step-activators";

export interface Workflow<T extends WorkflowContext = WorkflowContext> {
    readonly name: string;
    readonly isBackgroundWorkflow?: boolean;
    readonly steps: WorkflowStep<T>[];
    readonly onCompletion?: WorkflowStepAction<T>;
    readonly doNotIndex?: boolean;
}
