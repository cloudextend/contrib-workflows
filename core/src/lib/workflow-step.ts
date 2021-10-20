import { Observable } from "rxjs";

import { RxEvent } from "@cloudextend/common/events";

import { WorkflowContext } from "./workflow-context";

export interface WorkflowStep<
    ContextType extends WorkflowContext = WorkflowContext
> {
    readonly label: string;
    readonly activate: (context: ContextType) => Observable<RxEvent>;
}
