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

export function expectWorkflow<T extends WorkflowContext = WorkflowContext>(
    workflow: Workflow<T>
) {
    return {
        step: (labelOrIndex: string | number) =>
            typeof labelOrIndex === "string"
                ? new WorkflowStepExpectations(
                      workflow.steps.findIndex(s => s.label === labelOrIndex)
                  )
                : new WorkflowStepExpectations(workflow.steps[labelOrIndex]),
    };
}
