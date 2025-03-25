//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, type PluginsContext } from '@dxos/app-framework';
import { createExtension, type Node } from '@dxos/plugin-graph';
import { type Space, isSpace } from '@dxos/react-client/echo';

import { MEETING_PLUGIN } from '../meta';

export default (context: PluginsContext) =>
  contributes(Capabilities.AppGraphBuilder, [
    createExtension({
      id: `${MEETING_PLUGIN}/space`,
      filter: (node): node is Node<Space> => isSpace(node.data),
      connector: ({ node }) => {
        const space = node.data;
        return [
          {
            id: `${space.id}-calls`,
            type: `${MEETING_PLUGIN}/space`,
            data: { space, type: `${MEETING_PLUGIN}/space` },
            properties: {
              label: ['calls label', { ns: MEETING_PLUGIN }],
              icon: 'ph--phone-call--regular',
            },
          },
        ];
      },
    }),
  ]);
