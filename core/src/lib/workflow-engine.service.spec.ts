import { fakeAsync, flush, TestBed } from "@angular/core/testing";
import { provideMockActions } from "@ngrx/effects/testing";
import { Action, Store } from "@ngrx/store";
import { MockStore, provideMockStore } from "@ngrx/store/testing";
import { Observable, of } from "rxjs";

import { RxEvent } from "@cloudextend/contrib/events";
import { NavigationEvent } from "@cloudextend/contrib/routing";

import { getSetup } from "./test-utils.spec";
import { WorkflowEngine } from "./workflow-engine.service";
import { WorkflowStepAction } from "./workflow-step-activators";
import {
    busy,
    goto,
    nextStep,
    previousStep,
    skipSteps,
} from "./workflow.events";
import { idle, WorkflowUpdate } from ".";

const mockOf = (mock: unknown) => mock as jest.Mock;

describe("WorkflowEngine", () => {
    //#region Setup
    let service: WorkflowEngine;
    let store: Store;
    let actions$: Observable<Action>;

    let dispatchFn: jest.SpyInstance;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideMockStore(), provideMockActions(() => actions$)],
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
                    error: done.fail,
                });
            });
        });

        it("throws an error if a named step is requested", done => {
            actions$ = of(goto("UTWF", "MyStep"));
            service.onGoTo$.subscribe({
                next: () => done.fail(),
                error: () => done(),
            });
        });
    });

    describe("Given an active workflow", () => {
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
            const { activations, awaiters, WorkflowChanges$ } =
                getExecutedWorkflow("exec", "waitOn", "exec");

            expect(activations[1]).toBeCalledTimes(1);
            expect(activations[2]).not.toHaveBeenCalled();
            WorkflowChanges$.subscribe({
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

        it("can wait for a specific event to be fired", fakeAsync(() => {
            const { activations } = getExecutedWorkflow(
                "exec",
                "waitFor",
                "exec"
            );

            expect(activations[0]).toHaveBeenCalledTimes(1);
            expect(activations[2]).not.toHaveBeenCalled();

            actions$ = of(createTestEvent("blocker1"));
            service.onBlockedUntil$.subscribe();
            flush();

            expect(activations[2]).toHaveBeenCalledTimes(1);
        }));

        it("can be put to busy state until a specific event is fired", fakeAsync(() => {
            const { activations } = getExecutedWorkflow(
                "exec",
                "waitFor.busy",
                "exec"
            );

            expect(activations[0]).toHaveBeenCalledTimes(1);
            expect(activations[2]).not.toHaveBeenCalled();

            expect(dispatchFn.mock.calls[0][0].verb).toBe("E0");
            expect(dispatchFn.mock.calls[1][0].verb).toBe(busy.verb);

            actions$ = of(createTestEvent("blocker1"));
            service.onBlockedUntil$.subscribe();
            flush();

            expect(dispatchFn.mock.calls[2][0].verb).toBe(idle.verb);
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

            const context = activations[2].mock.calls[0][0];
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

                // Prevent the warnning from being printed.
                const warn = console.warn;
                // eslint-disable-next-line @typescript-eslint/no-empty-function
                console.warn = () => {};

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

                console.warn = warn;
            });

            it("will throw a fault if an unknown step is request", done => {
                getExecutedWorkflow("exec.view");

                actions$ = of(goto("UTWF", "INVALID_STEP"));
                service.onGoTo$.subscribe({
                    next: () => done.fail(),
                    error: () => done(),
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
                const { awaiters, WorkflowChanges$ } = getExecutedWorkflow(
                    ["waitOn"],
                    onCompletionFn
                );

                WorkflowChanges$.subscribe(stepEvent => {
                    if (stepEvent.stepIndex === 0) {
                        dispatchFn.mockReset();
                    }
                });

                awaiters[0].complete();
                flush();
                expect(dispatchFn).toHaveBeenCalledTimes(3);

                expect(dispatchFn.mock.calls[0][0].verb).toEqual("C1");
                expect(dispatchFn.mock.calls[1][0].verb).toEqual("C2");
                expect(dispatchFn.mock.calls[2][0].verb).toEqual("C3");
            }));
        });
    });

    //#region Setup Workflow

    // This function creates a mock workflow with the given types of steps.
    // For example, getExecutedWorkflow(["select", "exec"]) returns a mocked workflow
    // that has select step first and then an exec step.
    // Look at the getSetup method implementaton for the composition of these mock setps.
    function getExecutedWorkflow(
        stepTypes: string[],
        onCompletion: WorkflowStepAction
    ): ReturnType<typeof getSetup> & {
        WorkflowChanges$: Observable<WorkflowUpdate>;
    };
    function getExecutedWorkflow(...stepTypes: string[]): ReturnType<
        typeof getSetup
    > & {
        WorkflowChanges$: Observable<WorkflowUpdate>;
    };
    function getExecutedWorkflow(
        stepTypesOrFirstStep: string | string[],
        ...args: unknown[]
    ): ReturnType<typeof getSetup> & {
        WorkflowChanges$: Observable<WorkflowUpdate>;
    } {
        const stepTypes = Array.isArray(stepTypesOrFirstStep)
            ? stepTypesOrFirstStep
            : [stepTypesOrFirstStep, ...(args as string[])];
        const onCompletion = Array.isArray(stepTypesOrFirstStep)
            ? (args[0] as WorkflowStepAction)
            : undefined;

        const setup = getSetup(stepTypes, onCompletion);
        const WorkflowChanges$ = service.executeWorkflow(setup.workflow);
        WorkflowChanges$.subscribe();
        return { ...setup, WorkflowChanges$ };
    }

    function getDispatchedEvent(): RxEvent | undefined {
        const calls = dispatchFn.mock.calls;
        return calls[calls.length - 1][0];
    }

    //#endregion
});

export function createTestEvent(verb: string) {
    return {
        verb,
        source: "UNIT TEST",
        type: `[UNIT TEST] ${verb}`,
    } as RxEvent;
}
