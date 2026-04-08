//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode } from '@dxos/app-toolkit';
import { GraphBuilder } from '@dxos/plugin-graph';
import { Pipeline } from '@dxos/types';

import { meta } from '#meta';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      GraphBuilder.createTypeExtension({
        id: 'triggers',
        type: Pipeline.Pipeline,
        connector: () =>
          Effect.succeed([
            AppNode.makeCompanion({
              id: 'invocations',
              label: ['pipeline-invocations.label', { ns: meta.id }],
              icon: 'ph--clock-countdown--regular',
              data: 'invocations',
            }),
            AppNode.makeCompanion({
              id: 'automation',
              label: ['pipeline-automation.label', { ns: meta.id }],
              icon: 'ph--lightning--regular',
              data: 'automation',
            }),
          ]),
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
