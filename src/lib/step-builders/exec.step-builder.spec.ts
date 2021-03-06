import { TestBed } from "@angular/core/testing";
import { Router } from "@angular/router";
import { Store } from "@ngrx/store";
import { provideMockStore } from "@ngrx/store/testing";
import { TestScheduler } from "rxjs/testing";

import { createBasicEvent } from "../test-events.spec.utils";
import { WorkflowContext } from "../workflow-context";
import { nextStep } from "../workflow.events";
import { exec } from "./exec.step-builder";

describe("Workflow Step Builders", () => {
    let store: Store;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideMockStore()],
            teardown: { destroyAfterEach: false },
        });
        store = TestBed.inject(Store);
    });

    describe("exec", () => {
        it("creates a WF Step that executes the given function", () => {
            const handler = jest.fn();
            const step = exec("testExec", handler);

            const expectedEvents = { a: nextStep("UT") };
            const expectedMarbles = "(a|)";

            testScheduler.run(({ expectObservable }) => {
                expectObservable(
                    step.activate(createTestWorkflowContext())
                ).toBe(expectedMarbles, expectedEvents);
                expect(handler).toHaveBeenCalledTimes(1);
            });
        });

        it("supports multiple events to be returned", () => {
            const events = [
                createBasicEvent("UT", "aa"),
                createBasicEvent("UT", "bb"),
                createBasicEvent("UT", "cc"),
            ];
            const handler = jest.fn(() => events);
            const step = exec("testExec", handler);

            const expectedEvents = { a: events[0], b: events[1], c: events[2] };
            const expectedMarbles = "(abc|)";

            testScheduler.run(({ expectObservable }) => {
                expectObservable(
                    step.activate(createTestWorkflowContext())
                ).toBe(expectedMarbles, expectedEvents);
                expect(handler).toHaveBeenCalledTimes(1);
            });
        });

        it("will store the dependency array with the generated step", () => {
            const step = exec(
                "testDeps",
                router => {
                    // These line won't execute (as we are not actually activating the step).
                    // They're there onluy to ensure that the compipler picked up the type properly
                    expect(router).not.toBeFalsy();
                    expect(router.navigate).toBeDefined();
                    return createBasicEvent("UT", "aa");
                },
                [Router]
            );
            expect(step.dependencies).toEqual([Router]);
        });
    });

    const testScheduler = new TestScheduler((actual, expected) =>
        expect(actual).toEqual(expected)
    );

    function createTestWorkflowContext(): WorkflowContext {
        return {
            store,
            workflowName: "UT",
            inject: TestBed.inject,
        };
    }
});
