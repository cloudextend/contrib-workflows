import { getSetup } from "./test-utils.spec";
import { getWorkflowActions } from "./workflow-builder";
import { goto, nextStep, previousStep, skipSteps } from "./workflow.events";

describe("WorkflowBuilder", () => {
    it("sets the given completion function to run at onComplete", () => {
        const onCompletion = jest.fn();
        const { workflow } = getSetup([], onCompletion);
        expect(workflow.onCompletion).toBe(onCompletion);
    });

    // it("creates a workflow with name-index for steps", () => {
    //     const { workflow } = getSetup(["exec", "exec", "exec.view", "waitOn"]);
    //     expect(workflow.steps.length).toEqual(4);
    //     for (let i = 0; i < workflow.steps.length; i++) {
    //         expect(workflow.steps.getIndex("STEP_" + i)).toEqual(i);
    //         expect(workflow.steps.stepAt(i).label).toEqual("STEP_" + i);
    //     }
    // });

    // it("doesn't create the index if specified not to", () => {
    //     const { steps } = getSteps("exec", "exec", "exec.view", "waitOn");
    //     const workflow = createWorkflow("UT", steps, {
    //         skipLabelIndexing: true,
    //     });
    //     expect(workflow.steps.length).toEqual(4);
    //     expect(workflow.steps.getIndex("STEP_0")).toBeUndefined();
    //     expect(workflow.steps.getIndex(steps[1].label)).toBeUndefined();
    // });

    describe("getWorkflowActions", () => {
        it("returns actions bound to given workflow", () => {
            const actions = getWorkflowActions("UT");
            expect(actions.goto("A")).toEqual(goto("UT", "A"));
            expect(actions.nextStep()).toEqual(nextStep("UT"));
            expect(actions.previousStep()).toEqual(previousStep("UT"));
            expect(actions.skipSteps(1)).toEqual(skipSteps("UT", 1));
        });
    });
});
