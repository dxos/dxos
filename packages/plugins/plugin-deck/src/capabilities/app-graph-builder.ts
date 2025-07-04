//
// Copyright 2025 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import { Option, pipe } from 'effect';

import { Capabilities, contributes, createIntent, LayoutAction, type PluginContext } from '@dxos/app-framework';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { createExtension, ROOT_ID, rxFromSignal } from '@dxos/plugin-graph';

import { DeckCapabilities } from './capabilities';
import { DECK_PLUGIN } from '../meta';

export default (context: PluginContext) =>
  contributes(
    Capabilities.AppGraphBuilder,
    createExtension({
      id: DECK_PLUGIN,
      actions: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) => (node.id === ROOT_ID ? Option.some(node) : Option.none())),
            Option.map(() => {
              const state = context.getCapability(DeckCapabilities.MutableDeckState);

              // NOTE(Zan): This is currently disabled.
              // TODO(Zan): Fullscreen needs to know the active node and provide that to the layout part.
              const _fullscreen = {
                id: `${LayoutAction.UpdateLayout._tag}/fullscreen`,
                data: async () => {
                  const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
                  await dispatch(
                    createIntent(LayoutAction.SetLayoutMode, { part: 'mode', options: { mode: 'fullscreen' } }),
                  );
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
                  label: ['close current label', { ns: DECK_PLUGIN }],
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
                  label: ['close others label', { ns: DECK_PLUGIN }],
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
                    get(
                      rxFromSignal(() =>
                        state.sidebarState === 'expanded'
                          ? 'collapse navigation sidebar label'
                          : 'open navigation sidebar label',
                      ),
                    ),
                    { ns: DECK_PLUGIN },
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
                rxFromSignal(() =>
                  !state.deck.solo ? [closeCurrent, closeOthers, closeAll, toggleSidebar] : [toggleSidebar],
                ),
              );
            }),
            Option.getOrElse(() => []),
          ),
        ),
    }),
  );
