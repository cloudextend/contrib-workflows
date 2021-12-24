import { Type } from "@angular/core";
import { RxEvent } from "@cloudextend/contrib/events";
import { stat } from "fs";
import { stringify } from "querystring";
import { concat, Observable, of } from "rxjs";
import { WorkflowContext } from "../workflow-context";
import { WorkflowStep } from "../workflow-step";
import { busy, idle } from "../workflow.events";

export function load<T extends WorkflowContext = WorkflowContext>(
    label: string,
    lengthyWork: (context: T) => Observable<RxEvent>,
    loadingMessage?: string
): WorkflowStep<T>;
export function load<
    T extends WorkflowContext = WorkflowContext,
    D1 = undefined
>(
    label: string,
    lengthyWork: (context: T, d1: D1) => Observable<RxEvent>,
    dependencies: [d1: Type<D1>],
    waitingMessage?: string
): WorkflowStep<T, D1>;
export function load<
    T extends WorkflowContext = WorkflowContext,
    D1 = undefined,
    D2 = undefined
>(
    label: string,
    lengthyWork: (context: T, d1: D1, d2: D2) => Observable<RxEvent>,
    dependencies: [d1: Type<D1>, d2: Type<D2>],
    waitingMessage?: string
): WorkflowStep<T, D1, D2>;
export function load<
    T extends WorkflowContext = WorkflowContext,
    D1 = undefined,
    D2 = undefined,
    D3 = undefined
>(
    label: string,
    lengthyWork: (context: T, d1: D1, d2: D2, d3: D3) => Observable<RxEvent>,
    dependencies: [d1: Type<D1>, d2: Type<D2>, d3: Type<D3>],
    waitingMessage?: string
): WorkflowStep<T, D1, D2, D3>;
export function load<
    T extends WorkflowContext = WorkflowContext,
    D1 = undefined,
    D2 = undefined,
    D3 = undefined,
    D4 = undefined
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
): WorkflowStep<T, D1, D2, D3, D4>;
export function load<
    T extends WorkflowContext = WorkflowContext,
    D1 = undefined,
    D2 = undefined,
    D3 = undefined,
    D4 = undefined,
    D5 = undefined
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
): WorkflowStep<T, D1, D2, D3, D4, D5>;
export function load<
    T extends WorkflowContext = WorkflowContext,
    D1 = undefined
>(
    label: string,
    lengthyWork: (context: T, d1: D1) => Observable<RxEvent>,
    dependencies: [d1: Type<D1>],
    waitingMessageBuilder: (context: T, d1: D1) => string
): WorkflowStep<T, D1>;
export function load<
    T extends WorkflowContext = WorkflowContext,
    D1 = undefined,
    D2 = undefined
>(
    label: string,
    lengthyWork: (context: T, d1: D1, d2: D2) => Observable<RxEvent>,
    dependencies: [d1: Type<D1>, d2: Type<D2>],
    waitingMessageBuilder: (context: T, d1: D1, d2: D2) => string
): WorkflowStep<T, D1, D2>;
export function load<
    T extends WorkflowContext = WorkflowContext,
    D1 = undefined,
    D2 = undefined,
    D3 = undefined
>(
    label: string,
    lengthyWork: (context: T, d1: D1, d2: D2, d3: D3) => Observable<RxEvent>,
    dependencies: [d1: Type<D1>, d2: Type<D2>, d3: Type<D3>],
    waitingMessageBuilder: (context: T, d1: D1, d2: D2, d3: D3) => string
): WorkflowStep<T, D1, D2, D3>;
export function load<
    T extends WorkflowContext = WorkflowContext,
    D1 = undefined,
    D2 = undefined,
    D3 = undefined,
    D4 = undefined
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
    waitingMessageBuilder: (
        context: T,
        d1: D1,
        d2: D2,
        d3: D3,
        d4: D4
    ) => string
): WorkflowStep<T, D1, D2, D3, D4>;
export function load<
    T extends WorkflowContext = WorkflowContext,
    D1 = undefined,
    D2 = undefined,
    D3 = undefined,
    D4 = undefined,
    D5 = undefined
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
    waitingMessageBuilder: (
        context: T,
        d1: D1,
        d2: D2,
        d3: D3,
        d4: D4,
        d5: D5
    ) => string
): WorkflowStep<T, D1, D2, D3, D4, D5>;
export function load<
    T extends WorkflowContext = WorkflowContext,
    D1 = undefined,
    D2 = undefined,
    D3 = undefined,
    D4 = undefined,
    D5 = undefined
>(
    label: string,
    lengthyWork: (
        context: T,
        d1?: D1,
        d2?: D2,
        d3?: D3,
        d4?: D4,
        d5?: D5
    ) => Observable<RxEvent>,
    dependenciesOrLoadingMessage?:
        | [
              d1?: Type<D1>,
              d2?: Type<D2>,
              d3?: Type<D3>,
              d4?: Type<D4>,
              d5?: Type<D5>
          ]
        | string,
    messageOrBuilder?:
        | string
        | ((context: T, d1?: D1, d2?: D2, d3?: D3, d4?: D4, d5?: D5) => string)
): WorkflowStep<T, D1, D2, D3, D4, D5> {
    let [dependencies, message] =
        typeof dependenciesOrLoadingMessage === "string"
            ? [undefined, dependenciesOrLoadingMessage]
            : [dependenciesOrLoadingMessage, undefined];

    const activate = (
        context: T,
        d1?: D1,
        d2?: D2,
        d3?: D3,
        d4?: D4,
        d5?: D5
    ) => {
        if (context.isBackgroundWorkflow) {
            return lengthyWork(context, d1, d2, d3, d4, d5);
        }

        if (!message) {
            if (!message) {
                message = "Loading...";
            } else if (typeof messageOrBuilder === "string") {
                message = messageOrBuilder;
            } else if (!message && messageOrBuilder) {
                message = messageOrBuilder(context, d1, d2, d3, d4, d5);
            }
        }

        const busy$ = of(busy(context.workflowName, { message }));
        const idle$ = of(idle(context.workflowName));

        return concat(busy$, lengthyWork(context, d1, d2, d3, d4, d5), idle$);
    };

    return { activate, dependencies, label };
}
