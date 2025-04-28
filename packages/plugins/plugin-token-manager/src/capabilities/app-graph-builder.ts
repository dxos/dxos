//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, type PluginsContext } from '@dxos/app-framework';
import { createExtension, type Node } from '@dxos/plugin-graph';
import { SPACE_PLUGIN } from '@dxos/plugin-space';
import { type Space } from '@dxos/react-client/echo';

import { TOKEN_MANAGER_PLUGIN } from '../meta';

export default (context: PluginsContext) =>
  contributes(Capabilities.AppGraphBuilder, [
    createExtension({
      id: `${TOKEN_MANAGER_PLUGIN}/space-settings`,
      filter: (node): node is Node<Space> => node.type === `${SPACE_PLUGIN}/settings`,
      connector: ({ node }) => [
        {
          id: `integrations-${node.id}`,
          type: `${TOKEN_MANAGER_PLUGIN}/space-settings`,
          data: `${TOKEN_MANAGER_PLUGIN}/space-settings`,
          properties: {
            label: ['space panel name', { ns: TOKEN_MANAGER_PLUGIN }],
            icon: 'ph--plugs--regular',
          },
        },
      ],
    }),
  ]);
