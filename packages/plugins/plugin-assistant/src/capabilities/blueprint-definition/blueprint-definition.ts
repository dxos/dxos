//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import {
  AgentHandlers,
  BrowserBlueprint,
  DatabaseBlueprint,
  DiscordBlueprint,
  EntityExtractionHandlers,
  LinearBlueprint,
  PlanningBlueprint,
  ProjectBlueprint,
  ProjectHandlers,
  ResearchBlueprint,
  WebSearchBlueprint,
  MemoryBlueprint,
  AutomationBlueprint,
  ProjectWizardBlueprint,
} from '@dxos/assistant-toolkit';
import type { OperationHandlerSet } from '@dxos/operation';

import { AssistantBlueprint } from '../../blueprints';

const blueprintDefinition = Capability.makeModule(() =>
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
    Capability.contributes(AppCapabilities.BlueprintDefinition, ProjectWizardBlueprint),

    Capability.contributes(AppCapabilities.Functions, AgentHandlers),
    Capability.contributes(AppCapabilities.Functions, EntityExtractionHandlers),
    Capability.contributes(AppCapabilities.Functions, ProjectHandlers),
  ]),
);

export default blueprintDefinition;
