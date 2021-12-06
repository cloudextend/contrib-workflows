import { args, declareEvent } from "@cloudextend/contrib/events";

export const nextStep = declareEvent("#workflows:Next");
export const previousStep = declareEvent("#workflows:Previous");
export const skipSteps = declareEvent(
    "#workflows:Skip",
    args<number>("number of steps")
);
export const goto = declareEvent("#workflow:GoTo", args<string>("Step Label"));

export const workflowEnding = declareEvent(
    "common:workflows:Ending",
    args<string>("workflow name")
);

export const idle = declareEvent("#workflow:idle");
export const busy = declareEvent("#workflow:busy", args<{ message: string }>());
