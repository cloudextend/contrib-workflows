import { RxEvent } from "@cloudextend/contrib/events";
import { createSelectorFactory, defaultMemoize, Selector } from "@ngrx/store";
import { from, of } from "rxjs";
import { mergeMap, take } from "rxjs/operators";
import { WorkflowStepActivateHandler } from "..";
import { WorkflowContext } from "../workflow-context";
import { WorkflowStep } from "../workflow-step";

type EventSelector = Selector<object, RxEvent | RxEvent[]>;

export function select<S1, S2, T extends WorkflowContext = WorkflowContext>(
    label: string,
    eventSelector: EventSelector
): WorkflowStep<T>;

export function select<S1, S2, T extends WorkflowContext = WorkflowContext>(
    label: string,
    s1: Selector<object, S1>,
    handler: (s1: S1, context: T) => RxEvent | RxEvent[]
): WorkflowStep<T>;

export function select<S1, S2, T extends WorkflowContext = WorkflowContext>(
    label: string,
    s1: Selector<object, S1>,
    s2: Selector<object, S2>,
    handler: (s1: S1, s2: S2, context: T) => RxEvent | RxEvent[]
): WorkflowStep<T>;

export function select<S1, S2, S3, T extends WorkflowContext = WorkflowContext>(
    label: string,
    s1: Selector<object, S1>,
    s2: Selector<object, S2>,
    s3: Selector<object, S3>,
    handler: (s1: S1, s2: S3, context: T) => RxEvent | RxEvent[]
): WorkflowStep<T>;

export function select<
    S1,
    S2,
    S3,
    S4,
    T extends WorkflowContext = WorkflowContext
>(
    label: string,
    s1: Selector<object, S1>,
    s2: Selector<object, S2>,
    s3: Selector<object, S3>,
    s4: Selector<object, S4>,
    handler: (s1: S1, s2: S2, s3: S3, s4: S4, context: T) => RxEvent | RxEvent[]
): WorkflowStep<T>;

export function select<S1, T extends WorkflowContext = WorkflowContext>(
    label: string,
    ...fns: any[]
): WorkflowStep<T> {
    if (!fns?.length) throw "Provide at least one selector";

    const activate =
        fns.length > 1
            ? createProjectedActivator(fns)
            : createSelectOnlyActivator(fns[0] as EventSelector);

    return { activate, label };
}

function createSelectOnlyActivator<T extends WorkflowContext = WorkflowContext>(
    selector: EventSelector
): WorkflowStepActivateHandler<T> {
    return (context: T) =>
        context.store.select(selector).pipe(
            take(1),
            mergeMap(result =>
                Array.isArray(result) ? from(result) : of(result)
            )
        );
}

function createProjectedActivator<T extends WorkflowContext = WorkflowContext>(
    fns: any[]
): WorkflowStepActivateHandler<T> {
    const handler = fns[fns.length - 1];
    const projector = (...values: any[]) => values;
    const selectors = [...fns];
    selectors[fns.length - 1] = projector;

    return (context: T) => {
        const aggregateSelector =
            createSelectorFactory(defaultMemoize)(selectors);
        return context.store.select(aggregateSelector).pipe(
            take(1),
            mergeMap(value => {
                const results = handler(...value, context);
                return Array.isArray(results) ? from(results) : of(results);
            })
        );
    };
}
