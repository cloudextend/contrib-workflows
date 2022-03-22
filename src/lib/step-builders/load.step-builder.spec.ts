import { TestBed } from "@angular/core/testing";
import { Store } from "@ngrx/store";
import { provideMockStore } from "@ngrx/store/testing";
import { Observable, of } from "rxjs";
import { filter } from "rxjs/operators";
import { TestScheduler } from "rxjs/testing";

import { occurenceOf } from "@cloudextend/contrib/events";

import { WorkflowContext } from "../workflow-context";
import { load } from "./load.step-builder";
import { busy, idle } from "../workflow.events";
import { createBasicEvent } from "../test-events.spec.utils";
import { Router } from "@angular/router";
import { InjectionToken } from "@angular/core";
import { setPriority } from "node:os";

describe("'load' Step Builders", () => {
    const TEST_DEP = new InjectionToken<string>("Test Dependency");
    const dependencyValue = "TEST123";

    let store: Store;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideMockStore(),
                { provide: TEST_DEP, useValue: dependencyValue },
            ],
            teardown: { destroyAfterEach: false },
        });
        store = TestBed.inject(Store);
    });

    describe("in a background workflow", () => {
        it("does not enter busy state", () => {
            const workEvent = createBasicEvent("UT", "Actual Work");
            const workEvent$ = of(workEvent);

            const expectedEvents = { a: workEvent };
            const expectedMarbles = "(a|)";

            const step = load("Lengthy Step", () => workEvent$);
            const context = createTestWorkflowContext(true);

            testScheduler.run(({ expectObservable }) => {
                expectObservable(step.activate(context)).toBe(
                    expectedMarbles,
                    expectedEvents
                );
            });
        });
    });

    describe("in a foreground workflow", () => {
        it("enters and exits busy state while executing the step", () => {
            const busyEvent = busy("UT", { message: "Loading..." });
            const workEvent = createBasicEvent("UT", "Actual Work");
            const workEvent$ = of(workEvent);
            const idleEvent = idle("UT");

            const expectedEvents = { a: busyEvent, b: workEvent, c: idleEvent };
            const expectedMarbles = "(abc|)";

            const step = load("Lengthy Step", () => workEvent$);
            const context = createTestWorkflowContext();

            testScheduler.run(({ expectObservable }) => {
                expectObservable(step.activate(context)).toBe(
                    expectedMarbles,
                    expectedEvents
                );
            });
        });

        it("can provide an alternate loading message at creation time", () => {
            const busyEvent = busy("UT", { message: "Custom Loading..." });
            const workEvent = createBasicEvent("UT", "Actual Work");
            const workEvent$ = of(workEvent);
            const idleEvent = idle("UT");

            const expectedEvents = { a: busyEvent, b: workEvent, c: idleEvent };
            const expectedMarbles = "(abc|)";

            const step = load("Lengthy Step", () => workEvent$, {
                loadingMessage: "Custom Loading...",
            });
            const context = createTestWorkflowContext();

            testScheduler.run(({ expectObservable }) => {
                expectObservable(step.activate(context)).toBe(
                    expectedMarbles,
                    expectedEvents
                );
            });
        });

        it("can build the loading message using dependencies", () => {
            const busyEvent = busy("UT", {
                message: `Value was ${dependencyValue}`,
            });
            const workEvent = createBasicEvent("UT", "Actual Work");
            const workEvent$ = of(workEvent);
            const idleEvent = idle("UT");

            const step = load(
                "testDeps",
                _ => workEvent$,
                [TEST_DEP],
                dep => ({ loadingMessage: `Value was ${dep}` })
            );

            const expectedEvents = { a: busyEvent, b: workEvent, c: idleEvent };
            const expectedMarbles = "(abc|)";

            const context = createTestWorkflowContext();

            testScheduler.run(({ expectObservable }) => {
                expectObservable(step.activate(context, dependencyValue)).toBe(
                    expectedMarbles,
                    expectedEvents
                );
            });
        });

        it("can provide an alternate loading message during execution...", () => {
            const initialBusyEvent = busy("UT", { message: "Loading..." });
            const customBusyEvent = busy("UT", {
                message: "I'm donig something...",
            });
            const workEvent = createBasicEvent("UT", "Actual Work");
            const idleEvent = idle("UT");

            const expectedEvents = {
                a: initialBusyEvent,
                b: customBusyEvent,
                c: workEvent,
                d: idleEvent,
            };
            const expectedMarbles = "(abcd|)";

            const step = load(
                "Lengthy Step",
                () =>
                    new Observable(subscriber => {
                        subscriber.next(customBusyEvent);
                        subscriber.next(workEvent);
                        subscriber.complete();
                    })
            );
            const context = createTestWorkflowContext();

            testScheduler.run(({ expectObservable }) => {
                expectObservable(step.activate(context)).toBe(
                    expectedMarbles,
                    expectedEvents
                );
            });
        });

        it("will store the dependency array with the generated step", () => {
            const step = load(
                "testDeps",
                router => {
                    // These line won't execute (as we are not actually activating the step).
                    // They're there onluy to ensure that the compipler picked up the type properly
                    expect(router).not.toBeFalsy();
                    expect(router.navigate).toBeDefined();
                    return of(createBasicEvent("UT", "aa"));
                },
                [Router]
            );
            expect(step.dependencies).toEqual([Router]);
        });
    });

    const testScheduler = new TestScheduler((actual, expected) =>
        expect(actual).toEqual(expected)
    );

    function createTestWorkflowContext(
        isBackgroundWorkflow?: boolean
    ): WorkflowContext {
        return {
            isBackgroundWorkflow,
            store,
            workflowName: "UT",
            inject: TestBed.inject,
        };
    }
});
