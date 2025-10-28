//
// Copyright 2025 DXOS.org
//

import { Capabilities, type Capability, contributes } from '@dxos/app-framework';
import { templates } from '@dxos/assistant';
import {
  DISCORD_BLUEPRINT,
  LINEAR_BLUEPRINT,
  RESEARCH_BLUEPRINT,
  WEB_SEARCH_BLUEPRINT,
  agent,
  entityExtraction,
  fetchDiscordMessages,
  researchTools,
  syncLinearIssues,
} from '@dxos/assistant-toolkit';
import { Blueprint } from '@dxos/blueprints';
import { type FunctionDefinition } from '@dxos/functions';

import { analysis, list, load } from '../functions';

import { toolNames } from './toolkit';

// TODO(burdon): Convert tools to functions (see toolkit.ts).
// TODO(burdon): Function naming pattern (noun-verb); fully-qualified?
// TODO(burdon): Document plugin structure (blueprint, functions, toolkit.)
// TODO(burdon): Unit tests for developing functions. Error handling.

// TODO(wittjosiah): Factor out to a generic app-framework blueprint.
const deckTools = ['open-item'];

const functions: FunctionDefinition[] = [analysis, list, load];
const tools = [...toolNames, ...deckTools];

export const BLUEPRINT_KEY = 'dxos.org/blueprint/assistant';

export const createBlueprint = (): Blueprint.Blueprint =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Assistant',
    tools: Blueprint.toolDefinitions({ functions, tools }),
    instructions: templates.system,
  });

const blueprint = createBlueprint();

export default (): Capability<any>[] => [
  contributes(Capabilities.Functions, functions),
  contributes(Capabilities.BlueprintDefinition, blueprint),

  // TODO(burdon): Factor out.
  contributes(Capabilities.Functions, researchTools),
  contributes(Capabilities.BlueprintDefinition, RESEARCH_BLUEPRINT),

  // TODO(burdon): Factor out.
  contributes(Capabilities.Functions, [agent, entityExtraction]),
  contributes(Capabilities.BlueprintDefinition, WEB_SEARCH_BLUEPRINT),

  // TODO(burdon): Move out of assistant.
  contributes(Capabilities.Functions, [syncLinearIssues]),
  contributes(Capabilities.Functions, [fetchDiscordMessages]),
  contributes(Capabilities.BlueprintDefinition, LINEAR_BLUEPRINT),
  contributes(Capabilities.BlueprintDefinition, DISCORD_BLUEPRINT),
];
