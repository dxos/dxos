//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability, LayoutAction, createIntent } from '@dxos/app-framework';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { CreateAtom, GraphBuilder, NodeMatcher } from '@dxos/plugin-graph';

import { meta } from '../meta';

import { DeckCapabilities } from './capabilities';

export default Capability.makeModule((context) =>
  Capability.contributes(
    Capabilities.AppGraphBuilder,
    GraphBuilder.createExtension({
      id: meta.id,
      match: NodeMatcher.whenRoot,
      actions: (node, get) => {
        const state = context.getCapability(DeckCapabilities.MutableDeckState);

        // NOTE(Zan): This is currently disabled.
        // TODO(Zan): Fullscreen needs to know the active node and provide that to the layout part.
        // const _fullscreen = {
        //   id: `${LayoutAction.UpdateLayout._tag}/fullscreen`,
        //   data: async () => {
        //     const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
        //     await dispatch(
        //       createIntent(LayoutAction.SetLayoutMode, { part: 'mode', options: { mode: 'fullscreen' } }),
        //     );
        //   },
        //   properties: {
        //     label: ['toggle fullscreen label', { ns: meta.id }],
        //     icon: 'ph--arrows-out--regular',
        //     keyBinding: {
        //       macos: 'ctrl+meta+f',
        //       windows: 'shift+ctrl+f',
        //     },
        //   },
        // };

        const closeCurrent = {
          id: `${LayoutAction.Close._tag}/current`,
          data: async () => {
            const attention = context.getCapability(AttentionCapabilities.Attention);
            const attended = attention.current.at(-1);
            if (attended) {
              const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
              await dispatch(
                createIntent(LayoutAction.Close, {
                  part: 'main',
                  subject: [attended],
                  options: { state: false },
                }),
              );
            }
          },
          properties: {
            label: ['close current label', { ns: meta.id }],
            icon: 'ph--x--regular',
          },
        };

        const closeOthers = {
          id: `${LayoutAction.Close._tag}/others`,
          data: async () => {
            const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
            const attention = context.getCapability(AttentionCapabilities.Attention);
            const attended = attention.current.at(-1);
            const ids = state.deck.active.filter((id) => id !== attended) ?? [];
            await dispatch(createIntent(LayoutAction.Close, { part: 'main', subject: ids, options: { state: false } }));
          },
          properties: {
            label: ['close others label', { ns: meta.id }],
            icon: 'ph--x-square--regular',
          },
        };

        const closeAll = {
          id: `${LayoutAction.Close._tag}/all`,
          data: async () => {
            const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
            await dispatch(
              createIntent(LayoutAction.Close, {
                part: 'main',
                subject: state.deck.active,
                options: { state: false },
              }),
            );
          },
          properties: {
            label: ['close all label', { ns: meta.id }],
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
              get(
                CreateAtom.fromSignal(() =>
                  state.sidebarState === 'expanded'
                    ? 'collapse navigation sidebar label'
                    : 'open navigation sidebar label',
                ),
              ),
              { ns: meta.id },
            ],
            icon: 'ph--sidebar--regular',
            keyBinding: {
              macos: "meta+'",
            },
            disposition: 'pin-end',
            position: 'hoist',
            l0Breakpoint: 'lg',
          },
        };

        return get(
          CreateAtom.fromSignal(() =>
            !state.deck.solo ? [closeCurrent, closeOthers, closeAll, toggleSidebar] : [toggleSidebar],
          ),
        );
      },
    }),
  ),
);
