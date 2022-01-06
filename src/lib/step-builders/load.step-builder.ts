import { ProviderToken } from "@angular/core";
import { RxEvent } from "@cloudextend/contrib/events";
import { concat, Observable, of } from "rxjs";

import { WorkflowContext } from "../workflow-context";
import { WorkflowStep } from "../workflow-step";
import { busy, idle } from "../workflow.events";

export interface LoadStepOptions {
  loadingMessage?: string;
  isBackgroundStep?: boolean;
}

export function load<T extends WorkflowContext = WorkflowContext>(
  label: string,
  lengthyWork: (context: T) => Observable<RxEvent>,
  options?: LoadStepOptions
): WorkflowStep<T>;

export function load<D1, T extends WorkflowContext = WorkflowContext>(
  label: string,
  lengthyWork: (context: T, d1: D1) => Observable<RxEvent>,
  dependencies: [d1: ProviderToken<D1>],
  options?: LoadStepOptions
): WorkflowStep<T>;

export function load<D1, D2, T extends WorkflowContext = WorkflowContext>(
  label: string,
  lengthyWork: (context: T, d1: D1, d2: D2) => Observable<RxEvent>,
  dependencies: [d1: ProviderToken<D1>, d2: ProviderToken<D2>],
  options?: LoadStepOptions
): WorkflowStep<T>;

export function load<D1, D2, D3, T extends WorkflowContext = WorkflowContext>(
  label: string,
  lengthyWork: (context: T, d1: D1, d2: D2, d3: D3) => Observable<RxEvent>,
  dependencies: [
    d1: ProviderToken<D1>,
    d2: ProviderToken<D2>,
    d3: ProviderToken<D3>
  ],
  options?: LoadStepOptions
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
    context: T,
    d1: D1,
    d2: D2,
    d3: D3,
    d4: D4
  ) => Observable<RxEvent>,
  dependencies: [
    d1: ProviderToken<D1>,
    d2: ProviderToken<D2>,
    d3: ProviderToken<D3>,
    d4: ProviderToken<D4>
  ],
  options?: LoadStepOptions
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
    context: T,
    d1: D1,
    d2: D2,
    d3: D3,
    d4: D4,
    d5: D5
  ) => Observable<RxEvent>,
  dependencies: [
    d1: ProviderToken<D1>,
    d2: ProviderToken<D2>,
    d3: ProviderToken<D3>,
    d4: ProviderToken<D4>,
    d5: ProviderToken<D5>
  ],
  options?: LoadStepOptions
): WorkflowStep<T>;

export function load<T extends WorkflowContext = WorkflowContext>(
  label: string,
  lengthyWork: (context: T, ...dpes: any[]) => Observable<RxEvent>,
  dependenciesOrOptions?: any[] | LoadStepOptions,
  loaderOptions?: LoadStepOptions
): WorkflowStep<T> {
  let [dependencies, options] = Array.isArray(dependenciesOrOptions)
    ? [dependenciesOrOptions, loaderOptions]
    : [undefined, dependenciesOrOptions];

  const activate = (context: T, ...d: any[]) => {
    if (context.isBackgroundWorkflow || options?.isBackgroundStep) {
      return lengthyWork(context, ...d);
    }

    const busy$ = of(
      busy(context.workflowName, {
        message: options?.loadingMessage ?? "Loading...",
      })
    );
    const idle$ = of(idle(context.workflowName));

    return concat(busy$, lengthyWork(context, ...d), idle$);
  };

  return { activate, dependencies, label };
}
