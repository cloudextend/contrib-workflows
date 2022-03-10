import { ProviderToken } from "@angular/core";
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
    handler: (d1: D1, context: T) => RxEvent | RxEvent[],
    dependencies: [ProviderToken<D1>]
): WorkflowStep<T>;

export function exec<D1, D2, T extends WorkflowContext = WorkflowContext>(
    label: string,
    handler: (d1: D1, d2: D2, context: T) => RxEvent | RxEvent[],
    dependencies: [ProviderToken<D1>, ProviderToken<D2>]
): WorkflowStep<T>;

export function exec<D1, D2, D3, T extends WorkflowContext = WorkflowContext>(
    label: string,
    handler: (d1: D1, d2: D2, d3: D3, context: T) => RxEvent | RxEvent[],
    dependencies: [ProviderToken<D1>, ProviderToken<D2>, ProviderToken<D3>]
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
        d1: D1,
        d2: D2,
        d3: D3,
        d4: D4,
        context: T
    ) => RxEvent | RxEvent[],
    dependencies: [
        ProviderToken<D1>,
        ProviderToken<D2>,
        ProviderToken<D3>,
        ProviderToken<D4>
    ]
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
        d1: D1,
        d2: D2,
        d3: D3,
        d4: D4,
        d5: D5,
        context: T
    ) => RxEvent | RxEvent[],
    dependencies: [
        ProviderToken<D1>,
        ProviderToken<D2>,
        ProviderToken<D3>,
        ProviderToken<D4>,
        ProviderToken<D5>
    ]
): WorkflowStep<T>;

export function exec<
    D1,
    D2,
    D3,
    D4,
    D5,
    D6,
    T extends WorkflowContext = WorkflowContext
>(
    label: string,
    handler: (
        d1: D1,
        d2: D2,
        d3: D3,
        d4: D4,
        d5: D5,
        d6: D6,
        context: T
    ) => RxEvent | RxEvent[],
    dependencies: [
        ProviderToken<D1>,
        ProviderToken<D2>,
        ProviderToken<D3>,
        ProviderToken<D4>,
        ProviderToken<D5>
    ]
): WorkflowStep<T>;

export function exec<T extends WorkflowContext = WorkflowContext>(
    label: string,
    handler: (...deps: any[]) => RxEvent | RxEvent[],
    dependencies?: any[]
): WorkflowStep<T> {
    const activate = (context: T, ...d: any[]) => {
        // Note that the `context` will always be provided by the WF Engine
        // even though the user does not provide it to this exec1 method.
        const result = handler(...d, context);
        const next = result ?? nextStep(context.workflowName);
        return Array.isArray(next) ? from(next) : of(next);
    };

    return { activate, dependencies, label };
}
