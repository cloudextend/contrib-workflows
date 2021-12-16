import { bindSource } from "@cloudextend/contrib/events";

import * as wfevents from "./workflow.events";

export function getWorkflowActions(workflowName: string) {
    const [nextStep, previousStep, skipSteps, goto] = bindSource(
        workflowName,
        wfevents.nextStep,
        wfevents.previousStep,
        wfevents.skipSteps,
        wfevents.goto
    );
    return {
        nextStep,
        previousStep,
        skipSteps,
        goto,
    };
}
