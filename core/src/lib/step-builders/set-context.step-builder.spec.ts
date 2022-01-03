import { TestBed } from "@angular/core/testing";
import { args, declareEvent } from "@cloudextend/contrib/events";
import { createSelector } from "@ngrx/store";
import { MockStore, provideMockStore } from "@ngrx/store/testing";
import { TestScheduler } from "rxjs/testing";
import { WorkflowContext } from "../workflow-context";
import { calc } from "./set-context.step-builder";

const selectA = createSelector(() => "alpha");
const selectB = createSelector(() => "beta");

const testEvent = declareEvent("test-event", args<{ a: string; b: string }>());

interface TestContext {
    testProp: string;
}

describe("setContext builder", () => {
    let store: MockStore;

    beforeEach(() => {
        TestBed.configureTestingModule({
            teardown: { destroyAfterEach: false },
            providers: [provideMockStore()],
        });
        store = TestBed.inject(MockStore);
    });

    it("will set the given context property to the value of dervied state", () => {
        const step = calc("testCalc", selectA, selectB, (_, a, b) => [
            testEvent("UT", { a, b }),
            testEvent("UT", { a: "the", b: "end" }),
        ]);

        const expectedEvents = {
            a: testEvent("UT", { a: "alpha", b: "beta" }),
            b: testEvent("UT", { a: "the", b: "end" })
        };
        const expectedMarbles = "(ab|)";

        testScheduler.run(({ expectObservable }) => {
            expectObservable(step.activate(createTestWorkflowContext())).toBe(
                expectedMarbles,
                expectedEvents
            );
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
