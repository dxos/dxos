//
// Copyright 2025 DXOS.org
//

import { templates } from '@dxos/assistant';
import {
  Agent,
  AssistantToolkit,
  Discord,
  DiscordBlueprint,
  EntityExtraction,
  Linear,
  LinearBlueprint,
  Research,
  ResearchBlueprint,
  SystemToolkit,
  WebSearchBlueprint,
} from '@dxos/assistant-toolkit';
import { Blueprint } from '@dxos/blueprints';
import { type FunctionDefinition } from '@dxos/functions';

import { list, load } from '../functions';

// TODO(burdon): Document plugin structure (blueprint, functions, toolkit.).
// TODO(burdon): Test framework for developing functions. Error handling.
// TODO(burdon): Function naming pattern (noun-verb); fully-qualified?

export const deckTools = ['open-item'];

export const functions$: FunctionDefinition[] = [list, load];
export const functions = [
  ...functions$,
  // Factor out.
  Research.create,
  Research.research,
  Agent.prompt,
  EntityExtraction.extract,
  Discord.fetch,
  Linear.sync,
];
export const tools = [...AssistantToolkit.tools, ...SystemToolkit.tools, ...deckTools];

export const Key = 'dxos.org/blueprint/assistant';

export const make = (): Blueprint.Blueprint =>
  Blueprint.make({
    key: Key,
    name: 'Assistant',
    tools: Blueprint.toolDefinitions({ functions, tools }),
    instructions: templates.system,
  });

export const blueprint = make();

export const blueprints = [
  blueprint,
  // Factor out.
  ResearchBlueprint,
  WebSearchBlueprint,
  DiscordBlueprint,
  LinearBlueprint,
];
