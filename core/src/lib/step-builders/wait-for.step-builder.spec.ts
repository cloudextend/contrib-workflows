import { TestBed } from "@angular/core/testing";
import { declareEvent } from "@cloudextend/contrib/events";
import { Store } from "@ngrx/store";
import { MockStore, provideMockStore } from "@ngrx/store/testing";
import { TestScheduler } from "rxjs/testing";
import { WorkflowContext } from "../workflow-context";
import { busy } from "../workflow.events";
import { blockedUntil } from "../workflow.events.internal";
import { waitFor } from "./wait-for.builder";

const testEvent = declareEvent("UT-test-event");
const testEvent2 = declareEvent("UT-t2");
const testEvent3 = declareEvent("UT-t3");

describe("waitFor Step Builders", () => {
    let context: WorkflowContext;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideMockStore()],
            teardown: { destroyAfterEach: false },
        });
    });

    describe("in a background workflow", () => {
        beforeEach(() => {
            const store = TestBed.inject(MockStore);
            context = {
                workflowName: "UTWF",
                store,
                isBackgroundWorkflow: true,
            };
        });

        it("creates a step that returns a blockedUntil event", () => {
            const step = waitFor(testEvent);
            testScheduler.run(({ expectObservable }) => {
                const expectedEvents = {
                    a: blockedUntil("UTWF", { verbs: [testEvent.verb] }),
                };
                const expectedMarbles = "(a|)";

                expectObservable(step.activate(context)).toBe(
                    expectedMarbles,
                    expectedEvents
                );
            });
        });

        it("can wait for multiple events", () => {
            const step = waitFor([testEvent, testEvent2, testEvent3]);
            testScheduler.run(({ expectObservable }) => {
                const expectedEvents = {
                    a: blockedUntil("UTWF", {
                        verbs: [
                            testEvent.verb,
                            testEvent2.verb,
                            testEvent3.verb,
                        ],
                    }),
                };
                const expectedMarbles = "(a|)";

                expectObservable(step.activate(context)).toBe(
                    expectedMarbles,
                    expectedEvents
                );
            });
        });
    });

    describe("in a foreground workflow", () => {
        beforeEach(() => {
            const store = TestBed.inject(MockStore);
            context = { workflowName: "UTWF", store };
        });

        it("createsd step raises busy and blockUntil events", () => {
            const step = waitFor(testEvent, "Doing something...");
            testScheduler.run(({ expectObservable }) => {
                const expectedEvents = {
                    a: busy("UTWF", { message: "Doing something..." }),
                    b: blockedUntil("UTWF", { verbs: [testEvent.verb] }),
                };
                const expectedMarbles = "(ab|)";

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
});
