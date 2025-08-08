//
// Copyright 2025 DXOS.org
//

import { ToolId } from '@dxos/ai';
import { Capabilities, contributes } from '@dxos/app-framework';
import { templates } from '@dxos/assistant';
import { Blueprint } from '@dxos/blueprints';

import { analysis, load } from '../functions';

const functions = [analysis, load];

export default () => [
  contributes(
    Capabilities.BlueprintDefinition,
    Blueprint.make({
      key: 'dxos.org/blueprint/assistant',
      name: 'Assistant',
      instructions: templates.system,
      tools: [
        ...functions.map((tool) => ToolId.make(tool.name)),
        // TODO(wittjosiah): Factor out.
        // ToolId.make('show'),
      ],
    }),
  ),
  contributes(Capabilities.Functions, functions),
];
