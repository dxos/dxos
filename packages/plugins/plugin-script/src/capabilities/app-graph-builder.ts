//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Script } from '@dxos/functions';
import { PLANK_COMPANION_TYPE } from '@dxos/plugin-deck/types';
import { GraphBuilder } from '@dxos/plugin-graph';

import { meta } from '#meta';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      GraphBuilder.createTypeExtension({
        id: `${meta.id}.execute`,
        type: Script.Script,
        connector: () =>
          Effect.succeed([
            {
              id: 'execute',
              type: PLANK_COMPANION_TYPE,
              data: 'execute',
              properties: {
                label: ['script-test.label', { ns: meta.id }],
                icon: 'ph--terminal--regular',
                disposition: 'hidden',
              },
            },
          ]),
      }),
      GraphBuilder.createTypeExtension({
        id: `${meta.id}.logs`,
        type: Script.Script,
        connector: () =>
          Effect.succeed([
            {
              id: 'logs',
              type: PLANK_COMPANION_TYPE,
              data: 'logs',
              properties: {
                label: ['script-logs.label', { ns: meta.id }],
                icon: 'ph--clock-countdown--regular',
                disposition: 'hidden',
              },
            },
          ]),
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
