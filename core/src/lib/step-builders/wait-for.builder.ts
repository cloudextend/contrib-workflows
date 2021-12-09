import { EventCreator } from "@cloudextend/contrib/events";
import { from, of } from "rxjs";
import { busy } from "../workflow.events";
import { WorkflowContext } from "../workflow-context";
import { blockedUntil } from "../workflow.events.internal";
import { WorkflowStep } from "../workflow-step";

export function waitFor<T extends WorkflowContext = WorkflowContext>(
    eventOrEvents: EventCreator | EventCreator[],
    waitingMessage?: string,
    label?: string
): WorkflowStep<T> {
    const verbs = Array.isArray(eventOrEvents)
        ? eventOrEvents.map(e => e.verb)
        : [eventOrEvents.verb];
    const activate = (context: T) => {
        if (waitingMessage) {
            return from([
                busy(context.workflowName, { message: waitingMessage }),
                blockedUntil(context.workflowName, { verbs }),
            ]);
        }
        return of(blockedUntil(context.workflowName, { verbs }));
    };

    return { activate, label: label ?? "waitFor:" + verbs.join(", ") };
}
