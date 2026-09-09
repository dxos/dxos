//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';

import { DeckCapabilities } from '#types';

import { updatePlankNames } from '../layout';
import { computeActiveUpdates } from '../util';
import { updateActiveDeck } from './helpers';

/**
 * Write the deck's active planks, returning the item to attend if attention moved.
 *
 * Shared by `LayoutOperation.Set` and by the URL projection, which must not invoke `Set` itself: an
 * operation that navigates and a projection that applies a navigation would otherwise call each other.
 */
export const applyActive = Effect.fnUntraced(function* (next: string[]) {
  const deck = yield* DeckCapabilities.getDeck();
  const attention = yield* Capability.get(AttentionCapabilities.Attention);
  const { flatten } = yield* Capabilities.getAtomValue(DeckCapabilities.Settings);

  const { deckUpdates, toAttend } = computeActiveUpdates({ next, deck, attention, flatten });
  yield* Capabilities.updateAtomValue(DeckCapabilities.State, (state) =>
    updateActiveDeck(state, { ...deckUpdates, plankNames: updatePlankNames(deck.plankNames, deckUpdates.active) }),
  );

  return toAttend;
});
