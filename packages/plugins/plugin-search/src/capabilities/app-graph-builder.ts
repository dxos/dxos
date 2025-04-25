//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createIntent, type PluginsContext } from '@dxos/app-framework';
import { ClientCapabilities } from '@dxos/plugin-client';
import { ATTENDABLE_PATH_SEPARATOR, DECK_COMPANION_TYPE } from '@dxos/plugin-deck/types';
import { createExtension, type Node } from '@dxos/plugin-graph';
import { parseId } from '@dxos/react-client/echo';

import { SEARCH_PLUGIN } from '../meta';
import { SearchAction } from '../types';

export default (context: PluginsContext) =>
  contributes(Capabilities.AppGraphBuilder, [
    createExtension({
      id: `${SEARCH_PLUGIN}/space-search`,
      filter: (node): node is Node<null> => node.id === 'root',
      connector: ({ node }) => {
        const layout = context.requestCapability(Capabilities.Layout);
        const client = context.requestCapability(ClientCapabilities.Client);
        const { spaceId } = parseId(layout.workspace);
        const space = spaceId ? client.spaces.get(spaceId) : null;

        return [
          {
            id: [node.id, 'search'].join(ATTENDABLE_PATH_SEPARATOR),
            type: DECK_COMPANION_TYPE,
            data: space,
            properties: {
              label: ['search label', { ns: SEARCH_PLUGIN }],
              icon: 'ph--magnifying-glass--regular',
              disposition: 'hidden',
            },
          },
        ];
      },
    }),
    createExtension({
      id: SEARCH_PLUGIN,
      filter: (node): node is Node<null> => node.id === 'root',
      actions: () => [
        {
          id: SearchAction.OpenSearch._tag,
          data: async () => {
            const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher);
            await dispatch(createIntent(SearchAction.OpenSearch));
          },
          properties: {
            label: ['search action label', { ns: SEARCH_PLUGIN }],
            icon: 'ph--magnifying-glass--regular',
            keyBinding: {
              macos: 'shift+meta+f',
              windows: 'shift+alt+f',
            },
            testId: 'searchPlugin.search',
          },
        },
      ],
    }),
  ]);
