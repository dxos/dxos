//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraph from '@dxos/app-graph/AppGraph';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';
import { Attention } from '@dxos/react-ui-attention/types';

import { DeckCapabilities } from '#types';
import { CompanionViewState, DeckSchema } from '#types';

import { updatePlankNames } from '../util/index.ts';
import {
  closeCompanionPlank,
  openCompanionPlank,
  resolveCompanionAnchor,
  resolveCompanionPlank,
  updateActiveDeck,
} from '../util/index.ts';
import * as Navigation from './navigation.ts';
import { computeActiveUpdates } from './set-active.ts';

/**
 * Write the deck's active planks and the URL segment each one came from, returning the item to
 * attend if attention moved.
 */
export const applyActive = Effect.fnUntraced(function* (planks: readonly Navigation.Plank[]) {
  const deck = yield* DeckCapabilities.getDeck();
  const attention = yield* Capability.get(AttentionCapabilities.Attention);
  const { flatten } = yield* Capabilities.getAtomValue(DeckCapabilities.Settings);
  // Both atoms up front: a plank's width and name hang off its segment, so the two writes below have
  // to land in one render or a plank renders for a frame with no segment to key them by.
  const registry = yield* Capability.get(Capabilities.AtomRegistry);
  const stateAtom = yield* Capability.get(DeckCapabilities.State);
  const ephemeralAtom = yield* Capability.get(DeckCapabilities.EphemeralState);

  const ephemeral = registry.get(ephemeralAtom);
  const workspace = registry.get(stateAtom).activeDeck;
  const open = ephemeral.open[workspace];
  const next = planks.map(({ id }) => id);
  const segments = Object.fromEntries(planks.flatMap(({ id, segment }) => (segment ? [[id, segment] as const] : [])));
  const { deckUpdates, toAttend } = computeActiveUpdates({
    next,
    deck,
    attention,
    flatten,
    segments: { previous: open?.segments, next: segments },
  });
  const activeSegments = deckUpdates.active.map((id) => Navigation.segmentOf(segments, id));
  const plankNames = updatePlankNames(deck.plankNames, activeSegments);
  const { active, inactive, companionPlanks } = deckUpdates;

  // The projection applies the same URL twice and re-applies it on any navigation, so writing
  // unconditionally would hand every reader new arrays each time and re-render every plank for a
  // deck that did not change.
  if (!sameList(open?.active, active) || !sameList(open?.inactive, inactive) || !sameMap(open?.segments, segments)) {
    registry.set(ephemeralAtom, {
      ...ephemeral,
      open: { ...ephemeral.open, [workspace]: { active, inactive, segments } },
    });
  }
  const stored = registry.get(stateAtom).decks[workspace];
  if (!sameList(stored?.companionPlanks, companionPlanks) || !sameMap(stored?.plankNames, plankNames)) {
    registry.set(stateAtom, updateActiveDeck(registry.get(stateAtom), { companionPlanks, plankNames }));
  }

  return toAttend;
});

/** Whether two plank lists hold the same ids in the same order. */
const sameList = (a: readonly string[] | undefined, b: readonly string[]): boolean =>
  !!a && a.length === b.length && a.every((id, index) => id === b[index]);

/** Whether two lookups hold the same keys and values. */
const sameMap = (a: Record<string, string> | undefined, b: Record<string, string>): boolean => {
  if (!a) {
    return Object.keys(b).length === 0;
  }
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((key) => a[key] === b[key]);
};

/** Move the deck onto `workspace`, creating its deck on first visit. */
export const applyWorkspace = Effect.fnUntraced(function* (workspace: string) {
  const state = yield* Capabilities.getAtomValue(DeckCapabilities.State);
  const { graph } = yield* Capability.get(AppCapabilities.AppGraph);
  const shouldUpdatePrevious = Option.match(AppGraph.getNode(graph, state.activeDeck), {
    onNone: () => true,
    onSome: (node) => !AppNode.isPinnedWorkspace(node),
  });
  yield* Capabilities.updateAtomValue(DeckCapabilities.State, (current) => ({
    ...current,
    previousDeck: shouldUpdatePrevious ? current.activeDeck : current.previousDeck,
    activeDeck: workspace,
    decks: current.decks[workspace] ? current.decks : { ...current.decks, [workspace]: { ...DeckSchema.defaultDeck } },
  }));
  yield* Capabilities.updateAtomValue(DeckCapabilities.EphemeralState, (current) => ({
    ...current,
    fullscreen: undefined,
  }));
});

/** Open or close the companion, `null` closing whichever the anchor names. */
export const applyCompanion = Effect.fnUntraced(function* (subject: string | null, anchor?: string) {
  const { flatten } = yield* Capabilities.getAtomValue(DeckCapabilities.Settings);
  const deck = yield* DeckCapabilities.getDeck();
  const attention = yield* Capability.get(AttentionCapabilities.Attention);

  if (subject === null) {
    const plankId = anchor ?? resolveCompanionAnchor(deck.active, attention.getCurrent());
    yield* Capabilities.updateAtomValue(DeckCapabilities.State, (state) =>
      updateActiveDeck(state, { companionPlanks: closeCompanionPlank(deck.companionPlanks, flatten, plankId) }),
    );
    return;
  }

  const plankId = resolveCompanionPlank({ subject, anchor, planks: deck.active, attended: attention.getCurrent() });
  if (!plankId) {
    return;
  }

  const viewState = yield* Capability.get(AttentionCapabilities.ViewState);
  const variant = Attention.getLinkedVariant(subject);
  viewState.update(CompanionViewState.aspect, CompanionViewState.CONTEXT, (prev) => ({ ...prev, variant }));

  yield* Capabilities.updateAtomValue(DeckCapabilities.State, (state) =>
    updateActiveDeck(state, {
      companionPlanks: openCompanionPlank(state.decks[state.activeDeck]?.companionPlanks ?? [], flatten, plankId),
    }),
  );
});
