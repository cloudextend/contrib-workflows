import {
    Workflow,
    WorkflowContext,
    WorkflowStep,
} from "@cloudextend/contrib/workflows";

import { WorkflowStepExpectations } from "./workflow-step-expectations";

export function expectWorkflowStep<T extends WorkflowContext = WorkflowContext>(
    step: WorkflowStep<T>
) {
    return new WorkflowStepExpectations(step);
}

function findStepByLabel<T extends WorkflowContext = WorkflowContext>(
    workflow: Workflow<T>,
    label: string
) {
    return workflow.steps[workflow.steps.findIndex(s => s.label === label)];
}

export function expectWorkflow<T extends WorkflowContext = WorkflowContext>(
    workflow: Workflow<T>
) {
    const step = (labelOrIndex: string | number) => {
        const wfStep =
            typeof labelOrIndex === "string"
                ? findStepByLabel(workflow, labelOrIndex)
                : workflow.steps[labelOrIndex];
        return new WorkflowStepExpectations(wfStep);
    };

    return { step };
}
