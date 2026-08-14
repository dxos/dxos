//
// Copyright 2026 DXOS.org
//

import type * as Atom from 'effect/unstable/reactivity/Atom';
import * as AtomRegistry from 'effect/unstable/reactivity/AtomRegistry';

/**
 * Grace period, in milliseconds, before an atom with no subscribers is swept from a registry.
 *
 * Sized for render churn only — remounts, StrictMode's double render, deck tab switches,
 * virtualized-list scroll jitter — and for consumers that read an atom before subscribing to it
 * (async transitions, suspended renders), for which the grace is correctness margin rather than
 * cache warmth. It is deliberately not a residency policy: how long *data* stays resident belongs
 * to whichever system owns that data.
 */
export const DEFAULT_ATOM_IDLE_TTL = 5_000;

export type MakeAtomRegistryOptions = {
  readonly initialValues?: Iterable<readonly [Atom.Atom<any>, any]> | undefined;
  readonly scheduleTask?: ((f: () => void) => () => void) | undefined;
  readonly timeoutResolution?: number | undefined;
  readonly defaultIdleTTL?: number | undefined;
};

/**
 * Creates an atom registry that sweeps unsubscribed atoms after {@link DEFAULT_ATOM_IDLE_TTL}.
 *
 * Prefer this over a bare `AtomRegistry.make()`, which applies no TTL and therefore sweeps an atom
 * on the scheduler task following its last unsubscribe — the behaviour that drives call sites to
 * `Atom.keepAlive`, which pins the node for the registry's lifetime and never releases it.
 *
 * Two upstream sharp edges apply when a single atom overrides this via `Atom.setIdleTTL`: `0`
 * removes immediately, disabling this default rather than inheriting it, and `Infinity` is
 * `Atom.keepAlive`.
 */
export const makeAtomRegistry = (options: MakeAtomRegistryOptions = {}): AtomRegistry.AtomRegistry =>
  AtomRegistry.make({ defaultIdleTTL: DEFAULT_ATOM_IDLE_TTL, ...options });
