import { TestScheduler } from "rxjs/testing";

import { busy, idle } from "@cloudextend/common/core";
import { RxEvent } from "@cloudextend/common/events";
import { WorkflowContext, WorkflowStep } from "@cloudextend/common/workflows";

export class WorkflowStepExpectations<
    T extends WorkflowContext = WorkflowContext
> {
    constructor(private readonly step: WorkflowStep<T>) {}

    private readonly testScheduler = new TestScheduler((actual, expected) =>
        expect(actual).toEqual(expected)
    );

    public toCompleteAnd(
        assertions: (returnedEvents: RxEvent[]) => void,
        done: jest.DoneCallback,
        context?: T
    ) {
        const testContext = context ?? ({ workflowName: "UT" } as T);

        const emittedEvents: RxEvent[] = [];
        this.step.activate(testContext).subscribe({
            next: event => emittedEvents.push(event),
            error: done.fail,
            complete: () => {
                try {
                    assertions(emittedEvents);
                    done();
                } catch (e) {
                    done.fail(e);
                }
            },
        });
    }

    public toAwaitAndReturn(...events: RxEvent[]) {
        const actualEvents = [
            expect.objectContaining({
                verb: busy.verb,
            }),
            ...events,
            expect.objectContaining({
                verb: idle.verb,
            }),
        ];
        this.testEventSequence(actualEvents);
    }

    public toReturn(...events: RxEvent[]) {
        this.testEventSequence(events);
    }

    public toReturnAnEventAnd(
        assertions: (event: RxEvent) => void,
        done: jest.DoneCallback,
        context?: T
    ) {
        const testContext = context ?? ({ workflowName: "UT" } as T);

        const emittedEvents: RxEvent[] = [];
        this.step.activate(testContext).subscribe({
            next: event => emittedEvents.push(event),
            error: done.fail,
            complete: () => {
                try {
                    expect(emittedEvents).toHaveLength(1);
                    assertions(emittedEvents[0]);
                    done();
                } catch (e) {
                    done.fail(e);
                }
            },
        });
    }

    private testEventSequence(eventsOrPatterns: unknown[], context?: T) {
        const expectedEvents: Record<string, unknown> = {};

        const charCodeOfA = "a".charCodeAt(0);
        let theMarbles = "";

        eventsOrPatterns.forEach((e, i) => {
            const marble = String.fromCharCode(charCodeOfA + i);
            theMarbles += marble;
            expectedEvents[marble] = e;
        });

        const expectedMarbles = `(${theMarbles}|)`;

        const testContext = context ?? ({ workflowName: "UT" } as T);

        this.testScheduler.run(({ expectObservable }) => {
            expectObservable(this.step.activate(testContext)).toBe(
                expectedMarbles,
                expectedEvents
            );
        });
    }
}
