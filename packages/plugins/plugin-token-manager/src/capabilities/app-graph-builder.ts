//
// Copyright 2025 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import * as Option from 'effect/Option';
import * as pipe from 'effect/pipe';

import { Capabilities, type PluginContext, contributes } from '@dxos/app-framework';
import { createExtension } from '@dxos/plugin-graph';
import { meta as spaceMeta } from '@dxos/plugin-space';

import { meta } from '../meta';

export default (context: PluginContext) =>
  contributes(Capabilities.AppGraphBuilder, [
    createExtension({
      id: `${meta.id}/space-settings`,
      connector: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) => (node.type === `${spaceMeta.id}/settings` ? Option.some(node) : Option.none())),
            Option.map((node) => [
              {
                id: `integrations-${node.id}`,
                type: `${meta.id}/space-settings`,
                data: `${meta.id}/space-settings`,
                properties: {
                  label: ['space panel name', { ns: meta.id }],
                  icon: 'ph--plugs--regular',
                },
              },
            ]),
            Option.getOrElse(() => []),
          ),
        ),
    }),
  ]);
