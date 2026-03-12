//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Record from 'effect/Record';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import {
  AgentFunctions,
  BrowserBlueprint,
  DatabaseBlueprint,
  DiscordBlueprint,
  EntityExtractionFunctions,
  LinearBlueprint,
  PlanningBlueprint,
  ProjectBlueprint,
  ProjectFunctions,
  ResearchBlueprint,
  WebSearchBlueprint,
  MemoryBlueprint,
} from '@dxos/assistant-toolkit';

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

    Capability.contributes(AppCapabilities.Functions, Record.values(AgentFunctions)),
    Capability.contributes(AppCapabilities.Functions, Record.values(EntityExtractionFunctions)),
    Capability.contributes(AppCapabilities.Functions, [
      ProjectFunctions.Agent,
      ProjectFunctions.GetContext,
      ProjectFunctions.Qualifier,
    ]),
  ]),
);

export default blueprintDefinition;
