//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import {
  AgentHandlers,
  BlueprintManagerBlueprint,
  BlueprintManagerHandlers,
  BrowserBlueprint,
  DatabaseBlueprint,
  DatabaseHandlers,
  DiscordBlueprint,
  EntityExtractionHandlers,
  LinearBlueprint,
  PlanningBlueprint,
  ProjectBlueprint,
  ProjectHandlers,
  ProjectWizardBlueprint,
  ProjectWizardHandlers,
  ResearchBlueprint,
  WebSearchBlueprint,
  MemoryBlueprint,
  AutomationBlueprint,
} from '@dxos/assistant-toolkit';

import { AssistantBlueprint } from '#blueprints';

// TODO(dmaretskyi): Force this type for all Capability.makeModule calls.
const blueprintDefinition: () => Effect.Effect<Capability.Capability<unknown>[]> = Capability.makeModule(() =>
  Effect.succeed([
    Capability.contributes(AppCapabilities.BlueprintDefinition, AssistantBlueprint),
    Capability.contributes(AppCapabilities.BlueprintDefinition, BrowserBlueprint),
    Capability.contributes(AppCapabilities.BlueprintDefinition, DatabaseBlueprint),
    Capability.contributes(AppCapabilities.BlueprintDefinition, ResearchBlueprint),
    Capability.contributes(AppCapabilities.BlueprintDefinition, WebSearchBlueprint),
    Capability.contributes(AppCapabilities.BlueprintDefinition, DiscordBlueprint),
    Capability.contributes(AppCapabilities.BlueprintDefinition, LinearBlueprint),
    Capability.contributes(AppCapabilities.BlueprintDefinition, ProjectBlueprint),
    Capability.contributes(AppCapabilities.BlueprintDefinition, PlanningBlueprint),
    Capability.contributes(AppCapabilities.BlueprintDefinition, MemoryBlueprint),
    Capability.contributes(AppCapabilities.BlueprintDefinition, AutomationBlueprint),
    Capability.contributes(AppCapabilities.BlueprintDefinition, BlueprintManagerBlueprint),
    Capability.contributes(AppCapabilities.BlueprintDefinition, ProjectWizardBlueprint),

    Capability.contributes(Capabilities.OperationHandler, AgentHandlers),
    Capability.contributes(Capabilities.OperationHandler, BlueprintManagerHandlers),
    Capability.contributes(Capabilities.OperationHandler, DatabaseHandlers),
    Capability.contributes(Capabilities.OperationHandler, EntityExtractionHandlers),
    Capability.contributes(Capabilities.OperationHandler, ProjectHandlers),
    Capability.contributes(Capabilities.OperationHandler, ProjectWizardHandlers),
  ]),
);

export default blueprintDefinition;
