import { Type } from "@angular/core";
import { RxEvent } from "@cloudextend/contrib/events";
import { concat, Observable, of } from "rxjs";
import { WorkflowContext } from "../workflow-context";
import { WorkflowStep } from "../workflow-step";
import { busy, idle } from "../workflow.events";

export function load<T extends WorkflowContext = WorkflowContext>(
    label: string,
    lengthyWork: (context: T) => Observable<RxEvent>,
    loadingMessage?: string
): WorkflowStep<T>;
export function load<D1, T extends WorkflowContext = WorkflowContext>(
    label: string,
    lengthyWork: (context: T, d1: D1) => Observable<RxEvent>,
    dependencies: [d1: Type<D1>]
): WorkflowStep<T>;
export function load<D1, T extends WorkflowContext = WorkflowContext>(
    label: string,
    lengthyWork: (context: T, d1: D1) => Observable<RxEvent>,
    dependencies: [d1: Type<D1>],
    waitingMessage: string
): WorkflowStep<T>;
export function load<D1, D2, T extends WorkflowContext = WorkflowContext>(
    label: string,
    lengthyWork: (context: T, d1: D1, d2: D2) => Observable<RxEvent>,
    dependencies: [d1: Type<D1>, d2: Type<D2>],
    waitingMessage?: string
): WorkflowStep<T>;
export function load<D1, D2, D3, T extends WorkflowContext = WorkflowContext>(
    label: string,
    lengthyWork: (context: T, d1: D1, d2: D2, d3: D3) => Observable<RxEvent>,
    dependencies: [d1: Type<D1>, d2: Type<D2>, d3: Type<D3>],
    waitingMessage?: string
): WorkflowStep<T>;
export function load<
    D1,
    D2,
    D3,
    D4,
    T extends WorkflowContext = WorkflowContext
>(
    label: string,
    lengthyWork: (
        context: T,
        d1: D1,
        d2: D2,
        d3: D3,
        d4: D4
    ) => Observable<RxEvent>,
    dependencies: [d1: Type<D1>, d2: Type<D2>, d3: Type<D3>, d4: Type<D4>],
    waitingMessage?: string
): WorkflowStep<T>;
export function load<
    D1,
    D2,
    D3,
    D4,
    D5,
    T extends WorkflowContext = WorkflowContext
>(
    label: string,
    lengthyWork: (
        context: T,
        d1: D1,
        d2: D2,
        d3: D3,
        d4: D4,
        d5: D5
    ) => Observable<RxEvent>,
    dependencies: [
        d1: Type<D1>,
        d2: Type<D2>,
        d3: Type<D3>,
        d4: Type<D4>,
        d5: Type<D5>
    ],
    waitingMessage?: string
): WorkflowStep<T>;
export function load<T extends WorkflowContext = WorkflowContext>(
    label: string,
    lengthyWork: (context: T, ...dpes: any[]) => Observable<RxEvent>,
    dependenciesOrLoadingMessage?: any[] | string,
    loadingMessage?: string
): WorkflowStep<T> {
    let [dependencies, message] =
        typeof dependenciesOrLoadingMessage === "string"
            ? [undefined, dependenciesOrLoadingMessage]
            : [dependenciesOrLoadingMessage, loadingMessage ?? "Loading..."];

    const activate = (context: T, ...d: any[]) => {
        if (context.isBackgroundWorkflow) {
            return lengthyWork(context, ...d);
        }

        const busy$ = of(busy(context.workflowName, { message }));
        const idle$ = of(idle(context.workflowName));

        return concat(busy$, lengthyWork(context, ...d), idle$);
    };

    return { activate, dependencies, label };
}
