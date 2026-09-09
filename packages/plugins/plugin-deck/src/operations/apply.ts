//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraph from '@dxos/app-graph/AppGraph';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';
import { Attention } from '@dxos/react-ui-attention/types';

import { DeckCapabilities } from '#types';
import { CompanionViewState, DeckSchema } from '#types';

import { updatePlankNames } from '../layout';
import {
  closeCompanionPlank,
  computeActiveUpdates,
  openCompanionPlank,
  resolveCompanionAnchor,
  resolveCompanionPlank,
} from '../util';
import { updateActiveDeck } from './helpers';

/**
 * Write the deck's active planks, returning the item to attend if attention moved.
 *
 * `supersedes` names planks this write replaces rather than closes, which is how the URL projection
 * swaps its placeholders for the ids they resolved to.
 *
 * Shared by `LayoutOperation.Set` and by the URL projection, which must not invoke `Set` itself: an
 * operation that navigates and a projection that applies a navigation would otherwise call each other.
 */
export const applyActive = Effect.fnUntraced(function* (next: string[], supersedes: readonly string[] = []) {
  const deck = yield* DeckCapabilities.getDeck();
  const attention = yield* Capability.get(AttentionCapabilities.Attention);
  const { flatten } = yield* Capabilities.getAtomValue(DeckCapabilities.Settings);

  const { deckUpdates, toAttend } = computeActiveUpdates({ next, deck, attention, flatten });
  // A plank the URL replaced with the id it actually resolved to was never closed, so it must not be
  // recorded as closed. Only a plank the user dropped belongs in `inactive`.
  const inactive = deckUpdates.inactive.filter((id) => !supersedes.includes(id));
  const { segments } = yield* Capabilities.getAtomValue(DeckCapabilities.EphemeralState);
  const activeSegments = deckUpdates.active.map((id) => segments?.[id] ?? id);
  yield* Capabilities.updateAtomValue(DeckCapabilities.State, (state) =>
    updateActiveDeck(state, {
      ...deckUpdates,
      inactive,
      plankNames: updatePlankNames(deck.plankNames, activeSegments),
    }),
  );

  return toAttend;
});

/** Move the deck onto `workspace`, creating its deck on first visit. */
export const applyWorkspace = Effect.fnUntraced(function* (workspace: string) {
  const state = yield* Capabilities.getAtomValue(DeckCapabilities.State);
  const { graph } = yield* Capability.get(AppCapabilities.AppGraph);
  // A pinned workspace is somewhere you visit and come back from, so it must not become the deck you
  // come back TO. A workspace missing from the graph is treated as unpinned, which only means it is
  // recorded as previous.
  const shouldUpdatePrevious = Option.match(AppGraph.getNode(graph, state.activeDeck), {
    onNone: () => true,
    onSome: (node) => !AppGraphNode.isPinnedWorkspace(node),
  });
  yield* Capabilities.updateAtomValue(DeckCapabilities.State, (current) => ({
    ...current,
    previousDeck: shouldUpdatePrevious ? current.activeDeck : current.previousDeck,
    activeDeck: workspace,
    decks: current.decks[workspace] ? current.decks : { ...current.decks, [workspace]: { ...DeckSchema.defaultDeck } },
  }));
  // Fullscreen is transient and scoped to the workspace it was entered in.
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

  // The selected variant is global view state (shared with the split point), not deck state.
  const viewState = yield* Capability.get(AttentionCapabilities.ViewState);
  const variant = Attention.getLinkedVariant(subject);
  viewState.update(CompanionViewState.aspect, CompanionViewState.CONTEXT, (prev) => ({ ...prev, variant }));

  yield* Capabilities.updateAtomValue(DeckCapabilities.State, (state) =>
    updateActiveDeck(state, {
      companionPlanks: openCompanionPlank(state.decks[state.activeDeck]?.companionPlanks ?? [], flatten, plankId),
    }),
  );
});
