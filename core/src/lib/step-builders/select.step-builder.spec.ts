import { TestBed } from "@angular/core/testing";
import { createSelector, Store } from "@ngrx/store";
import { provideMockStore } from "@ngrx/store/testing";
import { TestScheduler } from "rxjs/testing";

import { WorkflowContext } from "../workflow-context";
import { select } from "./select.step-builder";
import { createBasicEvent } from "../test-events.utils.spec";
import { stat } from "fs";
import { RxEvent } from "@cloudextend/contrib/events";

interface DummyFeat1 {
    val1: string;
    val2: string;
}

describe("Workflow Step Builders", () => {
    let store: Store;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideMockStore()],
            teardown: { destroyAfterEach: false },
        });
        store = TestBed.inject(Store);
    });

    describe("select", () => {
        it("creates a WF step that returns the result of a ngrx selector", () => {
            const eventA = createBasicEvent("UT", "A");
            const ngrxSelector = createSelector(() => eventA);

            const expectedEvents = { a: eventA };
            const expectedMarbles = "(a|)";

            const step = select("Test", () => ngrxSelector);
            const context = createTestWorkflowContext();

            testScheduler.run(({ expectObservable }) => {
                expectObservable(step.activate(context)).toBe(
                    expectedMarbles,
                    expectedEvents
                );
            });
        });

        it("it supports simple/custom selectors", () => {
            const eventA = createBasicEvent("UT", "A");
            const customSelector = (/* state */) => eventA;

            const expectedEvents = { a: eventA };
            const expectedMarbles = "(a|)";

            const step = select("Test", () => customSelector);
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

            const step = select("Test", () => multiEventSelector);
            const storelessContext = {
                workflowName: "UT",
            } as unknown as WorkflowContext;
            expect(() => step.activate(storelessContext)).toThrow();
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

            const step = select("Test", () => multiEventSelector);
            const context = createTestWorkflowContext();

            testScheduler.run(({ expectObservable }) => {
                expectObservable(step.activate(context)).toBe(
                    expectedMarbles,
                    expectedEvents
                );
            });
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
