import { RxEvent } from "@cloudextend/contrib/events";
import { from, of, Observable } from "rxjs";
import { take, mergeMap } from "rxjs/operators";
import { WorkflowContext } from "../workflow-context";
import { WorkflowStep } from "../workflow-step";
import { WorkflowStepSelectorFactory } from "../workflow-step-activators";

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
