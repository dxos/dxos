//
// Copyright 2025 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import * as Option from 'effect/Option';
import * as pipe from 'effect/pipe';

import { Capabilities, type PluginContext, contributes } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { ATTENDABLE_PATH_SEPARATOR, PLANK_COMPANION_TYPE } from '@dxos/plugin-deck/types';
import { createExtension } from '@dxos/plugin-graph';
import { DataType } from '@dxos/schema';

import { meta } from '../meta';

export default (context: PluginContext) =>
  contributes(Capabilities.AppGraphBuilder, [
    createExtension({
      id: `${meta.id}/triggers`,
      connector: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) => (Obj.instanceOf(DataType.Project, node.data) ? Option.some(node) : Option.none())),
            Option.map((node) => [
              {
                id: [node.id, 'invocations'].join(ATTENDABLE_PATH_SEPARATOR),
                type: PLANK_COMPANION_TYPE,
                data: 'invocations',
                properties: {
                  label: ['project invocations label', { ns: meta.id }],
                  icon: 'ph--clock-countdown--regular',
                  disposition: 'hidden',
                },
              },
              {
                id: [node.id, 'automation'].join(ATTENDABLE_PATH_SEPARATOR),
                type: PLANK_COMPANION_TYPE,
                data: 'automation',
                properties: {
                  label: ['project automation label', { ns: meta.id }],
                  icon: 'ph--lightning--regular',
                  disposition: 'hidden',
                },
              },
            ]),
            Option.getOrElse(() => []),
          ),
        ),
    }),
  ]);
