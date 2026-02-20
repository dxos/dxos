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

const blueprintDefinition = Capability.makeModule<
  [],
  Capability.Capability<typeof AppCapabilities.BlueprintDefinition>[]
>(() =>
  Effect.succeed([
    Capability.contributes(AppCapabilities.BlueprintDefinition, {
      ...AssistantBlueprint,
      functions: [
        // TODO(burdon): Co-locate all of these functions?
        ...AssistantBlueprint.functions,
        ...Record.values(AgentFunctions),
        ...Record.values(EntityExtractionFunctions),
      ],
    }),
    Capability.contributes(AppCapabilities.BlueprintDefinition, ResearchBlueprint),
    Capability.contributes(AppCapabilities.BlueprintDefinition, WebSearchBlueprint),
    Capability.contributes(AppCapabilities.BlueprintDefinition, DiscordBlueprint),
    Capability.contributes(AppCapabilities.BlueprintDefinition, LinearBlueprint),
    Capability.contributes(AppCapabilities.BlueprintDefinition, InitiativeBlueprint),
    Capability.contributes(AppCapabilities.BlueprintDefinition, PlanningBlueprint),
  ]),
);

export default blueprintDefinition;
