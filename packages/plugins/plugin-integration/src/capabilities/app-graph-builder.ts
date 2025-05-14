//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, type PluginsContext } from '@dxos/app-framework';
import { createExtension, type Node } from '@dxos/plugin-graph';
import { SPACE_PLUGIN } from '@dxos/plugin-space';

import { INTEGRATION_PLUGIN } from '../meta';

export default (context: PluginsContext) =>
  contributes(Capabilities.AppGraphBuilder, [
    createExtension({
      id: `${INTEGRATION_PLUGIN}/space-settings`,
      filter: (node): node is Node<null> => node.type === `${SPACE_PLUGIN}/settings`,
      connector: ({ node }) => [
        {
          id: `integrations-${node.id}`,
          type: `${INTEGRATION_PLUGIN}/space-settings`,
          data: `${INTEGRATION_PLUGIN}/space-settings`,
          properties: {
            label: ['space panel name', { ns: INTEGRATION_PLUGIN }],
            icon: 'ph--plugs--regular',
          },
        },
      ],
    }),
  ]);
