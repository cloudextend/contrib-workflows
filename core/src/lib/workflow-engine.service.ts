import { Injectable } from "@angular/core";
import { Actions, createEffect } from "@ngrx/effects";
import { Store } from "@ngrx/store";
import { Observable, Subject } from "rxjs";
import { map, takeWhile } from "rxjs/operators";

import { fault, Logger, LogService } from "@cloudextend/common/core";
import { occurenceOf, onEvent } from "@cloudextend/common/events";
import { navigate } from "@cloudextend/common/routes";
import { views } from "@cloudextend/common/state";

import { Workflow } from "./workflow";
import { WorkflowContext } from "./workflow-context";
import { WorkflowStep } from "./workflow-step";
import { skipSteps, nextStep, previousStep, goto } from "./workflow.events";

export interface WorkflowStepEvent {
    stepLabel: string;
    stepIndex: number;
}

interface ExecutingWorkflow<T extends WorkflowContext = WorkflowContext> {
    context: T;
    nextStepIndex: number;
    stepIndexByLabel: Map<string, number>;
    ignoreGoTo?: boolean;
    workflow: Workflow<T>;
    workflowEvents$: Subject<WorkflowStepEvent>;
}

@Injectable({ providedIn: "root" })
export class WorkflowEngine {
    constructor(
        private readonly actions$: Actions,
        private readonly store: Store,
        private readonly logSvc: LogService
    ) {
        this.logger = logSvc.createLogger("WorkflowEngine");
    }

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

    private readonly logger: Logger;

    public executeWorkflow(
        workflow: Workflow,
        options?: { ignoreGotoLabel?: boolean }
    ): Observable<WorkflowStepEvent> {
        const context = {
            workflowName: workflow.name,
            logger: this.logSvc.createLogger(workflow.name),
        };
        const stepIndexByLabel = options?.ignoreGotoLabel
            ? new Map<string, number>()
            : WorkflowEngine.createStepIndexByLabelMap(workflow.steps);

        const workflowEvents$ = new Subject<WorkflowStepEvent>();
        this.current = {
            workflow,
            context,
            stepIndexByLabel,
            workflowEvents$,
            nextStepIndex: 0,
            ignoreGoTo: options?.ignoreGotoLabel,
        };

        this.logger.debug("Starting workflow %s", this.current.workflow.name);
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
            current.workflowEvents$.complete();
            this.logger.debug("%s was completed.", current.workflow.name);

            delete this.current;
            return;
        }

        if (current.nextStepIndex < 0) {
            current.nextStepIndex = 0;
        }

        const currentStepIndex = current.nextStepIndex;
        const currentStep = current.workflow.steps[currentStepIndex];

        this.logger.debug(
            "Executing step %s: %s...",
            currentStepIndex,
            currentStep.label
        );

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
                    } else if (occurenceOf(navigate, event)) {
                        this.store.dispatch(event);
                        autoforward = false;
                    } else {
                        this.store.dispatch(event);
                    }

                    current.workflowEvents$.next({
                        stepIndex: currentStepIndex,
                        stepLabel: currentStep.label,
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

    private executeOnCompleteAction() {
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
            this.store.dispatch(views.home("#workflowEngine"));
        }
    }

    private skipSteps(skips: number) {
        if (!this.current) return -1;

        this.logger.debug("Skip %s steps...", skips);
        this.current.nextStepIndex += 1 + skips;
        return this.current.nextStepIndex;
    }

    private gotoLabeledStep(label: string) {
        if (!this.current) {
            throw fault(
                `There is no active workflow. Cannot go to step ${label}`
            );
        }

        if (this.current.ignoreGoTo) {
            this.logger.warn(
                `Unable to navigate to '${label}' step.` +
                    "'ignoreGotoLabel' may have been specified when " +
                    "calling 'executeWorkflow'."
            );
            return;
        }

        const stepIndex = this.current.stepIndexByLabel.get(label);

        if (typeof stepIndex === "undefined") {
            throw fault(`Attempted to go to an unknown step '${label}'.`);
        }

        return (this.current.nextStepIndex = stepIndex);
    }

    private gotoPreviousStep() {
        if (!this.current) return -1;

        this.logger.debug("Returning to previous step...");
        this.current.nextStepIndex--;
        return this.current.nextStepIndex;
    }

    private gotoNextStep() {
        if (!this.current) return -1;

        this.logger.debug("Begining next step...");
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
