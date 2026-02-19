//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Record from 'effect/Record';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import {
  AgentFunctions,
  DiscordBlueprint,
  DiscordFunctions,
  EntityExtractionFunctions,
  InitiativeBlueprint,
  InitiativeFunctions,
  LinearBlueprint,
  LinearFunctions,
  PlanningBlueprint,
  PlanningFunctions,
  ResearchBlueprint,
  ResearchFunctions,
  WebSearchBlueprint,
} from '@dxos/assistant-toolkit';

import { AssistantBlueprint } from '../../blueprints';

// TODO(burdon): Remove need for this type? Or change to simpler array of tuples?
export type BlueprintCapabilities = [
  Capability.Capability<typeof AppCapabilities.BlueprintDefinition>,
  Capability.Capability<typeof AppCapabilities.Functions>,
  Capability.Capability<typeof AppCapabilities.BlueprintDefinition>,
  Capability.Capability<typeof AppCapabilities.Functions>,
  Capability.Capability<typeof AppCapabilities.BlueprintDefinition>,
  Capability.Capability<typeof AppCapabilities.Functions>,
  Capability.Capability<typeof AppCapabilities.BlueprintDefinition>,
  Capability.Capability<typeof AppCapabilities.Functions>,
  Capability.Capability<typeof AppCapabilities.BlueprintDefinition>,
  Capability.Capability<typeof AppCapabilities.Functions>,
  Capability.Capability<typeof AppCapabilities.BlueprintDefinition>,
  Capability.Capability<typeof AppCapabilities.Functions>,
  Capability.Capability<typeof AppCapabilities.BlueprintDefinition>,
  Capability.Capability<typeof AppCapabilities.Functions>,
];

export default Capability.makeModule<[], BlueprintCapabilities>(() =>
  Effect.succeed([
    Capability.contributes(AppCapabilities.BlueprintDefinition, AssistantBlueprint.make()),
    Capability.contributes(AppCapabilities.Functions, AssistantBlueprint.functions),

    Capability.contributes(AppCapabilities.BlueprintDefinition, ResearchBlueprint),
    Capability.contributes(AppCapabilities.Functions, Record.values(ResearchFunctions)),

    Capability.contributes(AppCapabilities.BlueprintDefinition, WebSearchBlueprint),
    // TODO(burdon): This doesn't match?
    Capability.contributes(AppCapabilities.Functions, [
      ...Record.values(AgentFunctions),
      ...Record.values(EntityExtractionFunctions),
    ]),

    Capability.contributes(AppCapabilities.BlueprintDefinition, DiscordBlueprint),
    Capability.contributes(AppCapabilities.Functions, Record.values(DiscordFunctions)),

    Capability.contributes(AppCapabilities.BlueprintDefinition, LinearBlueprint),
    Capability.contributes(AppCapabilities.Functions, Record.values(LinearFunctions)),

    Capability.contributes(AppCapabilities.BlueprintDefinition, InitiativeBlueprint),
    Capability.contributes(AppCapabilities.Functions, Record.values(InitiativeFunctions)),

    Capability.contributes(AppCapabilities.BlueprintDefinition, PlanningBlueprint),
    Capability.contributes(AppCapabilities.Functions, Record.values(PlanningFunctions)),
  ]),
);
