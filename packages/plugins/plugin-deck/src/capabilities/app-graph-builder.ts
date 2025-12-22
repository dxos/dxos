//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';

import { Capabilities, LayoutAction, type PluginContext, contributes, createIntent, defineCapabilityModule } from '@dxos/app-framework';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { ROOT_ID, atomFromSignal, createExtension } from '@dxos/plugin-graph';

import { meta } from '../meta';

import { DeckCapabilities } from './capabilities';

export default defineCapabilityModule((context: PluginContext) =>
  contributes(
    Capabilities.AppGraphBuilder,
    createExtension({
      id: meta.id,
      actions: (node) =>
        Atom.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) => (node.id === ROOT_ID ? Option.some(node) : Option.none())),
            Option.map(() => {
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
                  await dispatch(
                    createIntent(LayoutAction.Close, { part: 'main', subject: ids, options: { state: false } }),
                  );
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
                      atomFromSignal(() =>
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
                atomFromSignal(() =>
                  !state.deck.solo ? [closeCurrent, closeOthers, closeAll, toggleSidebar] : [toggleSidebar],
                ),
              );
            }),
            Option.getOrElse(() => []),
          ),
        ),
    }),
  ));
