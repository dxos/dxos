//
// Copyright 2025 DXOS.org
//

import { createIntent } from '@dxos/app-framework';
import { Capabilities, contributes, type PluginsContext } from '@dxos/app-framework/next';
import { createExtension, type Node } from '@dxos/plugin-graph';

import { CLIENT_PLUGIN } from '../meta';
import { ClientAction } from '../types';

export default (context: PluginsContext) =>
  contributes(
    Capabilities.AppGraphBuilder,
    createExtension({
      id: CLIENT_PLUGIN,
      filter: (node): node is Node<null> => node.id === 'root',
      actions: () => [
        {
          id: `${CLIENT_PLUGIN}/open-shell`,
          data: async () => {
            const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher);
            await dispatch(createIntent(ClientAction.ShareIdentity));
          },
          properties: {
            label: ['open shell label', { ns: CLIENT_PLUGIN }],
            icon: 'ph--address-book--regular',
            keyBinding: {
              macos: 'meta+shift+.',
              // TODO(wittjosiah): Test on windows to see if it behaves the same as linux.
              windows: 'alt+shift+.',
              linux: 'alt+shift+>',
            },
            testId: 'clientPlugin.openShell',
          },
        },
      ],
    }),
  );
