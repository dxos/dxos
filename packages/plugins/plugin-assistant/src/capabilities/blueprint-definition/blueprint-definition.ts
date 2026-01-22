//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import {
  Agent,
  Discord,
  DiscordBlueprint,
  EntityExtraction,
  Linear,
  LinearBlueprint,
  Research,
  ResearchBlueprint,
  WebSearchBlueprint,
} from '@dxos/assistant-toolkit';
import { type Blueprint } from '@dxos/blueprints';

import { AssistantBlueprint } from '../../blueprints';

export const createBlueprint: () => Blueprint.Blueprint = AssistantBlueprint.make;
export { AssistantBlueprint };

export type BlueprintCapabilities = [
  Capability.Capability<typeof Common.Capability.Functions>,
  Capability.Capability<typeof Common.Capability.BlueprintDefinition>,
  Capability.Capability<typeof Common.Capability.Functions>,
  Capability.Capability<typeof Common.Capability.BlueprintDefinition>,
  Capability.Capability<typeof Common.Capability.Functions>,
  Capability.Capability<typeof Common.Capability.BlueprintDefinition>,
  Capability.Capability<typeof Common.Capability.Functions>,
  Capability.Capability<typeof Common.Capability.BlueprintDefinition>,
  Capability.Capability<typeof Common.Capability.Functions>,
  Capability.Capability<typeof Common.Capability.BlueprintDefinition>,
];

export default Capability.makeModule<[], BlueprintCapabilities>(() =>
  Effect.succeed([
    Capability.contributes(Common.Capability.Functions, AssistantBlueprint.functions$),
    Capability.contributes(Common.Capability.BlueprintDefinition, AssistantBlueprint.blueprint),

    // TODO(burdon): Factor out.
    Capability.contributes(Common.Capability.Functions, [Research.create, Research.research]),
    Capability.contributes(Common.Capability.BlueprintDefinition, ResearchBlueprint),

    // TODO(burdon): Factor out.
    Capability.contributes(Common.Capability.Functions, [Agent.prompt, EntityExtraction.extract]),
    Capability.contributes(Common.Capability.BlueprintDefinition, WebSearchBlueprint),

    // TODO(burdon): Factor out.
    Capability.contributes(Common.Capability.Functions, [Discord.fetch]),
    Capability.contributes(Common.Capability.BlueprintDefinition, DiscordBlueprint),

    // TODO(burdon): Factor out.
    Capability.contributes(Common.Capability.Functions, [Linear.sync]),
    Capability.contributes(Common.Capability.BlueprintDefinition, LinearBlueprint),
  ]),
);
