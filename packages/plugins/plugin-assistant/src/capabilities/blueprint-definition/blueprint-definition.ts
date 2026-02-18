//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Record from 'effect/Record';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import {
  AgentFunctions,
  DiscordFunctions,
  DiscordBlueprint,
  EntityExtractionFunctions,
  InitiativeFunctions,
  InitiativeBlueprint,
  LinearFunctions,
  LinearBlueprint,
  Planning,
  ResearchFunctions,
  ResearchBlueprint,
  WebSearchBlueprint,
} from '@dxos/assistant-toolkit';
import { type Blueprint } from '@dxos/blueprints';

import { AssistantBlueprint } from '../../blueprints';

export const createBlueprint: () => Blueprint.Blueprint = AssistantBlueprint.make;
export { AssistantBlueprint };

export type BlueprintCapabilities = [
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
  Capability.Capability<typeof AppCapabilities.BlueprintDefinition>,
];

export default Capability.makeModule<[], BlueprintCapabilities>(() =>
  Effect.succeed([
    Capability.contributes(AppCapabilities.Functions, AssistantBlueprint.functions$),
    Capability.contributes(AppCapabilities.BlueprintDefinition, AssistantBlueprint.blueprint),

    // TODO(burdon): Factor out.
    Capability.contributes(AppCapabilities.Functions, [ResearchFunctions.create, ResearchFunctions.research]),
    Capability.contributes(AppCapabilities.BlueprintDefinition, ResearchBlueprint),

    // TODO(burdon): Factor out.
    Capability.contributes(AppCapabilities.Functions, [AgentFunctions.prompt, EntityExtractionFunctions.extract]),
    Capability.contributes(AppCapabilities.BlueprintDefinition, WebSearchBlueprint),

    // TODO(burdon): Factor out.
    Capability.contributes(AppCapabilities.Functions, [DiscordFunctions.fetch]),
    Capability.contributes(AppCapabilities.BlueprintDefinition, DiscordBlueprint),

    // TODO(burdon): Factor out.
    Capability.contributes(AppCapabilities.Functions, [LinearFunctions.sync]),
    Capability.contributes(AppCapabilities.BlueprintDefinition, LinearBlueprint),

    Capability.contributes(AppCapabilities.Functions, InitiativeBlueprint.getFunctions()),
    Capability.contributes(AppCapabilities.BlueprintDefinition, InitiativeBlueprint.blueprint),

    Capability.contributes(AppCapabilities.Functions, Record.values(Planning.PlanningFunctions)),
    Capability.contributes(AppCapabilities.BlueprintDefinition, Planning.PlanningBlueprint),
  ]),
);
