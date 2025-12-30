//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { ATTENDABLE_PATH_SEPARATOR, PLANK_COMPANION_TYPE } from '@dxos/plugin-deck/types';
import { GraphBuilder } from '@dxos/plugin-graph';
import { Project } from '@dxos/types';

import { meta } from '../../meta';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    return Capability.contributes(Common.Capability.AppGraphBuilder, [
      GraphBuilder.createTypeExtension({
        id: `${meta.id}/triggers`,
        type: Project.Project,
        connector: (project, get) => {
          const nodeId = project.id;
          return [
            {
              id: [nodeId, 'invocations'].join(ATTENDABLE_PATH_SEPARATOR),
              type: PLANK_COMPANION_TYPE,
              data: 'invocations',
              properties: {
                label: ['project invocations label', { ns: meta.id }],
                icon: 'ph--clock-countdown--regular',
                disposition: 'hidden',
              },
            },
            {
              id: [nodeId, 'automation'].join(ATTENDABLE_PATH_SEPARATOR),
              type: PLANK_COMPANION_TYPE,
              data: 'automation',
              properties: {
                label: ['project automation label', { ns: meta.id }],
                icon: 'ph--lightning--regular',
                disposition: 'hidden',
              },
            },
          ];
        },
      }),
    ]);
  }),
);
