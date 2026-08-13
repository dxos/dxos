//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';
import { Position } from '@dxos/util';

import { meta } from '#meta';
import { DeckCapabilities } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Read reactively so the extension establishes a dependency and heals once these
    // capabilities land (dependency modules contribute individually, not batched per wave).
    const attentionAtom = yield* Capability.atom(AttentionCapabilities.Attention);
    const deckStateAtom = yield* Capability.atom(DeckCapabilities.State);

    const extensions = yield* Effect.all([
      AppGraphBuilder.createExtension({
        id: 'notFound',
        match: GraphNodeMatcher.whenRoot,
        connector: () => Effect.succeed([AppNode.makeNotFound()]),
      }),

      AppGraphBuilder.createExtension({
        id: 'root',
        match: GraphNodeMatcher.whenRoot,
        actions: (_node, get) =>
          Effect.gen(function* () {
            const [attention] = get(attentionAtom);
            const [stateAtom] = get(deckStateAtom);
            if (!attention || !stateAtom) {
              return [];
            }

            const closeCurrent = {
              id: `${LayoutOperation.Close.meta.key}.current`,
              data: Effect.fnUntraced(function* () {
                const attended = attention.getCurrent().at(-1);
                if (attended) {
                  yield* Operation.invoke(LayoutOperation.Close, { subject: [attended] });
                }
              }),
              properties: {
                label: ['close-current.label', { ns: meta.profile.key }],
                icon: 'ph--x--regular',
              },
            };

            const closeOthers = {
              id: `${LayoutOperation.Close.meta.key}.others`,
              data: Effect.fnUntraced(function* () {
                const deck = yield* DeckCapabilities.getDeck();
                const attended = attention.getCurrent().at(-1);
                const ids = deck.active.filter((id: string) => id !== attended) ?? [];
                yield* Operation.invoke(LayoutOperation.Close, { subject: ids });
              }),
              properties: {
                label: ['close-others.label', { ns: meta.profile.key }],
                icon: 'ph--x-square--regular',
              },
            };

            const closeAll = {
              id: `${LayoutOperation.Close.meta.key}.all`,
              data: Effect.fnUntraced(function* () {
                const deck = yield* DeckCapabilities.getDeck();
                yield* Operation.invoke(LayoutOperation.Close, { subject: deck.active });
              }),
              properties: {
                label: ['close-all.label', { ns: meta.profile.key }],
                icon: 'ph--x-circle--regular',
              },
            };

            const state = get(stateAtom);
            const deck = state.decks[state.activeDeck];

            const toggleSidebar = {
              id: `${LayoutOperation.UpdateSidebar.meta.key}.nav`,
              data: Effect.fnUntraced(function* () {
                yield* Capabilities.updateAtomValue(DeckCapabilities.State, (s) => ({
                  ...s,
                  sidebarState: s.sidebarState === 'expanded' ? ('collapsed' as const) : ('expanded' as const),
                }));
              }),
              properties: {
                label: [
                  state.sidebarState === 'expanded'
                    ? 'collapse-navigation-sidebar.label'
                    : 'open-navigation-sidebar.label',
                  { ns: meta.profile.key },
                ],
                icon: 'ph--sidebar--regular',
                keyBinding: {
                  macos: "meta+'",
                },
                disposition: 'pin-end',
                position: Position.last,
                l0Breakpoint: 'lg',
              },
            };

            return deck?.active.length !== 1 ? [closeCurrent, closeOthers, closeAll, toggleSidebar] : [toggleSidebar];
          }).pipe(Effect.orDie),
      }),
    ]);

    return Capability.contribute(AppCapabilities.AppGraphBuilder, extensions.flat());
  }),
);
