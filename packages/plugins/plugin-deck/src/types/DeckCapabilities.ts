//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import type * as FiberHandle from 'effect/FiberHandle';
import type * as Atom from 'effect/reactivity/Atom';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { invariant } from '@dxos/invariant';

import { DeckNamespace } from '../namespace.ts';
import * as DeckSchema from './DeckSchema.ts';
import { type DeckState, type EphemeralDeckState, type StoredDeckState } from './DeckSchema.ts';

export const Settings = Capability.makeSingleton<Atom.Writable<import('./Settings.ts').Settings>>()(
  `${DeckNamespace.key}.capability.settings`,
);

/** Persisted state (stored in KVS/localStorage). */
export const State = Capability.makeSingleton<Atom.Writable<StoredDeckState>>()(
  `${DeckNamespace.key}.capability.state`,
);

/** Transient/ephemeral state (not persisted). */
export const EphemeralState = Capability.makeSingleton<Atom.Writable<EphemeralDeckState>>()(
  `${DeckNamespace.key}.capability.ephemeralState`,
);

/** Where the deck is: whether it shows only its current plank, the plank it is scrolled to, and its open companions. */
export type View = Readonly<{
  /** Whether the deck shows only its current plank (flattened, or mobile) rather than planks side by side. */
  flat: boolean;
  /**
   * The first plank not folded with at least half its width in view; the current plank when {@link flat}, and the first
   * plank when the deck is not sliding. Unset while a sliding deck has not yet measured the planks it now shows.
   */
  front?: string;
  /** The planks whose companion is open, and the companion tab the deck shows them in. */
  companions: Readonly<{ items: readonly string[]; variant?: string }>;
}>;

export const View = Capability.makeSingleton<Atom.Atom<View>>()(`${DeckNamespace.key}.capability.view`);

/**
 * Holds the URL projection in flight, so starting a newer one interrupts it. A projection can wait
 * out its deadlines, so without this an older one could resume and apply a URL the address bar has
 * long since moved off (see `url/project.ts`).
 */
export const Projection = Capability.makeSingleton<FiberHandle.FiberHandle<string | undefined, any>>()(
  `${DeckNamespace.key}.capability.projection`,
);

/**
 * The active workspace's deck: its persisted preferences, plus what the URL says is open. The two
 * live in different atoms because only one of them is the deck's to remember.
 */
export const getDeck = (): Effect.Effect<DeckState, Error, Capability.Service> =>
  Effect.gen(function* () {
    const state = yield* Capabilities.getAtomValue(State);
    const { open } = yield* Capabilities.getAtomValue(EphemeralState);
    const deck = state.decks[state.activeDeck];
    invariant(deck, `Deck not found: ${state.activeDeck}`);
    return { ...deck, ...(open[state.activeDeck] ?? DeckSchema.defaultOpenDeck) };
  });

/** Re-exported alongside the capability so hosts keep reading the platform from one place. */
export type Platform = DeckSchema.Platform;

/** Options for {@link DeckPlugin}. */
export type DeckPluginOptions = {
  /** Which root layout the plugin renders; state and operations are shared. */
  platform?: Platform;
  /**
   * Shows an informational top banner at every platform and width (outside fullscreen): the app name
   * and the `BannerEnd` slot, without command search.
   */
  banner?: boolean;
  /** Starts each workspace's deck with every companion closed, so a plank shows one only once the reader opens it. */
  companionsClosed?: boolean;
};

export const Platform = Capability.makeSingleton<Platform>()(`${DeckNamespace.key}.capability.platform`);

/** The `banner` option: whether the top banner is forced on. */
export const Banner = Capability.makeSingleton<boolean>()(`${DeckNamespace.key}.capability.banner`);

/** The stored deck a workspace starts from on its first visit (see the `companionsClosed` option). */
export const NewDeck = Capability.makeSingleton<DeckSchema.StoredDeck>()(`${DeckNamespace.key}.capability.newDeck`);
