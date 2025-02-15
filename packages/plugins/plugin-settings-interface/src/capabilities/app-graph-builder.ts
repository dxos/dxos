//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createIntent, type PluginsContext, SettingsAction } from '@dxos/app-framework';
import { createExtension, type Node } from '@dxos/plugin-graph';

import { SETTINGS_INTERFACE_PLUGIN } from '../meta';

export default (context: PluginsContext) =>
  contributes(
    Capabilities.AppGraphBuilder,
    createExtension({
      id: SETTINGS_INTERFACE_PLUGIN,
      filter: (node): node is Node<null> => node.id === 'root',
      actions: () => [
        {
          id: SETTINGS_INTERFACE_PLUGIN,
          data: async () => {
            const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher);
            await dispatch(createIntent(SettingsAction.Open));
          },
          properties: {
            label: ['open settings label', { ns: SETTINGS_INTERFACE_PLUGIN }],
            testId: 'treeView.openSettings',
            icon: 'ph--gear--regular',
            disposition: 'pin-end',
            position: 'fallback',
            keyBinding: {
              macos: 'meta+,',
              windows: 'alt+,',
            },
          },
        },
      ],
    }),
  );
