//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes } from '@dxos/app-framework';
import { templates } from '@dxos/assistant';
import { Blueprint } from '@dxos/blueprints';

import { analysis, list, load } from '../functions';

const functions = [analysis, list, load];
const tools: string[] = [
  'get-schemas',
  'create-record',
  // 'open-item'
];

export default () => {
  return [
    contributes(Capabilities.Functions, functions),
    contributes(
      Capabilities.BlueprintDefinition,
      Blueprint.make({
        key: 'dxos.org/blueprint/assistant',
        name: 'Assistant',
        tools: Blueprint.toolDefinitions({ functions, tools }),
        instructions: templates.system,
      }),
    ),
  ];
};
