//
// Copyright 2025 DXOS.org
//

import { Capabilities, type Capability, contributes } from '@dxos/app-framework';
import { templates } from '@dxos/assistant';
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
import { Blueprint } from '@dxos/blueprints';
import { type FunctionDefinition } from '@dxos/functions';

import { analysis, list, load } from '../functions';
import { AssistantToolkit, SystemToolkit } from '../toolkits';

// TODO(burdon): Function naming pattern (noun-verb); fully-qualified?
// TODO(burdon): Document plugin structure (blueprint, functions, toolkit.)
// TODO(burdon): Test framework for developing functions. Error handling.
// TODO(burdon): Convert tools to functions? (Deps).

// TODO(wittjosiah): Factor out to a generic app-framework blueprint.
const deckTools = ['open-item'];

const functions: FunctionDefinition[] = [analysis, list, load];
const tools = [...AssistantToolkit.tools, ...SystemToolkit.tools, ...deckTools];

export const ASSISTANT_BLUEPRINT_KEY = 'dxos.org/blueprint/assistant';

export const createBlueprint = (): Blueprint.Blueprint =>
  Blueprint.make({
    key: ASSISTANT_BLUEPRINT_KEY,
    name: 'Assistant',
    tools: Blueprint.toolDefinitions({ functions, tools }),
    instructions: templates.system,
  });

const blueprint = createBlueprint();

export default (): Capability<any>[] => [
  contributes(Capabilities.Functions, functions),
  contributes(Capabilities.BlueprintDefinition, blueprint),

  // TODO(burdon): Factor out.
  contributes(Capabilities.Functions, [Research.create, Research.update, Research.research]),
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
