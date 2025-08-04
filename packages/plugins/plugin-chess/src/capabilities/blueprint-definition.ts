//
// Copyright 2025 DXOS.org
//

import { ToolId } from '@dxos/ai';
import { Capabilities, contributes } from '@dxos/app-framework';
import { Blueprint } from '@dxos/blueprints';
import { trim } from '@dxos/util';

import { load, play } from '../functions';

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
        `,
        },
        tools: [ToolId.make(load.name), ToolId.make(play.name)],
      }),
    ),
    contributes(Capabilities.Functions, [load, play]),
  ];
};
