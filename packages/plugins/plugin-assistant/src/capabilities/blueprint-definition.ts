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
  createResearchNote,
  entityExtraction,
  fetchDiscordMessages,
  research,
  syncLinearIssues,
} from '@dxos/assistant-toolkit';
import { Blueprint } from '@dxos/blueprints';
import { type FunctionDefinition } from '@dxos/functions';

import { analysis, list, load } from '../functions';

const functions: FunctionDefinition[] = [analysis, list, load];
const tools = [
  'add-to-context',
  // TODO(wittjosiah): Factor out to an ECHO blueprint.
  'get-schemas',
  'add-schema',
  'create-record',
  // TODO(wittjosiah): Factor out to a generic app-framework blueprint.
  'open-item',
  // TODO(burdon): Anthropic only.
  //  https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/text-editor-tool#example-str-replace-command
  //  AI_TOOL_NOT_FOUND: str_replace_based_edit_tool
  // 'str_replace_based_edit_tool',
];

export const BLUEPRINT_KEY = 'dxos.org/blueprint/assistant';

export const createBlueprint = (): Blueprint.Blueprint =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Assistant',
    tools: Blueprint.toolDefinitions({ functions, tools }),
    instructions: templates.system,
  });

const blueprint = createBlueprint();

// TODO(dmaretskyi): Consider splitting into multiple modules.
export default (): Capability<any>[] => [
  contributes(Capabilities.Functions, functions),
  contributes(Capabilities.Functions, [agent]),
  contributes(Capabilities.Functions, [research, createResearchNote, entityExtraction]),
  contributes(Capabilities.BlueprintDefinition, blueprint),
  contributes(Capabilities.BlueprintDefinition, RESEARCH_BLUEPRINT),
  // TODO(burdon): Move out of assistant.
  contributes(Capabilities.Functions, [syncLinearIssues]),
  contributes(Capabilities.Functions, [fetchDiscordMessages]),
  contributes(Capabilities.BlueprintDefinition, LINEAR_BLUEPRINT),
  contributes(Capabilities.BlueprintDefinition, DISCORD_BLUEPRINT),
  contributes(Capabilities.BlueprintDefinition, WEB_SEARCH_BLUEPRINT),
];
