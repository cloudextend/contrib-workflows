import { Type } from "@angular/core";
import { RxEvent } from "@cloudextend/contrib/events";
import { concat, Observable, of } from "rxjs";
import { WorkflowContext } from "../workflow-context";
import { WorkflowStep } from "../workflow-step";
import { busy, idle } from "../workflow.events";

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
