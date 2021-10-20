import { TestBed } from "@angular/core/testing";
import { createSelector, Store } from "@ngrx/store";
import { provideMockStore } from "@ngrx/store/testing";
import { of } from "rxjs";
import { filter } from "rxjs/operators";
import { TestScheduler } from "rxjs/testing";

import { busy, idle, Logger, LogService } from "@cloudextend/common/core";
import { createBasicEvent, occurenceOf } from "@cloudextend/common/events";
import { provideMockLogService } from "@cloudextend/testing/utils";

import { WorkflowContext } from "./workflow-context";
import { exec, select, waitOn } from "./workflow-step-builders";
import { nextStep } from "./workflow.events";

describe("Workflow Step Builders", () => {
    let store: Store;
    let logger: Logger;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideMockStore(), provideMockLogService()],
        });
        store = TestBed.inject(Store);
        logger = TestBed.inject(LogService).createLogger("UT");
    });

    describe("exec", () => {
        it("creates a WF Step that executes the given function", () => {
            const handler = jest.fn();
            const step = exec("testExec", handler);

            const expectedEvents = { a: nextStep("UT") };
            const expectedMarbles = "(a|)";

            testScheduler.run(({ expectObservable }) => {
                expectObservable(step.activate({ workflowName: "UT" })).toBe(
                    expectedMarbles,
                    expectedEvents
                );
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
    });

    describe("select", () => {
        it("creates a WF step that returns the result of a ngrx selector", () => {
            const eventA = createBasicEvent("UT", "A");
            const multiEventSelector = createSelector(
                () => eventA,
                a => a
            );

            const expectedEvents = { a: eventA };
            const expectedMarbles = "(a|)";

            const step = select("Test", () => multiEventSelector, store);
            const context = createTestWorkflowContext();

            testScheduler.run(({ expectObservable }) => {
                expectObservable(step.activate(context)).toBe(
                    expectedMarbles,
                    expectedEvents
                );
            });
        });

        it("throws if the step is not provided with a store", () => {
            const eventA = createBasicEvent("UT", "A");
            const multiEventSelector = createSelector(
                () => eventA,
                a => a
            );

            const step = select(
                "Test",
                () => multiEventSelector,
                undefined as unknown as Store
            );
            const context = createTestWorkflowContext();
            expect(() => step.activate(context)).toThrow();
        });

        it("streams events one by one whe multiple events are returned", () => {
            const eventA = createBasicEvent("UT", "A");
            const eventB = createBasicEvent("UT", "B");
            const multiEventSelector = createSelector(
                () => eventA,
                () => eventB,
                (a, b) => [a, b]
            );

            const expectedEvents = { a: eventA, b: eventB };
            const expectedMarbles = "(ab|)";

            const step = select("Test", () => multiEventSelector, store);
            const context = createTestWorkflowContext();

            testScheduler.run(({ expectObservable }) => {
                expectObservable(step.activate(context)).toBe(
                    expectedMarbles,
                    expectedEvents
                );
            });
        });
    });

    describe("waitOn", () => {
        it("enters and exits busy state while executing the step", () => {
            const busyEvent = busy("UT", { message: "Just busy!" });
            const workEvent = createBasicEvent("UT", "Actual Work");
            const workEvent$ = of(workEvent);
            const idleEvent = idle("UT");

            const expectedEvents = { a: busyEvent, b: workEvent, c: idleEvent };
            const expectedMarbles = "(abc|)";

            const step = waitOn("Lengthy Step", "Just busy!", () => workEvent$);
            const context = createTestWorkflowContext();

            testScheduler.run(({ expectObservable }) => {
                expectObservable(step.activate(context)).toBe(
                    expectedMarbles,
                    expectedEvents
                );
            });
        });

        it("can create a waiting message using context", done => {
            const context = createTestWorkflowContext();
            const step = waitOn(
                "Test1",
                c => `My ${c.workflowName}`,
                () => of(createBasicEvent("UT", "A"))
            );
            step.activate(context)
                .pipe(filter(e => occurenceOf(busy, e)))
                .subscribe({
                    next: e => {
                        expect(e.message).toEqual(`My ${context.workflowName}`);
                        done();
                    },
                    error: done.fail,
                });
        });
    });

    const testScheduler = new TestScheduler((actual, expected) =>
        expect(actual).toEqual(expected)
    );

    function createTestWorkflowContext(): WorkflowContext {
        return {
            logger,
            store,
            workflowName: "UT",
            inject: TestBed.inject,
        };
    }
});
