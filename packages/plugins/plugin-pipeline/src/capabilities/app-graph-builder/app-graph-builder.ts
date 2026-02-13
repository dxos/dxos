//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { ATTENDABLE_PATH_SEPARATOR, PLANK_COMPANION_TYPE } from '@dxos/plugin-deck/types';
import { GraphBuilder } from '@dxos/plugin-graph';
import { Pipeline } from '@dxos/types';

import { meta } from '../../meta';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      GraphBuilder.createTypeExtension({
        id: `${meta.id}/triggers`,
        type: Pipeline.Pipeline,
        connector: (pipeline) => {
          const nodeId = pipeline.id;
          return Effect.succeed([
            {
              id: [nodeId, 'invocations'].join(ATTENDABLE_PATH_SEPARATOR),
              type: PLANK_COMPANION_TYPE,
              data: 'invocations',
              properties: {
                label: ['pipeline invocations label', { ns: meta.id }],
                icon: 'ph--clock-countdown--regular',
                disposition: 'hidden',
              },
            },
            {
              id: [nodeId, 'automation'].join(ATTENDABLE_PATH_SEPARATOR),
              type: PLANK_COMPANION_TYPE,
              data: 'automation',
              properties: {
                label: ['pipeline automation label', { ns: meta.id }],
                icon: 'ph--lightning--regular',
                disposition: 'hidden',
              },
            },
          ]);
        },
      }),
    ]);

    return Capability.contributes(Common.Capability.AppGraphBuilder, extensions);
  }),
);
