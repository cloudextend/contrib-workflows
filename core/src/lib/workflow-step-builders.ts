import { Observable, of, concat, from } from "rxjs";
import { take, mergeMap } from "rxjs/operators";

import { WorkflowContext } from "./workflow-context";
import { WorkflowStep } from "./workflow-step";
import { WorkflowStepSelectorFactory } from "./workflow-step-activators";
import { Type } from "@angular/core";

import { busy, idle } from "@cloudextend/contrib/events/common";
import { RxEvent } from "@cloudextend/contrib/events";
import { nextStep } from "./workflow.events";

export function exec<T extends WorkflowContext = WorkflowContext>(
    label: string,
    handler: () => RxEvent | RxEvent[]
): WorkflowStep<T>;
export function exec<T extends WorkflowContext = WorkflowContext>(
    label: string,
    handler: (contet: T) => RxEvent | RxEvent[]
): WorkflowStep<T>;
export function exec<D1, T extends WorkflowContext = WorkflowContext>(
    label: string,
    handler: (context: T, d1: D1) => RxEvent | RxEvent[],
    dependencies: [d1: Type<D1>]
): WorkflowStep<T>;
export function exec<D1, D2, T extends WorkflowContext = WorkflowContext>(
    label: string,
    handler: (context: T, d1: D1, d2: D2) => RxEvent | RxEvent[],
    dependencies: [d1: Type<D1>, d2: Type<D2>]
): WorkflowStep<T>;
export function exec<D1, D2, D3, T extends WorkflowContext = WorkflowContext>(
    label: string,
    handler: (context: T, d1: D1, d2: D2, d3: D3) => RxEvent | RxEvent[],
    dependencies: [d1: Type<D1>, d2: Type<D2>, d3: Type<D3>]
): WorkflowStep<T>;
export function exec<
    D1,
    D2,
    D3,
    D4,
    T extends WorkflowContext = WorkflowContext
>(
    label: string,
    handler: (
        context: T,
        d1: D1,
        d2: D2,
        d3: D3,
        d4: D4
    ) => RxEvent | RxEvent[],
    dependencies: [d1: Type<D1>, d2: Type<D2>, d3: Type<D3>, d4: Type<D4>]
): WorkflowStep<T>;
export function exec<
    D1,
    D2,
    D3,
    D4,
    D5,
    T extends WorkflowContext = WorkflowContext
>(
    label: string,
    handler: (
        context: T,
        d1: D1,
        d2: D2,
        d3: D3,
        d4: D4,
        d5: D5
    ) => RxEvent | RxEvent[],
    dependencies: [
        d1: Type<D1>,
        d2: Type<D2>,
        d3: Type<D3>,
        d4: Type<D4>,
        d5: Type<D5>
    ]
): WorkflowStep<T>;
export function exec<
    T extends WorkflowContext = WorkflowContext,
    D1 = undefined,
    D2 = undefined,
    D3 = undefined,
    D4 = undefined,
    D5 = undefined
>(
    label: string,
    handler: (
        context?: T,
        d1?: D1,
        d2?: D2,
        d3?: D3,
        d4?: D4,
        d5?: D5
    ) => RxEvent | RxEvent[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    dependencies?: [
        d1?: Type<D1>,
        d2?: Type<D2>,
        d3?: Type<D3>,
        d4?: Type<D4>,
        d5?: Type<D5>
    ]
) {
    const activate = (
        context: T,
        d1?: D1,
        d2?: D2,
        d3?: D3,
        d4?: D4,
        d5?: D5
    ) => {
        // Note that the `context` will always be provided by the WF Engine
        // even though the user does not provide it to this exec method.
        const result = handler(context, d1, d2, d3, d4, d5);
        const next = result ?? nextStep(context.workflowName);
        return Array.isArray(next) ? from(next) : of(next);
    };

    return { activate, label };
}

export function select<T extends WorkflowContext = WorkflowContext>(
    label: string,
    selectorFactory: WorkflowStepSelectorFactory<T>
): WorkflowStep<T> {
    const activate = (context: T) => {
        if (!context.store)
            throw new Error("'store' is required for `select` steps.");

        return context.store.select(selectorFactory(context)).pipe(
            take(1),
            mergeMap(selected =>
                Array.isArray(selected) ? from(selected) : of(selected)
            )
        ) as Observable<RxEvent>;
    };

    return { activate, label };
}

export function waitOn<
    T extends WorkflowContext = WorkflowContext,
    D1 = undefined,
    D2 = undefined,
    D3 = undefined,
    D4 = undefined,
    D5 = undefined
>(
    label: string,
    waitingMessage: string,
    lengthyWork: (
        context: T,
        d1?: D1,
        d2?: D2,
        d3?: D3,
        d4?: D4,
        d5?: D5
    ) => Observable<RxEvent>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    dependencies?: [
        d1?: Type<D1>,
        d2?: Type<D2>,
        d3?: Type<D3>,
        d4?: Type<D4>,
        d5?: Type<D5>
    ]
): WorkflowStep<T>;
export function waitOn<
    T extends WorkflowContext = WorkflowContext,
    D1 = undefined,
    D2 = undefined,
    D3 = undefined,
    D4 = undefined,
    D5 = undefined
>(
    label: string,
    waitingMessageBuilder: (
        context: T,
        d1?: D1,
        d2?: D2,
        d3?: D3,
        d4?: D4,
        d5?: D5
    ) => string,
    lengthyWork: (
        context: T,
        d1?: D1,
        d2?: D2,
        d3?: D3,
        d4?: D4,
        d5?: D5
    ) => Observable<RxEvent>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    dependencies?: [
        d1?: Type<D1>,
        d2?: Type<D2>,
        d3?: Type<D3>,
        d4?: Type<D4>,
        d5?: Type<D5>
    ]
): WorkflowStep<T>;
export function waitOn<
    T extends WorkflowContext = WorkflowContext,
    D1 = undefined,
    D2 = undefined,
    D3 = undefined,
    D4 = undefined,
    D5 = undefined
>(
    label: string,
    messageOrBuilder:
        | string
        | ((context: T, d1?: D1, d2?: D2, d3?: D3, d4?: D4, d5?: D5) => string),
    lengthyWork: (
        context: T,
        d1?: D1,
        d2?: D2,
        d3?: D3,
        d4?: D4,
        d5?: D5
    ) => Observable<RxEvent>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    dependencies?: [
        d1?: Type<D1>,
        d2?: Type<D2>,
        d3?: Type<D3>,
        d4?: Type<D4>,
        d5?: Type<D5>
    ]
): WorkflowStep<T> {
    const activate = (
        context: T,
        d1?: D1,
        d2?: D2,
        d3?: D3,
        d4?: D4,
        d5?: D5
    ) => {
        const waitingMessage =
            typeof messageOrBuilder === "string"
                ? messageOrBuilder
                : messageOrBuilder(context, d1, d2, d3, d4, d5);

        const busy$ = of(
            busy(context.workflowName, {
                message: waitingMessage,
            })
        );
        const idle$ = of(idle(context.workflowName));

        return concat(busy$, lengthyWork(context, d1, d2, d3, d4, d5), idle$);
    };

    return { activate, label };
}
