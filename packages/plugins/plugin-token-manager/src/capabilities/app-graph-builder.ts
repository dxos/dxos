//
// Copyright 2025 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import { Option, pipe } from 'effect';

import { Capabilities, type PluginContext, contributes } from '@dxos/app-framework';
import { createExtension } from '@dxos/plugin-graph';
import { SPACE_PLUGIN } from '@dxos/plugin-space';

import { TOKEN_MANAGER_PLUGIN } from '../meta';

export default (context: PluginContext) =>
  contributes(Capabilities.AppGraphBuilder, [
    createExtension({
      id: `${TOKEN_MANAGER_PLUGIN}/space-settings`,
      connector: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) => (node.type === `${SPACE_PLUGIN}/settings` ? Option.some(node) : Option.none())),
            Option.map((node) => [
              {
                id: `integrations-${node.id}`,
                type: `${TOKEN_MANAGER_PLUGIN}/space-settings`,
                data: `${TOKEN_MANAGER_PLUGIN}/space-settings`,
                properties: {
                  label: ['space panel name', { ns: TOKEN_MANAGER_PLUGIN }],
                  icon: 'ph--plugs--regular',
                },
              },
            ]),
            Option.getOrElse(() => []),
          ),
        ),
    }),
  ]);
