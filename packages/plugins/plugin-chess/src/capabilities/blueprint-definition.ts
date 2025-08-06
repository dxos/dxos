//
// Copyright 2025 DXOS.org
//

import { ToolId } from '@dxos/ai';
import { Capabilities, contributes } from '@dxos/app-framework';
import { Blueprint } from '@dxos/blueprints';
import { trim } from '@dxos/util';

import { play } from '../functions';

const functions = [play];

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
        tools: functions.map((tool) => ToolId.make(tool.name)),
      }),
    ),
    contributes(Capabilities.Functions, functions),
  ];
};
