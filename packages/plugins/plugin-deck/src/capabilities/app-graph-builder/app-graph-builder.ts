//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { CreateAtom, GraphBuilder, NodeMatcher } from '@dxos/plugin-graph';

import { meta } from '../../meta';
import { DeckCapabilities } from '../../types';

export default Capability.makeModule((context) =>
  Effect.succeed(
    Capability.contributes(
      Common.Capability.AppGraphBuilder,
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
            id: `${Common.LayoutOperation.Close.meta.key}/current`,
            data: () => {
              const attention = context.getCapability(AttentionCapabilities.Attention);
              const attended = attention.current.at(-1);
              if (attended) {
                const { invokeSync } = context.getCapability(Common.Capability.OperationInvoker);
                invokeSync(Common.LayoutOperation.Close, { subject: [attended] });
              }
            },
            properties: {
              label: ['close current label', { ns: meta.id }],
              icon: 'ph--x--regular',
            },
          };

          const closeOthers = {
            id: `${Common.LayoutOperation.Close.meta.key}/others`,
            data: () => {
              const { invokeSync } = context.getCapability(Common.Capability.OperationInvoker);
              const attention = context.getCapability(AttentionCapabilities.Attention);
              const attended = attention.current.at(-1);
              const ids = state.deck.active.filter((id) => id !== attended) ?? [];
              invokeSync(Common.LayoutOperation.Close, { subject: ids });
            },
            properties: {
              label: ['close others label', { ns: meta.id }],
              icon: 'ph--x-square--regular',
            },
          };

          const closeAll = {
            id: `${Common.LayoutOperation.Close.meta.key}/all`,
            data: () => {
              const { invokeSync } = context.getCapability(Common.Capability.OperationInvoker);
              invokeSync(Common.LayoutOperation.Close, { subject: state.deck.active });
            },
            properties: {
              label: ['close all label', { ns: meta.id }],
              icon: 'ph--x-circle--regular',
            },
          };

          const toggleSidebar = {
            id: `${Common.LayoutOperation.UpdateSidebar.meta.key}/nav`,
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
  ),
);
