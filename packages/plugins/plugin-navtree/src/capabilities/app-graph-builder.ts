//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, type PluginsContext, createIntent, LayoutAction } from '@dxos/app-framework';
import { createExtension, type Node } from '@dxos/plugin-graph';

import { COMMANDS_DIALOG, NAVTREE_PLUGIN } from '../meta';

export default (context: PluginsContext) =>
  contributes(
    Capabilities.AppGraphBuilder,
    createExtension({
      id: NAVTREE_PLUGIN,
      filter: (node): node is Node<null> => node.id === 'root',
      actions: () => [
        {
          id: COMMANDS_DIALOG,
          data: async () => {
            const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher);
            await dispatch(
              createIntent(LayoutAction.SetLayout, {
                element: 'dialog',
                component: COMMANDS_DIALOG,
                dialogBlockAlign: 'start',
              }),
            );
          },
          properties: {
            label: ['open commands label', { ns: NAVTREE_PLUGIN }],
            icon: 'ph--magnifying-glass--regular',
            keyBinding: {
              macos: 'meta+k',
              windows: 'ctrl+k',
            },
          },
        },
      ],
    }),
  );
