//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Atom from 'effect/unstable/reactivity/Atom';

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
import { CompanionViewState, DeckCapabilities, DeckSchema } from '#types';

import { detailName } from '../util/index.ts';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Read reactively so the extension establishes a dependency and heals once these
    // capabilities land (dependency modules contribute individually, not batched per wave).
    const attentionAtom = yield* Capability.atom(AttentionCapabilities.Attention);
    const deckStateAtom = yield* Capability.atom(DeckCapabilities.State);
    const deckEphemeralAtom = yield* Capability.atom(DeckCapabilities.EphemeralState);
    const deckSettingsAtom = yield* Capability.atom(DeckCapabilities.Settings);
    const platformAtom = yield* Capability.atom(DeckCapabilities.Platform);
    const appGraphAtom = yield* Capability.atom(AppCapabilities.AppGraph);

    // The detail a plank shows in the flattened deck's companion, per plank so only that plank re-matches
    // when its detail changes.
    const detailOf = Atom.family((id: string) =>
      Atom.make((get): string | undefined => {
        const [stateAtom] = get(deckStateAtom);
        const [settingsAtom] = get(deckSettingsAtom);
        const [platform] = get(platformAtom);
        if (!stateAtom || !settingsAtom || platform === 'mobile' || !get(settingsAtom).flatten) {
          return undefined;
        }
        const state = get(stateAtom);
        return state.decks[state.activeDeck]?.plankNames[detailName(id)];
      }),
    );

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
            const [ephemeralAtom] = get(deckEphemeralAtom);
            if (!attention || !stateAtom || !ephemeralAtom) {
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
            const open = get(ephemeralAtom).open[state.activeDeck] ?? DeckSchema.defaultOpenDeck;

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

            return open.active.length !== 1 ? [closeCurrent, closeOthers, closeAll, toggleSidebar] : [toggleSidebar];
          }).pipe(Effect.orDie),
      }),

      // The flattened deck's detail tab, on a plank that holds a detail (see `resolveDetailOpen`).
      // Named for what it shows, so a mailbox's reads "Message" and a project's "Task".
      AppGraphBuilder.createExtension({
        id: 'detailCompanion',
        relation: AppNode.companion,
        match: (node, get) => {
          const detail = get(detailOf(node.id));
          return detail ? Option.some(detail) : Option.none();
        },
        connector: (detail, get) => {
          const [appGraph] = get(appGraphAtom);
          const node = appGraph ? Option.getOrUndefined(get(appGraph.graph.node(detail))) : undefined;
          return Effect.succeed([
            AppNode.makeCompanion<CompanionViewState.DetailData>({
              variant: CompanionViewState.DETAIL_VARIANT,
              label: (node && AppNode.getTypeLabel(node)) ?? ['detail-companion.label', { ns: meta.profile.key }],
              icon: node?.properties.icon ?? 'ph--article--regular',
              data: { detail },
              position: Position.first,
            }),
          ]);
        },
      }),
    ]);

    return Capability.contribute(AppCapabilities.AppGraphBuilder, extensions.flat());
  }),
);
