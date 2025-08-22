//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes } from '@dxos/app-framework';
import { templates } from '@dxos/assistant';
import { Blueprint } from '@dxos/blueprints';
import { type FunctionDefinition } from '@dxos/functions';

import { analysis, list, load } from '../functions';

const functions: FunctionDefinition[] = [analysis, list, load];
const tools = [
  // TODO(wittjosiah): Factor out to an ECHO blueprint.
  'get-schemas',
  'add-schema',
  'add-record',
  // TODO(wittjosiah): Factor out to a generic app-framework blueprint.
  'open-item',
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
