import { RxEvent } from "@cloudextend/contrib/events";

export function createBasicEvent(source: string, verb: string): RxEvent {
    return {
        source,
        verb,
        type: `[${source}] ${verb}`,
    };
}
