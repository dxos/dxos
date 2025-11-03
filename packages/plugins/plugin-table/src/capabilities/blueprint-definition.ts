//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes } from '@dxos/app-framework';
import { Blueprint, Template } from '@dxos/blueprints';
import { type FunctionDefinition } from '@dxos/functions';
import { trim } from '@dxos/util';

const functions: FunctionDefinition[] = [];
const tools: string[] = [];

// TODO(wittjosiah): Remove? All table ops other than resizing columns are more generically handled as schema ops.
export default () => [
  contributes(Capabilities.Functions, functions),
  contributes(
    Capabilities.BlueprintDefinition,
    Blueprint.make({
      key: 'dxos.org/blueprint/table',
      name: 'Table',
      tools: Blueprint.toolDefinitions({ functions, tools }),
      instructions: Template.make({
        source: trim`
            You can create and update tables to show data in sorted columns defined by schema.
          `,
      }),
    }),
  ),
];
