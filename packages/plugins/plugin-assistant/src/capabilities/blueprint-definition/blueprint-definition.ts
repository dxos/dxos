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
  EntityExtractionFunctions,
  InitiativeBlueprint,
  LinearBlueprint,
  PlanningBlueprint,
  ResearchBlueprint,
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
    Capability.contributes(AppCapabilities.Functions, [
      ...AssistantBlueprint.functions,
      // TODO(burdon): Where should these go?
      ...Record.values(AgentFunctions),
      ...Record.values(EntityExtractionFunctions),
    ]),

    Capability.contributes(AppCapabilities.BlueprintDefinition, ResearchBlueprint.make()),
    Capability.contributes(AppCapabilities.Functions, ResearchBlueprint.functions),

    Capability.contributes(AppCapabilities.BlueprintDefinition, WebSearchBlueprint.make()),
    Capability.contributes(AppCapabilities.Functions, WebSearchBlueprint.functions),

    Capability.contributes(AppCapabilities.BlueprintDefinition, DiscordBlueprint.make()),
    Capability.contributes(AppCapabilities.Functions, DiscordBlueprint.functions),

    Capability.contributes(AppCapabilities.BlueprintDefinition, LinearBlueprint.make()),
    Capability.contributes(AppCapabilities.Functions, LinearBlueprint.functions),

    Capability.contributes(AppCapabilities.BlueprintDefinition, InitiativeBlueprint.make()),
    Capability.contributes(AppCapabilities.Functions, InitiativeBlueprint.functions),

    Capability.contributes(AppCapabilities.BlueprintDefinition, PlanningBlueprint.make()),
    Capability.contributes(AppCapabilities.Functions, PlanningBlueprint.functions),
  ]),
);
