import { TestBed } from "@angular/core/testing";
import { declareEvent } from "@cloudextend/contrib/events";
import { Store } from "@ngrx/store";
import { provideMockStore } from "@ngrx/store/testing";
import { TestScheduler } from "rxjs/testing";
import { busy, WorkflowContext, WorkflowStep } from "..";
import { blockedUntil } from "../workflow.events.internal";
import { waitFor } from "./wait-for.builder";

const testEvent = declareEvent("UT-test-event");

describe("waitFor Step Builders", () => {
    let context: WorkflowContext;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideMockStore()],
        });
        const store = TestBed.inject(Store);

        context = { workflowName: "UTWF", store };
    });

    it("creates a step that returns a blockedUntil event", () => {
        const step = waitFor(testEvent);
        testScheduler.run(({ expectObservable }) => {
            const expectedEvents = { a: blockedUntil("UTWF", testEvent.verb) };
            const expectedMarbles = "(a|)";

            expectObservable(step.activate(context)).toBe(
                expectedMarbles,
                expectedEvents
            );
        });
    });

    it("when a waiting message is given, createsd step raises busy and blockUntil events", () => {
        const step = waitFor(testEvent, "Doing something...");
        testScheduler.run(({ expectObservable }) => {
            const expectedEvents = {
                a: busy("UTWF", { message: "Doing something..." }),
                b: blockedUntil("UTWF", testEvent.verb),
            };
            const expectedMarbles = "(ab|)";

            expectObservable(step.activate(context)).toBe(
                expectedMarbles,
                expectedEvents
            );
        });
    });

    const testScheduler = new TestScheduler((actual, expected) =>
        expect(actual).toEqual(expected)
    );
});
