//
// Copyright 2025 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';

import { meta } from '#meta';
import * as Settings from './Settings';
import { type EphemeralDeckState, type DeckState, type StoredDeckState } from './schema';

export namespace DeckCapabilities {
  export const Settings = Capability.make<Atom.Writable<Settings.Settings>>(`${meta.id}.capability.settings`);

  /** Persisted state (stored in KVS/localStorage). */
  export const State = Capability.make<Atom.Writable<StoredDeckState>>(`${meta.id}.capability.state`);

  /** Transient/ephemeral state (not persisted). */
  export const EphemeralState = Capability.make<Atom.Writable<EphemeralDeckState>>(
    `${meta.id}.capability.ephemeral-state`,
  );

  /** Get the current active deck from state. */
  export const getDeck = (): Effect.Effect<DeckState, Error, Capability.Service> =>
    Effect.gen(function* () {
      const state = yield* Capabilities.getAtomValue(State);
      const deck = state.decks[state.activeDeck];
      invariant(deck, `Deck not found: ${state.activeDeck}`);
      return deck;
    });
}
