import { Subject } from "rxjs";

import { declareEvent, RxEvent } from "@cloudextend/contrib/events";

import { Workflow } from "./workflow";
import { createTestEvent } from "./workflow-engine.service.spec";
import { WorkflowStep } from "./workflow-step";
import { WorkflowStepAction } from "./workflow-step-activators";
import { exec, waitOn } from "./step-builders";
import { waitFor } from ".";
import { navigation } from "@cloudextend/contrib/routing";

export function getSteps(...stepTypes: string[]) {
    const awaiters: Subject<RxEvent>[] = [];
    const activations: jest.Mock[] = [];

    const steps: WorkflowStep[] = [];

    stepTypes.forEach((t, i) => {
        if (t === "exec") {
            activations[i] = jest.fn(() => createTestEvent(`E${i}`));
            steps[i] = exec("STEP_" + i, activations[i]);
        } else if (t === "exec.view") {
            activations[i] = jest.fn(() =>
                navigation("UNIT TEST", {
                    pathSegments: ["test", "" + i],
                })
            );
            steps[i] = exec("STEP_" + i, activations[i]);
        } else if (t === "waitOn") {
            awaiters[i] = new Subject<RxEvent>();
            activations[i] = jest.fn(() => awaiters[i]);
            steps[i] = waitOn(
                "STEP_" + i,
                `Waiting on ${i}...`,
                activations[i]
            );
        } else if (t === "waitFor") {
            activations[i] = jest.fn(() => createTestEvent(`E${i}`));
            const blocker = declareEvent(`blocker${i}`);
            steps[i] = waitFor(blocker);
        } else if (t === "waitFor.busy") {
            activations[i] = jest.fn(() => createTestEvent(`E${i}`));
            const blocker = declareEvent(`blocker${i}`);
            steps[i] = waitFor(blocker, `Waiting for 'blocker${i}'`);
        }
    });

    return { activations, awaiters, steps };
}

class TestableWorkflow implements Workflow {
    constructor(
        public readonly steps: WorkflowStep[],
        public readonly onCompletion?: WorkflowStepAction
    ) {}
    readonly name = "UT";
}

export function getSetup(
    stepTypes: string[],
    onCompletion?: WorkflowStepAction
) {
    const { activations, awaiters, steps } = getSteps(...stepTypes);
    const workflow = new TestableWorkflow(steps, onCompletion);

    return { activations, awaiters, workflow };
}
