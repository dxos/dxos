//
// Copyright 2025 DXOS.org
//

import { Capabilities, type Capability, contributes } from '@dxos/app-framework';
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

export default (): (
  | Capability<typeof Capabilities.Functions>
  | Capability<typeof Capabilities.BlueprintDefinition>
)[] => [
  contributes(Capabilities.Functions, AssistantBlueprint.functions$),
  contributes(Capabilities.BlueprintDefinition, AssistantBlueprint.blueprint),

  // TODO(burdon): Factor out.
  contributes(Capabilities.Functions, [Research.create, Research.research]),
  contributes(Capabilities.BlueprintDefinition, ResearchBlueprint),

  // TODO(burdon): Factor out.
  contributes(Capabilities.Functions, [Agent.prompt, EntityExtraction.extract]),
  contributes(Capabilities.BlueprintDefinition, WebSearchBlueprint),

  // TODO(burdon): Factor out.
  contributes(Capabilities.Functions, [Discord.fetch]),
  contributes(Capabilities.BlueprintDefinition, DiscordBlueprint),

  // TODO(burdon): Factor out.
  contributes(Capabilities.Functions, [Linear.sync]),
  contributes(Capabilities.BlueprintDefinition, LinearBlueprint),
];
