// import { Injectable } from "@angular/core";
// import { Store } from "@ngrx/store";

import { views } from "@cloudextend/contrib/state";

import { createWorkflow } from "./workflow-builder";

const WF = "#workflows/Default Workflow";

export const defaultWorkflow = createWorkflow(WF, [], {
    onCompletion: () => views.home(WF),
});
