import { bindSource } from "@cloudextend/common/events";

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
