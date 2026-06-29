//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { type Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';

import { meta } from '#meta';

import { type DeckState, type EphemeralDeckState, type StoredDeckState } from './schema';

export const Settings = Capability.make<Atom.Writable<import('./Settings').Settings>>(
  `${meta.profile.key}.capability.settings`,
);

/** Persisted state (stored in KVS/localStorage). */
export const State = Capability.make<Atom.Writable<StoredDeckState>>(`${meta.profile.key}.capability.state`);

/** Transient/ephemeral state (not persisted). */
export const EphemeralState = Capability.make<Atom.Writable<EphemeralDeckState>>(
  `${meta.profile.key}.capability.ephemeral-state`,
);

/** Get the current active deck from state. */
export const getDeck = (): Effect.Effect<DeckState, Error, Capability.Service> =>
  Effect.gen(function* () {
    const state = yield* Capabilities.getAtomValue(State);
    const deck = state.decks[state.activeDeck];
    invariant(deck, `Deck not found: ${state.activeDeck}`);
    return deck;
  });
