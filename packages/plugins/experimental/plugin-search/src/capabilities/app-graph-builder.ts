//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createIntent, type PluginsContext } from '@dxos/app-framework';
import { createExtension, type Node } from '@dxos/plugin-graph';

import { SEARCH_PLUGIN } from '../meta';
import { SearchAction } from '../types';

export default (context: PluginsContext) =>
  contributes(
    Capabilities.AppGraphBuilder,
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
  );
