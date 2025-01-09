//
// Copyright 2025 DXOS.org
//

import { createIntent, LayoutAction, NavigationAction, openIds } from '@dxos/app-framework';
import { Capabilities, contributes, type PluginsContext } from '@dxos/app-framework/next';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { createExtension, type Node, ROOT_ID } from '@dxos/plugin-graph';

import { DECK_PLUGIN } from '../../meta';

export default (context: PluginsContext) =>
  contributes(
    Capabilities.AppGraphBuilder,
    createExtension({
      id: DECK_PLUGIN,
      filter: (node): node is Node<null> => node.id === ROOT_ID,
      actions: () => {
        const layout = context.requestCapability(Capabilities.Layout)[0];
        const location = context.requestCapability(Capabilities.Location)[0];
        const attention = context.requestCapability(AttentionCapabilities.Attention)[0];
        const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher)[0] ?? {};

        // NOTE(Zan): This is currently disabled.
        // TODO(Zan): Fullscreen needs to know the active node and provide that to the layout part.
        const _fullscreen = {
          id: `${LayoutAction.SetLayoutMode._tag}/fullscreen`,
          data: async () => {
            await dispatch(createIntent(LayoutAction.SetLayoutMode, { layoutMode: 'fullscreen' }));
          },
          properties: {
            label: ['toggle fullscreen label', { ns: DECK_PLUGIN }],
            icon: 'ph--arrows-out--regular',
            keyBinding: {
              macos: 'ctrl+meta+f',
              windows: 'shift+ctrl+f',
            },
          },
        };

        const closeCurrent = {
          id: `${NavigationAction.Close._tag}/current`,
          data: async () => {
            const attended = attention.current.at(-1);
            if (attended) {
              await dispatch(createIntent(NavigationAction.Close, { activeParts: { main: [attended] } }));
            }
          },
          properties: {
            label: ['close current label', { ns: DECK_PLUGIN }],
            icon: 'ph--x--regular',
          },
        };

        const closeOthers = {
          id: `${NavigationAction.Close._tag}/others`,
          data: async () => {
            const attended = attention.current.at(-1);
            const ids = openIds(location.active, ['main']).filter((id) => id !== attended);
            await dispatch(
              createIntent(NavigationAction.Close, {
                activeParts: { main: ids },
              }),
            );
          },
          properties: {
            label: ['close others label', { ns: DECK_PLUGIN }],
            icon: 'ph--x-square--regular',
          },
        };

        const closeAll = {
          id: `${NavigationAction.Close._tag}/all`,
          data: async () => {
            await dispatch(
              createIntent(NavigationAction.Close, {
                activeParts: { main: openIds(location.active, ['main']) },
              }),
            );
          },
          properties: {
            label: ['close all label', { ns: DECK_PLUGIN }],
            icon: 'ph--x-circle--regular',
          },
        };

        return layout.layoutMode === 'deck' ? [closeCurrent, closeOthers, closeAll] : [];
      },
    }),
  );
