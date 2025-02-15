//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, type PluginsContext } from '@dxos/app-framework';
import { createExtension, type Node } from '@dxos/plugin-graph';

import { REGISTRY_PLUGIN } from '../meta';

// TODO(wittjosiah): Deck does not currently support `/` in ids.
export const REGISTRY_ID = 'dxos:plugin-registry';
export const REGISTRY_KEY = 'plugin-registry';

export default (context: PluginsContext) =>
  contributes(Capabilities.AppGraphBuilder, [
    createExtension({
      id: REGISTRY_PLUGIN,
      filter: (node): node is Node<null> => node.id === 'root',
      connector: () => [
        {
          id: REGISTRY_ID,
          type: REGISTRY_PLUGIN,
          properties: {
            label: ['plugin registry label', { ns: REGISTRY_PLUGIN }],
            icon: 'ph--squares-four--regular',
            disposition: 'pin-end',
          },
          nodes: [
            {
              id: `${REGISTRY_KEY}:installed`,
              type: 'category',
              data: `${REGISTRY_KEY}:installed`,
              properties: {
                label: ['installed plugins label', { ns: REGISTRY_PLUGIN }],
                icon: 'ph--check--regular',
                key: REGISTRY_KEY,
              },
            },
            {
              id: `${REGISTRY_KEY}:recommended`,
              type: 'category',
              data: `${REGISTRY_KEY}:recommended`,
              properties: {
                label: ['recommended plugins label', { ns: REGISTRY_PLUGIN }],
                icon: 'ph--star--regular',
                key: REGISTRY_KEY,
              },
            },
            {
              id: `${REGISTRY_KEY}:experimental`,
              type: 'category',
              data: `${REGISTRY_KEY}:experimental`,
              properties: {
                label: ['experimental plugins label', { ns: REGISTRY_PLUGIN }],
                icon: 'ph--flask--regular',
                key: REGISTRY_KEY,
              },
            },
            {
              id: `${REGISTRY_KEY}:community`,
              type: 'category',
              data: `${REGISTRY_KEY}:community`,
              properties: {
                label: ['community plugins label', { ns: REGISTRY_PLUGIN }],
                icon: 'ph--users-three--regular',
                key: REGISTRY_KEY,
              },
            },
          ],
        },
      ],
    }),
    createExtension({
      id: `${REGISTRY_PLUGIN}/actions`,
      filter: (node): node is Node<null> => node.id === REGISTRY_ID,
      actions: () => [
        {
          id: `${REGISTRY_PLUGIN}/load-by-url`,
          data: async () => {},
          properties: {
            label: ['load by url label', { ns: REGISTRY_PLUGIN }],
            icon: 'ph--cloud-arrow-down--regular',
            disabled: true,
          },
        },
      ],
    }),
    createExtension({
      id: `${REGISTRY_PLUGIN}/plugins`,
      resolver: ({ id }) => {
        const manager = context.requestCapability(Capabilities.PluginManager);
        const plugin = manager.plugins.find((plugin) => plugin.meta.id === id.replaceAll(':', '/'));
        if (!plugin) {
          return;
        }

        return {
          id,
          type: 'dxos.org/plugin',
          data: plugin,
          properties: {
            label: plugin.meta.name ?? plugin.meta.id,
            icon: plugin.meta.icon ?? 'ph--circle--regular',
          },
        };
      },
    }),
  ]);
