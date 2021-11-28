import { args, declareEvent } from "@cloudextend/contrib/events";

export const blockedUntil = declareEvent<string>(
    "#workflow:Blocked",
    args("verb")
);
