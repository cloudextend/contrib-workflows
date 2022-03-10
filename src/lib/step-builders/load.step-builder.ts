import { ProviderToken } from "@angular/core";
import { RxEvent } from "@cloudextend/contrib/events";
import { concat, Observable, of } from "rxjs";

import { WorkflowContext } from "../workflow-context";
import { WorkflowStep } from "../workflow-step";
import { busy, idle } from "../workflow.events";

export function load<T extends WorkflowContext = WorkflowContext>(
    label: string,
    lengthyWork: (context: T) => Observable<RxEvent>,
    options?: Options | OptionsBuilder<T>
): WorkflowStep<T>;

export function load<D1, T extends WorkflowContext = WorkflowContext>(
    label: string,
    lengthyWork: (d1: D1, context: T) => Observable<RxEvent>,
    dependencies: [d1: ProviderToken<D1>],
    options?: Options | OptionsBuilder1<D1, T>
): WorkflowStep<T>;

export function load<D1, D2, T extends WorkflowContext = WorkflowContext>(
    label: string,
    lengthyWork: (d1: D1, d2: D2, context: T) => Observable<RxEvent>,
    dependencies: [d1: ProviderToken<D1>, d2: ProviderToken<D2>],
    options?: Options | OptionsBuilder2<D1, D2, T>
): WorkflowStep<T>;

export function load<D1, D2, D3, T extends WorkflowContext = WorkflowContext>(
    label: string,
    lengthyWork: (d1: D1, d2: D2, d3: D3, context: T) => Observable<RxEvent>,
    dependencies: [
        d1: ProviderToken<D1>,
        d2: ProviderToken<D2>,
        d3: ProviderToken<D3>
    ],
    options?: Options | OptionsBuilder3<D1, D2, D3, T>
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
        d1: D1,
        d2: D2,
        d3: D3,
        d4: D4,
        context: T
    ) => Observable<RxEvent>,
    dependencies: [
        d1: ProviderToken<D1>,
        d2: ProviderToken<D2>,
        d3: ProviderToken<D3>,
        d4: ProviderToken<D4>
    ],
    options?: Options | OptionsBuilder4<D1, D2, D3, D4, T>
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
        d1: D1,
        d2: D2,
        d3: D3,
        d4: D4,
        d5: D5,
        context: T
    ) => Observable<RxEvent>,
    dependencies: [
        d1: ProviderToken<D1>,
        d2: ProviderToken<D2>,
        d3: ProviderToken<D3>,
        d4: ProviderToken<D4>,
        d5: ProviderToken<D5>
    ],
    options?: Options | OptionsBuilder5<D1, D2, D3, D4, D5, T>
): WorkflowStep<T>;

export function load<T extends WorkflowContext = WorkflowContext>(
    label: string,
    lengthyWork: (...dpes: any[]) => Observable<RxEvent>,
    dependenciesOrOptions?: any[] | Options | OptionsBuilderUnchecked,
    optionsBuilder?: Options | OptionsBuilderUnchecked
): WorkflowStep<T> {
    let [dependencies, optsOrBuilder] = Array.isArray(dependenciesOrOptions)
        ? [dependenciesOrOptions, optionsBuilder]
        : [undefined, dependenciesOrOptions];

    const activate = (context: T, ...d: any[]) => {
        const options =
            typeof optsOrBuilder === "function"
                ? optsOrBuilder(...d, context)
                : optsOrBuilder;

        if (context.isBackgroundWorkflow || options?.isBackgroundStep) {
            return lengthyWork(context, ...d);
        }

        const busy$ = of(
            busy(context.workflowName, {
                message: options?.loadingMessage ?? "Loading...",
            })
        );
        const idle$ = of(idle(context.workflowName));

        return concat(busy$, lengthyWork(...d, context), idle$);
    };

    return { activate, dependencies, label };
}

export interface Options {
    loadingMessage?: string;
    isBackgroundStep?: boolean;
}

export type OptionsBuilder<T extends WorkflowContext = WorkflowContext> = (
    context: T
) => Options;
export type OptionsBuilder1<D1, T extends WorkflowContext = WorkflowContext> = (
    d1: D1,
    context: T
) => Options;
export type OptionsBuilder2<
    D1,
    D2,
    T extends WorkflowContext = WorkflowContext
> = (d1: D1, d2: D2, context: T) => Options;
export type OptionsBuilder3<
    D1,
    D2,
    D3,
    T extends WorkflowContext = WorkflowContext
> = (d1: D1, d2: D2, d3: D3, context: T) => Options;
export type OptionsBuilder4<
    D1,
    D2,
    D3,
    D4,
    T extends WorkflowContext = WorkflowContext
> = (d1: D1, d2: D2, d3: D3, d4: D4, context: T) => Options;

export type OptionsBuilder5<
    D1,
    D2,
    D3,
    D4,
    D5,
    T extends WorkflowContext = WorkflowContext
> = (d1: D1, d2: D2, d3: D3, d4: D4, d5: D5, context: T) => Options;

export type OptionsBuilderUnchecked = (...depsAndContext: any[]) => Options;
