import { args, declareEvent } from "@cloudextend/common/events";

export const workflowStarting = declareEvent(
    "common:workflows:Starting",
    args<string>("workflow name")
);

export const nextStep = declareEvent("#workflows:Next");
export const previousStep = declareEvent("#workflows:Previous");
export const skipSteps = declareEvent(
    "#workflows:Skip",
    args<number>("number of steps")
);
export const goto = declareEvent("#workflow:GoTo", args<string>("Step Label"));

export const endOfWorkflow = declareEvent("#workflows:EndOfFlow");

export const workflowEnding = declareEvent(
    "common:workflows:Ending",
    args<string>("workflow name")
);
