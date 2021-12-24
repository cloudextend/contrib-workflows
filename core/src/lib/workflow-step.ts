import { Type } from "@angular/core";
import { RxEvent } from "@cloudextend/contrib/events";
import { Observable } from "rxjs";

import { WorkflowContext } from "./workflow-context";

export interface WorkflowStepActivateHandler<
    T extends WorkflowContext = WorkflowContext,
    D1 = undefined,
    D2 = undefined,
    D3 = undefined,
    D4 = undefined,
    D5 = undefined
> {
    (
        context: T,
        d1?: D1,
        d2?: D2,
        d3?: D3,
        d4?: D4,
        d5?: D5
    ): Observable<RxEvent>;
    dependencies?: [
        Type<D1>,
        Type<D2> | undefined,
        Type<D3> | undefined,
        Type<D4> | undefined,
        Type<D5> | undefined
    ];
}

export interface WorkflowStep<
    ContextType extends WorkflowContext = WorkflowContext,
    D1 = undefined,
    D2 = undefined,
    D3 = undefined,
    D4 = undefined,
    D5 = undefined
> {
    readonly label: string;
    readonly activate: WorkflowStepActivateHandler<ContextType>;
    readonly dependencies?: [
        d1?: Type<D1>,
        d2?: Type<D2>,
        d3?: Type<D3>,
        d4?: Type<D4>,
        d5?: Type<D5>
    ];
}
