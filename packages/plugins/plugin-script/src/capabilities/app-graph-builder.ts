//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode } from '@dxos/app-toolkit';
import { Script } from '@dxos/functions';
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
            AppNode.makeCompanion({
              id: 'execute',
              label: ['script-test.label', { ns: meta.id }],
              icon: 'ph--terminal--regular',
              data: 'execute',
            }),
          ]),
      }),
      GraphBuilder.createTypeExtension({
        id: `${meta.id}.logs`,
        type: Script.Script,
        connector: () =>
          Effect.succeed([
            AppNode.makeCompanion({
              id: 'logs',
              label: ['script-logs.label', { ns: meta.id }],
              icon: 'ph--clock-countdown--regular',
              data: 'logs',
            }),
          ]),
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
