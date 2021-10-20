import { Store } from "@ngrx/store";
import { Observable, of, concat, from } from "rxjs";
import { take, flatMap } from "rxjs/operators";

import { isString, busy, idle } from "@cloudextend/common/core";
import { RxEvent } from "@cloudextend/common/events";

import { WorkflowContext } from "./workflow-context";
import { WorkflowStep } from "./workflow-step";
import {
    WorkflowStepAction,
    WorkflowStepSelectorFactory,
} from "./workflow-step-activators";
import * as wfevents from "./workflow.events";

export function exec<T extends WorkflowContext = WorkflowContext>(
    label: string,
    fn: WorkflowStepAction<T>
): WorkflowStep<T> {
    const activate = (context: T) => {
        const result = fn(context) ?? wfevents.nextStep(context.workflowName);
        return Array.isArray(result) ? from(result) : of(result);
    };

    return { activate, label };
}

export function select<T extends WorkflowContext = WorkflowContext>(
    label: string,
    selectorFactory: WorkflowStepSelectorFactory<T>,
    store: Store
): WorkflowStep<T> {
    const activate = (context: T) => {
        if (!store) throw new Error("'store' is required for `select` steps.");

        return store.select(selectorFactory(context)).pipe(
            take(1),
            flatMap(selected =>
                Array.isArray(selected) ? from(selected) : of(selected)
            )
        );
    };

    return { activate, label };
}

export function waitOn<T extends WorkflowContext = WorkflowContext>(
    label: string,
    waitingMessage: string,
    lengthyWork: (context: T) => Observable<RxEvent>
): WorkflowStep<T>;
export function waitOn<T extends WorkflowContext = WorkflowContext>(
    label: string,
    waitingMessageBuilder: (context: T) => string,
    lengthyWork: (context: T) => Observable<RxEvent>
): WorkflowStep<T>;
export function waitOn<T extends WorkflowContext = WorkflowContext>(
    label: string,
    messageOrBuilder: string | ((context: T) => string),
    lengthyWork: (context: T) => Observable<RxEvent>
): WorkflowStep<T> {
    const activate = (context: T) => {
        const waitingMessage = isString(messageOrBuilder)
            ? messageOrBuilder
            : messageOrBuilder(context);

        const busy$ = of(
            busy(context.workflowName, {
                message: waitingMessage,
            })
        );
        const idle$ = of(idle(context.workflowName));

        return concat(busy$, lengthyWork(context), idle$);
    };

    return { activate, label };
}
