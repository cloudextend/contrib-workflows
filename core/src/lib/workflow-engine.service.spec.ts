import { fakeAsync, flush, TestBed } from "@angular/core/testing";
import { provideMockActions } from "@ngrx/effects/testing";
import { Action, Store } from "@ngrx/store";
import { MockStore, provideMockStore } from "@ngrx/store/testing";
import { Observable, of } from "rxjs";

import { busy, isFault } from "@cloudextend/contrib/core";
import { getEventActionType, RxEvent } from "@cloudextend/contrib/events";
import { NavigationEvent } from "@cloudextend/contrib/routes";
import {
    callsTo,
    mockOf,
    provideMockLogService,
} from "@cloudextend/testing/utils";

import { getSetup } from "./test-utils.spec";
import { WorkflowEngine, WorkflowStepEvent } from "./workflow-engine.service";
import { WorkflowStepAction } from "./workflow-step-activators";
import { goto, nextStep, previousStep, skipSteps } from "./workflow.events";

describe("WorkflowEngine", () => {
    //#region Setup
    let service: WorkflowEngine;
    let store: Store;
    let actions$: Observable<Action>;

    let dispatchFn: jest.SpyInstance;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideMockLogService(),
                provideMockStore(),
                provideMockActions(() => actions$),
            ],
        });
        service = TestBed.inject(WorkflowEngine);
        store = TestBed.inject(MockStore);
        dispatchFn = jest.spyOn(store, "dispatch");
        // dispatchFn.mockImplementation(action => console.log(action));
    });
    //#endregion

    it("Can be created", () => {
        expect(service).toBeDefined();
    });

    describe("When no workflow is active", () => {
        //#region Setup
        const eventsAndTargetEffects: [
            RxEvent,
            (s: WorkflowEngine) => Observable<unknown>
        ][] = [
            [nextStep("UNIT TEST"), s => s.onNextStep$],
            [previousStep("UNIT TEST"), s => s.onPreviousStep$],
            [skipSteps("UNIT TEST", 1), s => s.onSkipSteps$],
        ];
        //#endregion
        eventsAndTargetEffects.forEach(([event, targetEffect]) => {
            it("navigates to /home when workflow nav event is dispatched", done => {
                actions$ = of(event);
                targetEffect(service).subscribe({
                    next: () => {
                        expect(dispatchFn).toHaveBeenCalledTimes(1);
                        const dispatchedEvent = callsTo(dispatchFn).mostRecent()
                            .args[0] as NavigationEvent;
                        expect(dispatchedEvent.pathSegments).toEqual(["home"]);
                        done();
                    },
                    error: done.fail,
                });
            });
        });

        it("throws an error if a named step is requested", done => {
            actions$ = of(goto("UTWF", "MyStep"));
            service.onGoTo$.subscribe({
                next: () => done.fail(),
                error: e => {
                    expect(isFault(e)).toBeTruthy();
                    done();
                },
            });
        });
    });

    describe("Given an active workflow", () => {
        //#region Setup Workflow

        function getExecutedWorkflow(
            stepTypes: string[],
            onCompletion: WorkflowStepAction
        ): ReturnType<typeof getSetup> & {
            workflowEvents$: Observable<WorkflowStepEvent>;
        };
        function getExecutedWorkflow(...stepTypes: string[]): ReturnType<
            typeof getSetup
        > & {
            workflowEvents$: Observable<WorkflowStepEvent>;
        };
        function getExecutedWorkflow(
            stepTypesOrFirstStep: string | string[],
            ...args: unknown[]
        ): ReturnType<typeof getSetup> & {
            workflowEvents$: Observable<WorkflowStepEvent>;
        } {
            const stepTypes = Array.isArray(stepTypesOrFirstStep)
                ? stepTypesOrFirstStep
                : [stepTypesOrFirstStep, ...(args as string[])];
            const onCompletion = Array.isArray(stepTypesOrFirstStep)
                ? (args[0] as WorkflowStepAction)
                : undefined;

            const setup = getSetup(stepTypes, onCompletion);
            const workflowEvents$ = service.executeWorkflow(setup.workflow);
            workflowEvents$.subscribe();
            return { ...setup, workflowEvents$ };
        }

        function getDispatchedEvent(): RxEvent | undefined {
            return callsTo(dispatchFn).mostRecent()?.args[0];
        }

        //#endregion

        it("executes the first step on start", () => {
            const { activations } = getExecutedWorkflow("exec", "exec");
            expect(activations[0]).toHaveBeenCalledTimes(1);
        });

        it("advances the steps automatically, when there's nothing to wait on", () => {
            const { activations } = getExecutedWorkflow("exec", "exec");
            expect(activations[1]).toHaveBeenCalledTimes(1);
        });

        it("goes to previous step if the step returns 'previousStep' event", done => {
            const { activations, workflow } = getSetup(["exec", "exec"]);
            let firstCall = true;
            activations[0].mockImplementation(() => {
                if (!firstCall) return skipSteps("UT", 1);

                firstCall = false;
                return nextStep("UT");
            });
            activations[1].mockImplementation(() => previousStep("UT"));

            service.executeWorkflow(workflow).subscribe({
                complete: () => {
                    expect(activations[0]).toHaveBeenCalledTimes(2);
                    expect(activations[1]).toHaveBeenCalledTimes(1);
                    done();
                },
                error: done.fail,
            });
        });

        it("goes to a speicif step mentiond in a goto return value", done => {
            const { activations, workflow } = getSetup([
                "exec",
                "exec",
                "exec",
            ]);
            activations[0].mockImplementation(() => goto("UT", "STEP_2"));

            service.executeWorkflow(workflow).subscribe({
                complete: () => {
                    expect(activations[0]).toHaveBeenCalledTimes(1);
                    expect(activations[1]).not.toHaveBeenCalled();
                    expect(activations[2]).toHaveBeenCalledTimes(1);
                    done();
                },
                error: done.fail,
            });
        });

        it("waits for an 'waitOn' step to complete", done => {
            const { activations, awaiters, workflowEvents$ } =
                getExecutedWorkflow("exec", "waitOn", "exec");

            expect(activations[1]).toBeCalledTimes(1);
            expect(activations[2]).not.toHaveBeenCalled();
            workflowEvents$.subscribe({
                complete: () => {
                    expect(activations[2]).toHaveBeenCalledTimes(1);
                    done();
                },
                error: done.fail,
            });
            awaiters[1].next(createTestEvent("E1"));
            awaiters[1].complete();
        });

        it("waitOn step can emit multiple events", fakeAsync(() => {
            const { activations, awaiters } = getExecutedWorkflow(
                "waitOn",
                "exec"
            );
            expect(dispatchFn).toHaveBeenCalledTimes(1);
            expect(getDispatchedEvent()?.verb).toEqual(busy.verb);
            dispatchFn.mockReset();

            awaiters[0].next(createTestEvent("E0-1"));
            flush();
            expect(activations[1]).not.toHaveBeenCalled();
            expect(dispatchFn).toHaveBeenCalledTimes(1);
            expect(getDispatchedEvent()?.verb).toEqual("E0-1");

            awaiters[0].next(createTestEvent("E0-2"));
            expect(getDispatchedEvent()?.verb).toEqual("E0-2");
            awaiters[0].next(createTestEvent("E0-3"));
            expect(getDispatchedEvent()?.verb).toEqual("E0-3");

            flush();
            expect(activations[1]).not.toHaveBeenCalled();

            awaiters[0].complete();
            expect(activations[1]).toHaveBeenCalled();
        }));

        it("can pass parameters between steps using context", () => {
            const { activations, workflow } = getSetup([
                "exec",
                "exec",
                "exec",
            ]);

            mockOf(activations[0]).mockImplementation(context => {
                context["unit_test_flag"] = "123456";
            });

            service.executeWorkflow(workflow);

            const context = callsTo(activations[2]).mostRecent().args[0];
            expect(context.unit_test_flag).toEqual("123456");
        });

        describe("when UI steps are present", () => {
            it("activates next step only on 'nexteStep'", () => {
                const { activations } = getExecutedWorkflow(
                    "exec",
                    "exec.view",
                    "exec"
                );
                expect(activations[0]).toHaveBeenCalledTimes(1);
                expect(activations[1]).toHaveBeenCalledTimes(1);
                expect(activations[2]).not.toHaveBeenCalled();

                activations.forEach(a => a.mockReset());

                actions$ = of(nextStep("UNIT TEST"));
                service.onNextStep$.subscribe();

                expect(activations[0]).not.toHaveBeenCalled();
                expect(activations[1]).not.toHaveBeenCalled();
                expect(activations[2]).toHaveBeenCalledTimes(1);
            });
        });

        describe("when navigation events are used", () => {
            it("can navigate to a named step", () => {
                const { activations } = getExecutedWorkflow(
                    "exec.view",
                    "exec.view",
                    "exec.view",
                    "exec.view"
                );

                expect(activations[0]).toHaveBeenCalledTimes(1);
                activations[0].mockClear();

                const go = (label: string) => goto("UNIT TEST", label);

                for (let i = 0; i < activations.length; i++) {
                    expect(activations[i]).not.toHaveBeenCalled();
                    actions$ = of(go("STEP_" + i));
                    service.onGoTo$.subscribe();
                    expect(activations[i]).toHaveBeenCalledTimes(1);
                }
            });

            it("will ignore goto's if told to, during executeWorkflow", () => {
                const { activations, workflow } = getSetup([
                    "exec.view",
                    "exec.view",
                    "exec.view",
                    "exec.view",
                ]);

                service
                    .executeWorkflow(workflow, { ignoreGotoLabel: true })
                    .subscribe();

                expect(activations[0]).toHaveBeenCalledTimes(1);
                activations[0].mockClear();

                const go = (label: string) => goto("UNIT TEST", label);

                expect(activations[2]).not.toHaveBeenCalled();
                actions$ = of(go("STEP_" + 2));
                service.onGoTo$.subscribe();
                expect(activations[2]).not.toHaveBeenCalled();
            });

            it("will throw a fault if an unknown step is request", done => {
                getExecutedWorkflow("exec.view");

                actions$ = of(goto("UTWF", "INVALID_STEP"));
                service.onGoTo$.subscribe({
                    next: () => done.fail(),
                    error: e => {
                        expect(isFault(e)).toBeTruthy();
                        done();
                    },
                });
            });

            it("won't go beyond the start of the workflow when skipping back", done => {
                const { activations } = getExecutedWorkflow(
                    "exec.view",
                    "exec"
                );
                activations[1].mockImplementation(() => skipSteps("UTWF", -5));

                actions$ = of(nextStep("UTWF")); // Move to second step
                service.onNextStep$.subscribe({
                    next: () => {
                        expect(activations[1]).toHaveBeenCalledTimes(1);
                        expect(activations[0]).toHaveBeenCalledTimes(2);
                        done();
                    },
                    error: done.fail,
                });
            });
        });

        describe("When a completion handler is given", () => {
            it("dispatches it at the end of the workflow", () => {
                const onCompletionFn = jest.fn(() =>
                    createTestEvent("COMPLETION")
                );
                const { awaiters } = getExecutedWorkflow(
                    ["waitOn"],
                    onCompletionFn
                );

                expect(onCompletionFn).not.toHaveBeenCalled();
                awaiters[0].next(createTestEvent("E0"));
                expect(onCompletionFn).not.toHaveBeenCalled();
                awaiters[0].complete();
                expect(onCompletionFn).toHaveBeenCalled();
            });

            it("can dispatch multiple events", fakeAsync(() => {
                const onCompletionFn = jest.fn(() => [
                    createTestEvent("C1"),
                    createTestEvent("C2"),
                    createTestEvent("C3"),
                ]);
                const { awaiters, workflowEvents$ } = getExecutedWorkflow(
                    ["waitOn"],
                    onCompletionFn
                );

                workflowEvents$.subscribe(stepEvent => {
                    if (stepEvent.stepIndex === 0) {
                        dispatchFn.mockReset();
                    }
                });

                awaiters[0].complete();
                flush();
                expect(dispatchFn).toHaveBeenCalledTimes(3);

                expect(callsTo(dispatchFn).argsOf(0).args[0].verb).toEqual(
                    "C1"
                );
                expect(callsTo(dispatchFn).argsOf(1).args[0].verb).toEqual(
                    "C2"
                );
                expect(callsTo(dispatchFn).argsOf(2).args[0].verb).toEqual(
                    "C3"
                );
            }));
        });
    });
});

export function createTestEvent(verb: string) {
    return {
        verb,
        source: "UNIT TEST",
        type: getEventActionType("UNIT TEST", verb),
    } as RxEvent;
}
