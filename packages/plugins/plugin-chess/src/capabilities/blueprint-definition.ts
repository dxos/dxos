//
// Copyright 2025 DXOS.org
//

import { ToolId } from '@dxos/ai';
import { Capabilities, contributes } from '@dxos/app-framework';
import { Blueprint } from '@dxos/blueprints';
import { trim } from '@dxos/util';

import { load } from '../functions';

// TODO(burdon): Get object from bindings.

export default () => {
  return [
    contributes(
      Capabilities.BlueprintDefinition,
      Blueprint.make({
        key: 'dxos.org/blueprint/chess',
        name: 'Chess',
        instructions: {
          source: trim`
          You are an expert chess player.
          When a game is referenced load it using the load tool to get the PGN string.
        `,
        },
        tools: [ToolId.make(load.name)],
      }),
    ),
    contributes(Capabilities.Functions, [load]),
  ];
};
