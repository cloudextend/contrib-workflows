import { TestBed } from "@angular/core/testing";
import { Store } from "@ngrx/store";
import { provideMockStore } from "@ngrx/store/testing";
import { of } from "rxjs";
import { filter } from "rxjs/operators";
import { TestScheduler } from "rxjs/testing";

import { occurenceOf } from "@cloudextend/contrib/events";

import { WorkflowContext } from "../workflow-context";
import { load } from "./load.step-builder";
import { busy, idle } from "../workflow.events";
import { createBasicEvent } from "../test-events.utils.spec";

describe("'load' Step Builders", () => {
    let store: Store;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideMockStore()],
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

            const step = load("Lengthy Step", "Just busy!", () => workEvent$);
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
            const busyEvent = busy("UT", { message: "Just busy!" });
            const workEvent = createBasicEvent("UT", "Actual Work");
            const workEvent$ = of(workEvent);
            const idleEvent = idle("UT");

            const expectedEvents = { a: busyEvent, b: workEvent, c: idleEvent };
            const expectedMarbles = "(abc|)";

            const step = load("Lengthy Step", "Just busy!", () => workEvent$);
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
            const step = load(
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
