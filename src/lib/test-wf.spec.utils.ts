import { Subject } from "rxjs";

import { declareEvent, RxEvent } from "@cloudextend/contrib/events";

import { Workflow } from "./workflow";
import { WorkflowStep } from "./workflow-step";
import { exec, load } from "./step-builders";
import { waitFor } from "./step-builders";
import { navigation } from "@cloudextend/contrib/routing";
import { createTestEvent } from "./test-events.spec.utils";

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
        } else if (t === "load") {
            awaiters[i] = new Subject<RxEvent>();
            activations[i] = jest.fn(() => awaiters[i]);
            steps[i] = load("STEP_" + i, activations[i], {
                loadingMessage: `Waiting on ${i}...`,
            });
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

export function getSetup(stepTypes: string[], wfConfig?: Partial<Workflow>) {
    const { activations, awaiters, steps } = getSteps(...stepTypes);
    const workflow = {
        name: "UT",
        ...wfConfig,
        steps,
    };

    return { activations, awaiters, workflow };
}
