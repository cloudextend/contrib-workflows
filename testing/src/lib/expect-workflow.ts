import {
    Workflow,
    WorkflowContext,
    WorkflowStep,
} from "@cloudextend/common/workflows";

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
        step: (index: number) =>
            new WorkflowStepExpectations(workflow.steps[index]),
    };
}
