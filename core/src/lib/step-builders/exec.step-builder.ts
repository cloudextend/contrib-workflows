import { Type } from "@angular/core";
import { from, of } from "rxjs";

import { RxEvent } from "@cloudextend/contrib/events";

import { WorkflowContext } from "../workflow-context";
import { WorkflowStep } from "../workflow-step";
import { nextStep } from "../workflow.events";

export function exec<T extends WorkflowContext = WorkflowContext>(
    label: string,
    handler: () => RxEvent | RxEvent[]
): WorkflowStep<T>;
export function exec<T extends WorkflowContext = WorkflowContext>(
    label: string,
    handler: (context: T) => RxEvent | RxEvent[]
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
