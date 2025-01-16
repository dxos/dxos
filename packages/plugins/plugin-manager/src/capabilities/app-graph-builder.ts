//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createIntent, type PluginsContext, SettingsAction } from '@dxos/app-framework';
import { createExtension, type Node } from '@dxos/plugin-graph';

import { MANAGER_PLUGIN } from '../meta';

export default (context: PluginsContext) =>
  contributes(
    Capabilities.AppGraphBuilder,
    createExtension({
      id: MANAGER_PLUGIN,
      filter: (node): node is Node<null> => node.id === 'root',
      actions: () => [
        {
          id: MANAGER_PLUGIN,
          data: async () => {
            const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher);
            await dispatch(createIntent(SettingsAction.Open));
          },
          properties: {
            label: ['open settings label', { ns: MANAGER_PLUGIN }],
            icon: 'ph--gear--regular',
            keyBinding: {
              macos: 'meta+,',
              windows: 'alt+,',
            },
          },
        },
      ],
    }),
  );
