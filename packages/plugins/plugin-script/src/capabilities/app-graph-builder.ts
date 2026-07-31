//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as Script from '@dxos/compute/Script';
import { GraphBuilder } from '@dxos/plugin-graph';

import { meta } from '#meta';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      GraphBuilder.createTypeExtension({
        id: 'execute',
        type: Script.Script,
        connector: () =>
          Effect.succeed([
            AppNode.makeCompanion({
              variant: 'execute',
              label: ['script-test.label', { ns: meta.profile.key }],
              icon: 'ph--terminal--regular',
              data: 'execute',
            }),
          ]),
      }),
      GraphBuilder.createTypeExtension({
        id: 'logs',
        type: Script.Script,
        connector: () =>
          Effect.succeed([
            AppNode.makeCompanion({
              variant: 'logs',
              label: ['script-logs.label', { ns: meta.profile.key }],
              icon: 'ph--clock-countdown--regular',
              data: 'logs',
            }),
          ]),
      }),
    ]);

    return Capability.contribute(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
