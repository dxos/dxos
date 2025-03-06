//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createIntent, LayoutAction, type PluginsContext } from '@dxos/app-framework';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { createExtension, type Node, ROOT_ID } from '@dxos/plugin-graph';

import { DeckCapabilities } from './capabilities';
import { DECK_PLUGIN } from '../meta';

export default (context: PluginsContext) =>
  contributes(
    Capabilities.AppGraphBuilder,
    createExtension({
      id: DECK_PLUGIN,
      filter: (node): node is Node<null> => node.id === ROOT_ID,
      actions: () => {
        const state = context.requestCapability(DeckCapabilities.MutableDeckState);

        // NOTE(Zan): This is currently disabled.
        // TODO(Zan): Fullscreen needs to know the active node and provide that to the layout part.
        const _fullscreen = {
          id: `${LayoutAction.UpdateLayout._tag}/fullscreen`,
          data: async () => {
            const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher);
            await dispatch(createIntent(LayoutAction.SetLayoutMode, { part: 'mode', options: { mode: 'fullscreen' } }));
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
          id: `${LayoutAction.Close._tag}/current`,
          data: async () => {
            const attention = context.requestCapability(AttentionCapabilities.Attention);
            const attended = attention.current.at(-1);
            if (attended) {
              const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher);
              await dispatch(
                createIntent(LayoutAction.Close, { part: 'main', subject: [attended], options: { state: false } }),
              );
            }
          },
          properties: {
            label: ['close current label', { ns: DECK_PLUGIN }],
            icon: 'ph--x--regular',
          },
        };

        const closeOthers = {
          id: `${LayoutAction.Close._tag}/others`,
          data: async () => {
            const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher);
            const attention = context.requestCapability(AttentionCapabilities.Attention);
            const attended = attention.current.at(-1);
            const ids = state.deck.active.filter((id) => id !== attended) ?? [];
            await dispatch(createIntent(LayoutAction.Close, { part: 'main', subject: ids, options: { state: false } }));
          },
          properties: {
            label: ['close others label', { ns: DECK_PLUGIN }],
            icon: 'ph--x-square--regular',
          },
        };

        const closeAll = {
          id: `${LayoutAction.Close._tag}/all`,
          data: async () => {
            const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher);
            await dispatch(
              createIntent(LayoutAction.Close, {
                part: 'main',
                subject: state.deck.active,
                options: { state: false },
              }),
            );
          },
          properties: {
            label: ['close all label', { ns: DECK_PLUGIN }],
            icon: 'ph--x-circle--regular',
          },
        };

        const toggleSidebar = {
          id: `${LayoutAction.UpdateSidebar._tag}/nav`,
          data: async () => {
            state.sidebarState = state.sidebarState === 'expanded' ? 'collapsed' : 'expanded';
          },
          properties: {
            label: [
              state.sidebarState === 'expanded' ? 'collapse navigation sidebar label' : 'open navigation sidebar label',
              { ns: DECK_PLUGIN },
            ],
            icon: 'ph--sidebar--regular',
            keyBinding: {
              macos: 'meta+b',
            },
            disposition: 'pin-end',
            l0Breakpoint: 'lg',
          },
        };

        return !state.deck.solo ? [closeCurrent, closeOthers, closeAll, toggleSidebar] : [toggleSidebar];
      },
    }),
  );
