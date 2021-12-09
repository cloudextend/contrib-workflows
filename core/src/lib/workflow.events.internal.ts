import { args, declareEvent } from "@cloudextend/contrib/events";

export const blockedUntil = declareEvent(
    "#workflow:Blocked",
    args<{ verbs: string[] }>()
);
