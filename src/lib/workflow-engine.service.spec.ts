import { fakeAsync, flush, TestBed } from "@angular/core/testing";
import { provideMockActions } from "@ngrx/effects/testing";
import { Action, Store } from "@ngrx/store";
import { MockStore, provideMockStore } from "@ngrx/store/testing";
import { Observable, of } from "rxjs";

import { args, declareEvent, RxEvent } from "@cloudextend/contrib/events";
import { NavigationEvent } from "@cloudextend/contrib/routing";

import { getSetup } from "./test-wf.spec.utils";
import { createBasicEvent, createTestEvent } from "./test-events.spec.utils";
import { WorkflowEngine } from "./workflow-engine.service";
import {
    busy,
    contextUpdated,
    goto,
    nextStep,
    previousStep,
    skipSteps,
} from "./workflow.events";
import { idle } from "./workflow.events";
import { WorkflowUpdate } from "./workflow-update";
import { Workflow } from "./workflow";
import { exec, load, select } from "./step-builders";
import { WorkflowUpdateType } from "./workflow-update";
import { InjectionToken } from "@angular/core";
import { callsTo } from "@cloudextend/testing/utils";
import { finalize } from "rxjs/operators";
import { TestScheduler } from "rxjs/testing";

const mockOf = (mock: unknown) => mock as jest.Mock;
const TESTTOKEN = new InjectionToken<{ a: string; b: number }>("TestToken");

describe("WorkflowEngine", () => {
    //#region Setup
    let service: WorkflowEngine;
    let store: Store;
    let actions$: Observable<Action>;

    let dispatchFn: jest.SpyInstance;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideMockStore(),
                provideMockActions(() => actions$),
                { provide: TESTTOKEN, useValue: Symbol("InjToken") },
            ],
            teardown: { destroyAfterEach: false },
        });
        service = TestBed.inject(WorkflowEngine);
        store = TestBed.inject(MockStore);
        dispatchFn = jest.spyOn(store, "dispatch");
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
            it("navigates to '/' when workflow nav event is dispatched", done => {
                actions$ = of(event);
                targetEffect(service).subscribe({
                    next: () => {
                        expect(dispatchFn).toHaveBeenCalledTimes(1);
                        const dispatchedEvent = dispatchFn.mock
                            .calls[0][0] as NavigationEvent;
                        expect(dispatchedEvent.pathSegments).toEqual(["/"]);
                        done();
                    },
                    error: done,
                });
            });
        });

        it("throws an error if a named step is requested", done => {
            actions$ = of(goto("UTWF", "MyStep"));
            service.onGoTo$.subscribe({
                next: () => done("Execution of this line was unexpected"),
                error: () => done(),
            });
        });
    });

    describe("Given an active workflow", () => {
        it("executes the first step on start", done => {
            afterExecutingWorkflow(["exec", "exec"]).subscribe({
                next: ({ activations }) => {
                    expect(activations[0]).toHaveBeenCalledTimes(1);
                    done();
                },
                error: done,
            });
        });

        it("will include the initial context values given by the client", done => {
            const { activations, workflow } = getSetup(["exec", "exec"]);
            service
                .executeWorkflow(workflow, { someProp: "12345" })
                .pipe(
                    finalize(() => {
                        expect(
                            callsTo(activations[0]).first().args[0].someProp
                        ).toEqual("12345");
                        expect(
                            callsTo(activations[1]).first().args[0].someProp
                        ).toEqual("12345");
                    })
                )
                .subscribe({
                    complete: done,
                    error: done,
                });
        });

        it("advances the steps automatically, when there's nothing to wait on", done => {
            afterExecutingWorkflow(["exec", "exec"]).subscribe({
                next: ({ activations }) => {
                    expect(activations[1]).toHaveBeenCalledTimes(1);
                    done();
                },
                error: done,
            });
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
                error: done,
            });
        });

        it("goes to a specific step mentiond in a goto return value", done => {
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
                error: done,
            });
        });

        it("waits for an load step to complete", fakeAsync(() => {
            const { workflow, activations, awaiters } = getSetup([
                "exec",
                "load",
                "exec",
            ]);

            service.executeWorkflow(workflow);
            flush();

            expect(activations[1]).toBeCalledTimes(1);
            expect(activations[2]).not.toHaveBeenCalled();

            awaiters[1].next(createTestEvent("E1"));
            awaiters[1].complete();
            flush();

            expect(activations[2]).toHaveBeenCalledTimes(1);
        }));

        it("load step can emit multiple events", fakeAsync(() => {
            const { activations, awaiters } = getExecutedWorkflow([
                "load",
                "exec",
            ]);
            flush();

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

        it("can wait for a specific event to be fired", fakeAsync(() => {
            const { activations } = getExecutedWorkflow([
                "exec",
                "waitFor",
                "exec",
            ]);
            flush();

            expect(activations[0]).toHaveBeenCalledTimes(1);
            expect(activations[2]).not.toHaveBeenCalled();

            actions$ = of(createTestEvent("blocker1"));
            service.onBlockedUntil$.subscribe();
            flush();

            expect(activations[2]).toHaveBeenCalledTimes(1);
        }));

        it("can be put to busy state until a specific event is fired", fakeAsync(() => {
            const { activations } = getExecutedWorkflow([
                "exec",
                "waitFor.busy",
                "exec",
            ]);
            flush();

            expect(activations[0]).toHaveBeenCalledTimes(1);
            expect(activations[2]).not.toHaveBeenCalled();

            expect(dispatchFn.mock.calls[0][0].verb).toBe("E0");
            expect(dispatchFn.mock.calls[1][0].verb).toBe(busy.verb);

            actions$ = of(createTestEvent("blocker1"));
            service.onBlockedUntil$.subscribe();
            flush();

            expect(dispatchFn.mock.calls[2][0].verb).toBe(idle.verb);
        }));

        it("can pass parameters between steps using context", fakeAsync(() => {
            const { activations, workflow } = getSetup([
                "exec",
                "exec",
                "exec",
            ]);

            mockOf(activations[0]).mockImplementation(context => {
                context["unit_test_flag"] = "123456";
            });

            service.executeWorkflow(workflow);
            flush();

            const context = activations[2].mock.calls[0][0];
            expect(context.unit_test_flag).toEqual("123456");
        }));

        describe("when UI steps are present", () => {
            it("activates next step only on 'nexteStep'", fakeAsync(() => {
                const { activations } = getExecutedWorkflow([
                    "exec",
                    "exec.view",
                    "exec",
                ]);
                flush();

                expect(activations[0]).toHaveBeenCalledTimes(1);
                expect(activations[1]).toHaveBeenCalledTimes(1);
                expect(activations[2]).not.toHaveBeenCalled();

                activations.forEach(a => a.mockReset());

                actions$ = of(nextStep("UNIT TEST"));
                service.onNextStep$.subscribe();

                expect(activations[0]).not.toHaveBeenCalled();
                expect(activations[1]).not.toHaveBeenCalled();
                expect(activations[2]).toHaveBeenCalledTimes(1);
            }));
        });

        describe("when navigation events are used", () => {
            it("can navigate to a named step", fakeAsync(() => {
                const { activations } = getExecutedWorkflow([
                    "exec.view",
                    "exec.view",
                    "exec.view",
                    "exec.view",
                ]);
                flush();

                expect(activations[0]).toHaveBeenCalledTimes(1);
                activations[0].mockClear();

                const go = (label: string) => goto("UNIT TEST", label);

                for (let i = 0; i < activations.length; i++) {
                    expect(activations[i]).not.toHaveBeenCalled();
                    actions$ = of(go("STEP_" + i));
                    service.onGoTo$.subscribe();
                    expect(activations[i]).toHaveBeenCalledTimes(1);
                }
            }));

            it("will ignore gotos if workflow.doNotIndex is true", fakeAsync(() => {
                const { activations, workflow } = getSetup(
                    ["exec.view", "exec.view", "exec.view", "exec.view"],
                    { doNotIndex: true }
                );

                // Prevent the warnning from being printed.
                const warn = console.warn;
                // eslint-disable-next-line @typescript-eslint/no-empty-function
                console.warn = () => {};

                service.executeWorkflow(workflow);
                flush();

                expect(activations[0]).toHaveBeenCalledTimes(1);
                activations[0].mockClear();

                const go = (label: string) => goto("UNIT TEST", label);

                expect(activations[2]).not.toHaveBeenCalled();
                actions$ = of(go("STEP_" + 2));
                service.onGoTo$.subscribe({
                    complete: () => expect(true).toBeFalsy(), // an exception was expected
                    error: (err: Error) =>
                        expect(err.message).toContain("disabled indexing"),
                });
                flush();

                expect(activations[2]).not.toHaveBeenCalled();

                console.warn = warn;
            }));

            it("will throw a fault if an unknown step is request", done => {
                actions$ = of(goto("UTWF", "INVALID_STEP"));
                getExecutedWorkflow(["exec.view"]);

                service.onGoTo$.subscribe({
                    next: () => done("Execution of this line was unexpected"),
                    error: () => done(),
                });
            });

            it("wont go beyond the start of the workflow when skipping back", fakeAsync(() => {
                const { activations } = getExecutedWorkflow([
                    "exec.view",
                    "exec",
                ]);
                activations[1].mockImplementation(() => skipSteps("UTWF", -5));
                flush();

                actions$ = of(nextStep("UTWF")); // Move to second step
                service.onNextStep$.subscribe({
                    next: () => {
                        expect(activations[1]).toHaveBeenCalledTimes(1);
                        expect(activations[0]).toHaveBeenCalledTimes(2);
                    },
                });
                flush();
            }));
        });

        describe("When onCompletion handler is provided", () => {
            it("dispatches it at the end of the workflow", fakeAsync(() => {
                const onCompletionFn = jest.fn(() =>
                    createTestEvent("COMPLETION")
                );
                const { awaiters } = getExecutedWorkflow(["load"], {
                    onCompletion: onCompletionFn,
                    isBackgroundWorkflow: true,
                });
                flush();

                expect(onCompletionFn).not.toHaveBeenCalled();
                awaiters[0].next(createTestEvent("E0"));
                expect(onCompletionFn).not.toHaveBeenCalled();
                awaiters[0].complete();
                expect(onCompletionFn).toHaveBeenCalled();
            }));

            it("can dispatch multiple events", done => {
                const onCompletionFn = jest.fn(() => [
                    createTestEvent("C1"),
                    createTestEvent("C2"),
                    createTestEvent("C3"),
                ]);
                const { awaiters, workflowChanges$: WorkflowChanges$ } =
                    getExecutedWorkflow(["load"], {
                        onCompletion: onCompletionFn,
                        isBackgroundWorkflow: true,
                    });

                WorkflowChanges$.subscribe({
                    next: update => {
                        if (
                            update.stepIndex === 0 &&
                            update.type === WorkflowUpdateType.endStep
                        ) {
                            dispatchFn.mockReset();
                        }
                    },
                    error: done,
                    complete: () => {
                        expect(dispatchFn).toHaveBeenCalledTimes(3);

                        expect(dispatchFn.mock.calls[0][0].verb).toEqual("C1");
                        expect(dispatchFn.mock.calls[1][0].verb).toEqual("C2");
                        expect(dispatchFn.mock.calls[2][0].verb).toEqual("C3");
                    },
                }).add(done);

                awaiters[0].complete();
            });
        });

        describe("when contextUpdated is raised", () => {
            it("will update the context from a select step", done => {
                const step = select("testSelect", () =>
                    contextUpdated("UT", {
                        update: { a: "A", b: "B" },
                    })
                );
                const wf = { steps: [step] } as Workflow;

                let expectationMet = false;

                service.executeWorkflow(wf).subscribe({
                    error: done,
                    next: wfUpdate => {
                        if (
                            wfUpdate.type === WorkflowUpdateType.endStep &&
                            wfUpdate.stepLabel === "testSelect"
                        ) {
                            expect(wfUpdate.context["a"]).toEqual("A");
                            expect(wfUpdate.context["b"]).toEqual("B");
                            expectationMet = true;
                        }
                    },
                    complete: () => {
                        expect(expectationMet).toBeTruthy();
                        done();
                    },
                });
            });
        });

        //#region Setup Workflow

        // This function creates a mock workflow with the given types of steps.
        // For example, getExecutedWorkflow(["select", "exec"]) returns a mocked workflow
        // that has select step first and then an exec step.
        // Look at the getSetup method implementaton for the composition of these mock setps.
        function getExecutedWorkflow(
            stepTypes: string[],
            wfConfig?: Partial<Workflow>
        ): ReturnType<typeof getSetup> & {
            workflowChanges$: Observable<WorkflowUpdate>;
        } {
            const setup = getSetup(stepTypes, wfConfig);
            const workflowChanges$ = service.executeWorkflow(setup.workflow);
            return { ...setup, workflowChanges$ };
        }

        function getDispatchedEvent(): RxEvent | undefined {
            const calls = dispatchFn.mock.calls;
            return calls[calls.length - 1][0];
        }

        function afterExecutingWorkflow(
            stepTypes: string[],
            wfConfig?: Partial<Workflow>
        ): Observable<ReturnType<typeof getSetup>> {
            const { workflowChanges$, ...setup } = getExecutedWorkflow(
                stepTypes,
                wfConfig
            );

            return new Observable(subscriber =>
                workflowChanges$.subscribe({
                    complete: () => subscriber.next(setup),
                    error: subscriber.error,
                })
            );
        }

        //#endregion
    });

    describe("Given steps have dependencies", () => {
        it("can inject those dependenies to the step", done => {
            let wasExecTested = false;
            let wasLoadTested = false;

            const realToken = TestBed.inject(TESTTOKEN);

            const steps = [
                exec(
                    "execStep",
                    token => {
                        expect(token).toBe(realToken);
                        wasExecTested = true;
                        return createBasicEvent("UT", "Exec");
                    },
                    [TESTTOKEN]
                ),
                load(
                    "loadStep",
                    token => {
                        expect(token).toBe(realToken);
                        wasLoadTested = true;
                        return of(createBasicEvent("UT", "Load"));
                    },
                    [TESTTOKEN]
                ),
            ];

            service
                .executeWorkflow({
                    steps,
                    name: "Test WF",
                })
                .subscribe({
                    complete: () => {
                        expect(wasExecTested).toBeTruthy();
                        expect(wasLoadTested).toBeTruthy();
                        done();
                    },
                    error: done,
                });
        });
    });

    describe("Given a Workflow trigger", () => {
        const trigger = declareEvent(
            "UT_Trigger",
            args<{ triggerArgs: string }>()
        );

        const triggered = trigger("UT", { triggerArgs: "ut-value" });

        let wfBuilder: jest.Mock;

        beforeEach(() => {
            const { workflow } = getSetup(["exec"]);
            wfBuilder = jest.fn(() => workflow);

            service.registerWorkflow(trigger, wfBuilder);
        });

        it("executes the workflow on trigger", done => {
            const execWorkflowFn = jest.spyOn(service, "executeWorkflow");
            actions$ = of(triggered);

            service.onWorkflowTrigger$.subscribe(() => {
                expect(wfBuilder).toHaveBeenCalledTimes(1);
                expect(execWorkflowFn).toHaveBeenCalledTimes(1);
                done();
            });
        });

        it("passes the event to the workflow builder", done => {
            actions$ = of(triggered);

            service.onWorkflowTrigger$.subscribe(() => {
                expect(wfBuilder).toHaveBeenCalledWith(triggered);
                done();
            });
        });
    });

    const testScheduler = new TestScheduler((actual, expected) =>
        expect(actual).toEqual(expected)
    );
});
