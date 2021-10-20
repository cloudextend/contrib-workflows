import { Logger } from "@cloudextend/common/core";

export interface WorkflowContext extends Record<string, unknown> {
    readonly workflowName: string;
    readonly logger?: Logger;
}
