//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { Operation } from '@dxos/operation';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { GraphBuilder, NodeMatcher } from '@dxos/plugin-graph';

import { meta } from '../../meta';
import { DeckCapabilities } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const stateAtom = yield* Capability.get(DeckCapabilities.State);

    const extensions = yield* GraphBuilder.createExtension({
      id: meta.id,
      match: NodeMatcher.whenRoot,
      actions: (_node, get) =>
        Effect.gen(function* () {
          // NOTE(Zan): This is currently disabled.
          // TODO(Zan): Fullscreen needs to know the active node and provide that to the layout part.
          // const _fullscreen = {
          //   id: `${LayoutAction.UpdateLayout._tag}/fullscreen`,
          //   data: async () => {
          //     const { dispatchPromise: dispatch } = context.get(Capabilities.IntentDispatcher);
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
            data: Effect.fnUntraced(function* () {
              const attention = yield* Capability.get(AttentionCapabilities.Attention);
              const attended = attention.current.at(-1);
              if (attended) {
                yield* Operation.invoke(Common.LayoutOperation.Close, { subject: [attended] });
              }
            }),
            properties: {
              label: ['close current label', { ns: meta.id }],
              icon: 'ph--x--regular',
            },
          };

          const closeOthers = {
            id: `${Common.LayoutOperation.Close.meta.key}/others`,
            data: Effect.fnUntraced(function* () {
              const attention = yield* Capability.get(AttentionCapabilities.Attention);
              const deck = yield* DeckCapabilities.getDeck();
              const attended = attention.current.at(-1);
              const ids = deck.active.filter((id: string) => id !== attended) ?? [];
              yield* Operation.invoke(Common.LayoutOperation.Close, { subject: ids });
            }),
            properties: {
              label: ['close others label', { ns: meta.id }],
              icon: 'ph--x-square--regular',
            },
          };

          const closeAll = {
            id: `${Common.LayoutOperation.Close.meta.key}/all`,
            data: Effect.fnUntraced(function* () {
              const deck = yield* DeckCapabilities.getDeck();
              yield* Operation.invoke(Common.LayoutOperation.Close, { subject: deck.active });
            }),
            properties: {
              label: ['close all label', { ns: meta.id }],
              icon: 'ph--x-circle--regular',
            },
          };

          // Derive state from the atom using the provided `get` function.
          // NOTE: We must compute `deck` from `decks[activeDeck]` because the getter
          // doesn't survive spread operations in state updates.
          const rawState = get(stateAtom);
          const deck = rawState.decks[rawState.activeDeck];
          invariant(deck, `Deck not found: ${rawState.activeDeck}`);

          const toggleSidebar = {
            id: `${Common.LayoutOperation.UpdateSidebar.meta.key}/nav`,
            data: Effect.fnUntraced(function* () {
              yield* Common.Capability.updateAtomValue(DeckCapabilities.State, (s) => ({
                ...s,
                sidebarState: s.sidebarState === 'expanded' ? ('collapsed' as const) : ('expanded' as const),
              }));
            }),
            properties: {
              label: [
                rawState.sidebarState === 'expanded'
                  ? 'collapse navigation sidebar label'
                  : 'open navigation sidebar label',
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

          return !deck.solo ? [closeCurrent, closeOthers, closeAll, toggleSidebar] : [toggleSidebar];
        }),
    });

    return Capability.contributes(Common.Capability.AppGraphBuilder, extensions);
  }),
);
