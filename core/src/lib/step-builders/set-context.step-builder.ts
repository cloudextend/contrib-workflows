import { RxEvent } from "@cloudextend/contrib/events";
import {
    createSelector,
    createSelectorFactory,
    defaultMemoize,
    Selector,
} from "@ngrx/store";
import { Observable, from, of } from "rxjs";
import { map, mergeMap, switchMap, take } from "rxjs/operators";
import { nextStep } from "..";
import { WorkflowContext } from "../workflow-context";
import { WorkflowStep } from "../workflow-step";

export function setContext<T extends WorkflowContext = WorkflowContext>(
    propertyName: keyof T,
    ...selectors: Parameters<typeof createSelector>
): WorkflowStep<T> {
    const activate = (context: T) => {
        const aggregateSelector =
            createSelectorFactory(defaultMemoize)(selectors);
        return context.store.select(aggregateSelector).pipe(
            take(1),
            map(value => {
                context[propertyName] = value;
                return nextStep(context.workflowName);
            })
        );
    };
    return { activate, label: "set " + propertyName };
}

export function calc<S1, S2, T extends WorkflowContext = WorkflowContext>(
    label: string,
    s1: Selector<object, S1>,
    handler: (context: T, s1: S1) => RxEvent | RxEvent[]
): WorkflowStep<T>;

export function calc<S1, S2, T extends WorkflowContext = WorkflowContext>(
    label: string,
    s1: Selector<object, S1>,
    s2: Selector<object, S2>,
    handler: (context: T, s1: S1, s2: S2) => RxEvent | RxEvent[]
): WorkflowStep<T>;

export function calc<S1, S2, S3, T extends WorkflowContext = WorkflowContext>(
    label: string,
    s1: Selector<object, S1>,
    s2: Selector<object, S2>,
    s3: Selector<object, S3>,
    handler: (context: T, s1: S1, s2: S3) => RxEvent | RxEvent[]
): WorkflowStep<T>;

export function calc<S1, T extends WorkflowContext = WorkflowContext>(
    label: string,
    ...fns: any[]
): WorkflowStep<T> {
    if (fns?.length < 2) throw "Provide at least one selector and a handler";

    const handler = fns[fns.length - 1];
    const projector = (...values: any[]) => values;
    const selectors = [...fns];
    selectors[fns.length - 1] = projector;

    const activate = (context: T) => {
        const aggregateSelector =
            createSelectorFactory(defaultMemoize)(selectors);
        return context.store.select(aggregateSelector).pipe(
            take(1),
            mergeMap(value => {
                const results = handler(context, ...value);
                return Array.isArray(results) ? from(results) : of(results);
            })
        );
    };

    return { activate, label };
}
