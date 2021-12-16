import { Selector } from "@ngrx/store";

import { RxEvent } from "@cloudextend/contrib/events";

import { WorkflowContext } from "./workflow-context";

export type WorkflowStepAction<
    ContextType extends WorkflowContext = WorkflowContext
> = (context: ContextType) => RxEvent | RxEvent[];

// eslint-disable-next-line @typescript-eslint/ban-types
export type NonMemoizedStepSelector = (state: object) => RxEvent | RxEvent[];
export type WorkflowStepSelector =
    | Selector<object, RxEvent | RxEvent[]>
    | NonMemoizedStepSelector;

export type WorkflowStepSelectorFactory<
    ContextType extends WorkflowContext = WorkflowContext
> = (context: ContextType) => WorkflowStepSelector;
