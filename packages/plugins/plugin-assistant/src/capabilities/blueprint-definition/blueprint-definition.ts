//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Record from 'effect/Record';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import {
  Agent,
  Discord,
  DiscordBlueprint,
  EntityExtraction,
  Initiative,
  Linear,
  LinearBlueprint,
  Research,
  ResearchBlueprint,
  WebSearchBlueprint,
  Planning,
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
    Capability.contributes(AppCapabilities.Functions, [Research.create, Research.research]),
    Capability.contributes(AppCapabilities.BlueprintDefinition, ResearchBlueprint),

    // TODO(burdon): Factor out.
    Capability.contributes(AppCapabilities.Functions, [Agent.prompt, EntityExtraction.extract]),
    Capability.contributes(AppCapabilities.BlueprintDefinition, WebSearchBlueprint),

    // TODO(burdon): Factor out.
    Capability.contributes(AppCapabilities.Functions, [Discord.fetch]),
    Capability.contributes(AppCapabilities.BlueprintDefinition, DiscordBlueprint),

    // TODO(burdon): Factor out.
    Capability.contributes(AppCapabilities.Functions, [Linear.sync]),
    Capability.contributes(AppCapabilities.BlueprintDefinition, LinearBlueprint),

    Capability.contributes(AppCapabilities.Functions, Initiative.getFunctions()),
    Capability.contributes(AppCapabilities.BlueprintDefinition, Initiative.makeBlueprint()),

    Capability.contributes(AppCapabilities.Functions, Record.values(Planning.PlanningFunctions)),
    Capability.contributes(AppCapabilities.BlueprintDefinition, Planning.PlanningBlueprint),
  ]),
);
