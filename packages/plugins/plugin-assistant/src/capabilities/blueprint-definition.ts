//
// Copyright 2025 DXOS.org
//

import { Capabilities, type Capability, contributes } from '@dxos/app-framework';
import { templates } from '@dxos/assistant';
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

export const BLUEPRINT = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Assistant',
    tools: Blueprint.toolDefinitions({ functions, tools }),
    instructions: templates.system,
  });

export default (): Capability<any>[] => [
  contributes(Capabilities.Functions, functions),
  contributes(Capabilities.BlueprintDefinition, BLUEPRINT),
];
