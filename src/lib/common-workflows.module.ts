import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { EffectsModule } from "@ngrx/effects";

import { WorkflowEngine } from "./workflow-engine.service";

@NgModule({
    imports: [CommonModule, EffectsModule.forFeature([WorkflowEngine])],
})
export class WorkflowsModule {}
