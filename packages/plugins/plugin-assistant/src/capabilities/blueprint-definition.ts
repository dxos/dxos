//
// Copyright 2025 DXOS.org
//

import { ToolId } from '@dxos/ai';
import { Capabilities, contributes } from '@dxos/app-framework';
import { templates } from '@dxos/assistant';
import { Blueprint } from '@dxos/blueprints';

import { analysis, list, load } from '../functions';

const functions = [analysis, list, load];
const tools: string[] = [
  'get-schemas',
  'add-schema',
  'add-record',
  // 'open-item'
];

export default () => {
  return [
    contributes(
      Capabilities.BlueprintDefinition,
      Blueprint.make({
        key: 'dxos.org/blueprint/assistant',
        name: 'Assistant',
        instructions: templates.system,
        tools: [...functions.map((tool) => ToolId.make(tool.name)), ...tools.map((tool) => ToolId.make(tool))],
      }),
    ),
    contributes(Capabilities.Functions, functions),
  ];
};
