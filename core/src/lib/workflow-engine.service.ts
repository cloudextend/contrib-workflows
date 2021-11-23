import { Inject, Injectable, InjectionToken, Optional } from "@angular/core";
import { Actions, createEffect } from "@ngrx/effects";
import { Store } from "@ngrx/store";
import { Observable, Subject } from "rxjs";
import { map, takeWhile } from "rxjs/operators";

import { occurenceOf, onEvent } from "@cloudextend/contrib/events";
import { navigation } from "@cloudextend/contrib/routing";

import { Workflow } from "./workflow";
import { WorkflowContext } from "./workflow-context";
import { WorkflowStep } from "./workflow-step";
import { skipSteps, nextStep, previousStep, goto } from "./workflow.events";
import { WorkflowChange, WorkflowChangeType } from "./workflow-change";

export const CE_WF_FALLBACK_PATH = new InjectionToken("CloudExtend_Home_Path");

interface ExecutingWorkflow<T extends WorkflowContext = WorkflowContext> {
    context: T;
    nextStepIndex: number;
    stepIndexByLabel: Map<string, number>;
    ignoreGoTo?: boolean;
    workflow: Workflow<T>;
    workflowEvents$: Subject<WorkflowChange>;
}

@Injectable({ providedIn: "root" })
export class WorkflowEngine {
    constructor(
        private readonly actions$: Actions,
        private readonly store: Store,
        @Optional()
        @Inject(CE_WF_FALLBACK_PATH)
        fallbackPath: string
    ) {
        this.homePath = fallbackPath ?? "/";
    }

    private readonly homePath: string;

    onNextStep$ = createEffect(
        () =>
            this.actions$.pipe(
                onEvent(nextStep),
                map(() => {
                    this.gotoNextStep();
                    this.activateNextStep();
                })
            ),
        { dispatch: false }
    );

    onPreviousStep$ = createEffect(
        () =>
            this.actions$.pipe(
                onEvent(previousStep),
                map(() => {
                    this.gotoPreviousStep();
                    this.activateNextStep();
                })
            ),
        { dispatch: false }
    );

    onSkipSteps$ = createEffect(
        () =>
            this.actions$.pipe(
                onEvent(skipSteps),
                map(event => {
                    this.skipSteps(event.value);
                    this.activateNextStep();
                })
            ),
        { dispatch: false }
    );

    onGoTo$ = createEffect(
        () =>
            this.actions$.pipe(
                onEvent(goto),
                map(event => {
                    this.gotoLabeledStep(event.value);
                    this.activateNextStep();
                })
            ),
        { dispatch: false }
    );

    private current: ExecutingWorkflow | undefined;

    public executeWorkflow(
        workflow: Workflow,
        options?: { ignoreGotoLabel?: boolean }
    ): Observable<WorkflowChange> {
        const context = { workflowName: workflow.name, store: this.store };
        const stepIndexByLabel = options?.ignoreGotoLabel
            ? new Map<string, number>()
            : WorkflowEngine.createStepIndexByLabelMap(workflow.steps);

        const workflowEvents$ = new Subject<WorkflowChange>();
        this.current = {
            workflow,
            context,
            stepIndexByLabel,
            workflowEvents$,
            nextStepIndex: 0,
            ignoreGoTo: options?.ignoreGotoLabel,
        };

        workflowEvents$.next({
            type: WorkflowChangeType.beginWorkflow,
            workflowName: workflow.name,
        });
        this.activateNextStep();
        return workflowEvents$;
    }

    private activateNextStep(): void {
        const current = this.current;

        if (!current) {
            this.executeOnCompleteAction();
            return;
        } else if (current.nextStepIndex >= current.workflow.steps.length) {
            current.nextStepIndex = 0;
            this.executeOnCompleteAction();
            current.workflowEvents$.next({
                type: WorkflowChangeType.endWorkflow,
                workflowName: current.workflow.name,
            });
            current.workflowEvents$.complete();

            delete this.current;
            return;
        }

        if (current.nextStepIndex < 0) {
            current.nextStepIndex = 0;
        }

        const currentStepIndex = current.nextStepIndex;
        const currentStep = current.workflow.steps[currentStepIndex];

        current.workflowEvents$.next({
            type: WorkflowChangeType.beginStep,
            workflowName: current.workflow.name,
        });

        let autoforward = true;
        currentStep
            .activate(current.context)
            .pipe(takeWhile(() => currentStepIndex === current.nextStepIndex))
            .subscribe({
                next: event => {
                    if (occurenceOf(nextStep, event)) {
                        this.gotoNextStep();
                    } else if (occurenceOf(previousStep, event)) {
                        this.gotoPreviousStep();
                    } else if (occurenceOf(skipSteps, event)) {
                        this.skipSteps(
                            (event as ReturnType<typeof skipSteps>).value
                        );
                    } else if (occurenceOf(goto, event)) {
                        this.gotoLabeledStep(
                            (event as ReturnType<typeof goto>).value
                        );
                    } else if (occurenceOf(navigation, event)) {
                        this.store.dispatch(event);
                        autoforward = false;
                    } else {
                        this.store.dispatch(event);
                    }

                    current.workflowEvents$.next({
                        type: WorkflowChangeType.endStep,
                        stepIndex: currentStepIndex,
                        stepLabel: currentStep.label,
                        workflowName: current.workflow.name,
                    });
                },
                error: current.workflowEvents$.error,
                complete: () => {
                    if (autoforward) {
                        if (current.nextStepIndex === currentStepIndex) {
                            current.nextStepIndex++;
                        }
                        this.activateNextStep();
                    }
                },
            });
    }

    private executeOnCompleteAction(): void {
        if (this.current?.workflow.onCompletion) {
            const context = this.current.context;
            const completionEvents =
                this.current.workflow.onCompletion(context);

            if (Array.isArray(completionEvents)) {
                completionEvents.forEach(this.store.dispatch);
            } else {
                this.store.dispatch(completionEvents);
            }
        } else {
            this.store.dispatch(
                navigation("#workflows/engine", {
                    pathSegments: [this.homePath],
                })
            );
        }
    }

    private skipSteps(skips: number) {
        if (!this.current) return -1;

        this.current.nextStepIndex += 1 + skips;
        return this.current.nextStepIndex;
    }

    private gotoLabeledStep(label: string) {
        if (!this.current) {
            throw new Error(
                `There is no active workflow. Cannot go to step ${label}`
            );
        }

        if (this.current.ignoreGoTo) {
            console.warn(
                `Unable to navigate to '${label}' step.` +
                    "'ignoreGotoLabel' has been specified when " +
                    "calling 'executeWorkflow'."
            );
            return;
        }

        const stepIndex = this.current.stepIndexByLabel.get(label);

        if (typeof stepIndex === "undefined") {
            throw new Error(`Attempted to go to an unknown step '${label}'.`);
        }

        return (this.current.nextStepIndex = stepIndex);
    }

    private gotoPreviousStep() {
        if (!this.current) return -1;

        this.current.nextStepIndex--;
        return this.current.nextStepIndex;
    }

    private gotoNextStep() {
        if (!this.current) return -1;

        this.current.nextStepIndex++;
        return this.current.nextStepIndex;
    }

    private static createStepIndexByLabelMap<
        T extends WorkflowContext = WorkflowContext
    >(workflowSteps: WorkflowStep<T>[]): Map<string, number> {
        const stepIndexMap = new Map<string, number>();
        workflowSteps.forEach((step, index) =>
            stepIndexMap.set(step.label, index)
        );

        return stepIndexMap;
    }
}
