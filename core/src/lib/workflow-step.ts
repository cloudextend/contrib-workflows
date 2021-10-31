import { RxEvent } from "@cloudextend/contrib/events";

import { WorkflowContext } from "./workflow-context";

export interface WorkflowStepActivateHandler<
    T extends WorkflowContext = WorkflowContext,
    D1 = undefined,
    D2 = undefined,
    D3 = undefined,
    D4 = undefined,
    D5 = undefined
> {
    (context: T, d1?: D1, d2?: D2, d3?: D3, d4?: D4, d5?: D5):
        | RxEvent
        | RxEvent[];
}

export interface WorkflowStep<
    ContextType extends WorkflowContext = WorkflowContext
> {
    readonly label: string;
    readonly activate: WorkflowStepActivateHandler<ContextType>;
}
