//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
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

import { AssistantBlueprint } from '../blueprints';

export const createBlueprint: () => Blueprint.Blueprint = AssistantBlueprint.make;
export { AssistantBlueprint };

type BlueprintCapabilities = (
  | Capability.Capability<typeof Capabilities.Functions>
  | Capability.Capability<typeof Capabilities.BlueprintDefinition>
)[];

export default Capability.makeModule<[], BlueprintCapabilities>(() => [
  Capability.contributes(Capabilities.Functions, AssistantBlueprint.functions$),
  Capability.contributes(Capabilities.BlueprintDefinition, AssistantBlueprint.blueprint),

  // TODO(burdon): Factor out.
  Capability.contributes(Capabilities.Functions, [Research.create, Research.research]),
  Capability.contributes(Capabilities.BlueprintDefinition, ResearchBlueprint),

  // TODO(burdon): Factor out.
  Capability.contributes(Capabilities.Functions, [Agent.prompt, EntityExtraction.extract]),
  Capability.contributes(Capabilities.BlueprintDefinition, WebSearchBlueprint),

  // TODO(burdon): Factor out.
  Capability.contributes(Capabilities.Functions, [Discord.fetch]),
  Capability.contributes(Capabilities.BlueprintDefinition, DiscordBlueprint),

  // TODO(burdon): Factor out.
  Capability.contributes(Capabilities.Functions, [Linear.sync]),
  Capability.contributes(Capabilities.BlueprintDefinition, LinearBlueprint),
]);
