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

import { DeckCapabilities } from '#types';
import { CompanionViewState, DeckSchema } from '#types';

import {
  closeCompanionPlank,
  openCompanionPlank,
  resolveCompanionAnchor,
  resolveCompanionPlank,
  updateActiveDeck,
  updatePlankNames,
  withViewTransition,
} from '../util/index.ts';
import * as Navigation from './navigation.ts';
import { computeActiveUpdates } from './set-active.ts';

/**
 * How a navigation lands, carried down to the single write that mounts the planks because a plank
 * focuses itself in the commit that mounts it.
 */
export type NavigationIntent = {
  /** The plank this write focuses; an intent that names none declines the focus outright. */
  scrollIntoView?: string;
  /** Where that focus lands; unset means the plank itself. */
  focus?: boolean | 'content';
  /** Run the write as the update step of a view transition, so the content region crossfades. */
  transition?: boolean;
};

/**
 * Write the deck's active planks and the URL segment each one came from, returning the item to
 * attend if attention moved.
 */
export const applyActive = Effect.fnUntraced(function* (
  planks: readonly Navigation.Plank[],
  intent?: NavigationIntent,
) {
  const deck = yield* DeckCapabilities.getDeck();
  const attention = yield* Capability.get(AttentionCapabilities.Attention);
  const { flatten } = yield* Capabilities.getAtomValue(DeckCapabilities.Settings);
  // Both atoms up front: a plank's width and name hang off its segment, so the two writes below have
  // to land in one render or a plank renders for a frame with no segment to key them by.
  const registry = yield* Capability.get(Capabilities.AtomRegistry);
  const stateAtom = yield* Capability.get(DeckCapabilities.State);
  const ephemeralAtom = yield* Capability.get(DeckCapabilities.EphemeralState);

  const workspace = registry.get(stateAtom).activeDeck;
  const open = registry.get(ephemeralAtom).open[workspace];
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
  // A caller with no intent at all (a close, a set) has no opinion, so the write falls back to the plank
  // attention is displaced onto, which has to be one that is open. A caller that passed an intent has
  // already decided, including when it names no plank.
  const scrollIntoView = intent ? intent.scrollIntoView : toAttend;
  const changed =
    !sameList(open?.active, active) || !sameList(open?.inactive, inactive) || !sameMap(open?.segments, segments);

  const write = Effect.sync(() => {
    // The projection re-applies the same URL, so writing unconditionally would re-render every plank of
    // an unchanged deck; a `scrollIntoView` forces the write, since it has to land in the commit that
    // mounts its plank.
    if (changed || scrollIntoView !== undefined) {
      registry.update(ephemeralAtom, (current) => ({
        ...current,
        open: { ...current.open, [workspace]: { ...current.open[workspace], active, inactive, segments } },
        ...(scrollIntoView !== undefined
          ? { scrollIntoView: { id: scrollIntoView, ...(intent?.focus !== undefined ? { focus: intent.focus } : {}) } }
          : {}),
      }));
    }
    const stored = registry.get(stateAtom).decks[workspace];
    if (!sameList(stored?.companionPlanks, companionPlanks) || !sameMap(stored?.plankNames, plankNames)) {
      registry.update(stateAtom, (current) => updateActiveDeck(current, { companionPlanks, plankNames }));
    }
  });

  // Only a write that changes what is open is worth animating, since rendering is frozen for the whole
  // update step.
  yield* intent?.transition && changed ? withViewTransition(write) : write;

  return toAttend;
});

const sameList = (a: readonly string[] | undefined, b: readonly string[] | undefined): boolean =>
  a === undefined || b === undefined ? a === b : a.length === b.length && a.every((id, index) => id === b[index]);

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

/** Enters `workspace`, animating only a change of workspace. */
export const enterWorkspace = Effect.fnUntraced(function* (workspace: string) {
  const { activeDeck } = yield* Capabilities.getAtomValue(DeckCapabilities.State);
  yield* activeDeck === workspace ? applyWorkspace(workspace) : withViewTransition(applyWorkspace(workspace));
});

/**
 * The companion a URL names, or undefined when it names none.
 *
 * `subject` is absent when the plank has no companion of that variant. That is not the same as naming
 * none: the companion stays open and the plank falls back to a variant it does have, so moving to an
 * item without the selected tab does not close a pane the reader never closed.
 */
export type CompanionTarget = {
  /** The plank the companion pair follows. */
  anchor: string;
  /** The variant the pair names, which is the reader's preference whether or not this plank has it. */
  variant: string;
  /** The companion node, when this plank has that variant. */
  subject?: string;
};

/** Open or close the companion; `undefined` (no pair in the URL) is the only thing that closes one. */
export const applyCompanion = Effect.fnUntraced(function* (target: CompanionTarget | undefined) {
  const { flatten } = yield* Capabilities.getAtomValue(DeckCapabilities.Settings);
  const deck = yield* DeckCapabilities.getDeck();
  const attention = yield* Capability.get(AttentionCapabilities.Attention);

  if (!target) {
    if (deck.companionPlanks === undefined) {
      return;
    }

    const plankId = resolveCompanionAnchor(deck.active, attention.getCurrent());
    yield* Capabilities.updateAtomValue(DeckCapabilities.State, (state) =>
      updateActiveDeck(state, { companionPlanks: closeCompanionPlank(deck.companionPlanks, flatten, plankId) }),
    );
    return;
  }

  const plankId = target.subject
    ? resolveCompanionPlank({ subject: target.subject, planks: deck.active, attended: attention.getCurrent() })
    : target.anchor;
  if (!plankId) {
    return;
  }

  const viewState = yield* Capability.get(AttentionCapabilities.ViewState);
  viewState.update(CompanionViewState.aspect, CompanionViewState.CONTEXT, (prev) => ({
    ...prev,
    variant: target.variant,
  }));

  yield* Capabilities.updateAtomValue(DeckCapabilities.State, (state) =>
    updateActiveDeck(state, {
      companionPlanks: openCompanionPlank(state.decks[state.activeDeck]?.companionPlanks ?? [], flatten, plankId),
    }),
  );
});
