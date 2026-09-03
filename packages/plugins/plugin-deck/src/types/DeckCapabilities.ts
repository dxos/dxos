//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import type * as Atom from 'effect/unstable/reactivity/Atom';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { invariant } from '@dxos/invariant';

import { meta } from '#meta';

import type * as DeckSchema from './DeckSchema.ts';
import { type DeckState, type EphemeralDeckState, type StoredDeckState } from './DeckSchema.ts';

export const Settings = Capability.makeSingleton<Atom.Writable<import('./Settings.ts').Settings>>()(
  `${meta.profile.key}.capability.settings`,
);

/** Persisted state (stored in KVS/localStorage). */
export const State = Capability.makeSingleton<Atom.Writable<StoredDeckState>>()(`${meta.profile.key}.capability.state`);

/** Transient/ephemeral state (not persisted). */
export const EphemeralState = Capability.makeSingleton<Atom.Writable<EphemeralDeckState>>()(
  `${meta.profile.key}.capability.ephemeralState`,
);

/** Get the current active deck from state. */
export const getDeck = (): Effect.Effect<DeckState, Error, Capability.Service> =>
  Effect.gen(function* () {
    const state = yield* Capabilities.getAtomValue(State);
    const deck = state.decks[state.activeDeck];
    invariant(deck, `Deck not found: ${state.activeDeck}`);
    return deck;
  });

/** Re-exported alongside the capability so hosts keep reading the platform from one place. */
export type Platform = DeckSchema.Platform;

/** Options for {@link DeckPlugin}. */
export type DeckPluginOptions = {
  /** Which root layout the plugin renders; state and operations are shared. */
  platform?: Platform;
};

export const Platform = Capability.makeSingleton<Platform>()(`${meta.profile.key}.capability.platform`);
