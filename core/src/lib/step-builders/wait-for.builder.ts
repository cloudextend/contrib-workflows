import { EventCreator } from "@cloudextend/contrib/events";
import { from, of } from "rxjs";
import { busy } from "../workflow.events";
import { WorkflowContext } from "../workflow-context";
import { blockedUntil } from "../workflow.events.internal";
import { WorkflowStep } from "../workflow-step";

export function waitFor<T extends WorkflowContext = WorkflowContext>(
    event: EventCreator,
    waitingMessage?: string
): WorkflowStep<T> {
    const activate = (context: T) => {
        if (waitingMessage) {
            return from([
                busy(context.workflowName, { message: waitingMessage }),
                blockedUntil(context.workflowName, event.verb),
            ]);
        }
        return of(blockedUntil(context.workflowName, event.verb));
    };

    return { activate, label: "waitFor:" + event.verb };
}
