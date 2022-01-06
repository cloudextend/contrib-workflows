import { Type } from "@angular/core";
import { RxEvent } from "@cloudextend/contrib/events";
import { Observable } from "rxjs";

import { WorkflowContext } from "./workflow-context";

export interface WorkflowStepActivateHandler<
    T extends WorkflowContext = WorkflowContext
> {
    (context: T, ...deps: any[]): Observable<RxEvent>;
    dependencies?: any[];
}

export interface WorkflowStep<
    ContextType extends WorkflowContext = WorkflowContext
> {
    readonly label: string;
    readonly activate: WorkflowStepActivateHandler<ContextType>;
    readonly dependencies?: Type<any>[];
}
