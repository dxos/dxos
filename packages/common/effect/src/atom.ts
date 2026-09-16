//
// Copyright 2026 DXOS.org
//

import * as Duration from 'effect/Duration';
import * as Atom from 'effect/unstable/reactivity/Atom';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';

import { assertArgument } from '@dxos/invariant';

/**
 * Default grace period before an atom with no subscribers is removed from a registry.
 *
 * Sized for render churn (remounts, StrictMode's double render, deck tab switches) and for consumers that
 * read an atom before subscribing to it: React reads in render and subscribes at commit. Without it a
 * registry removes the node on the next scheduler task, which is what drove call sites to `Atom.keepAlive`.
 * It is not a residency policy; how long data stays resident belongs to whichever system owns the data.
 */
export const DEFAULT_ATOM_IDLE_TTL = Duration.seconds(5);

export type MakeRegistryOptions = Omit<NonNullable<Parameters<typeof Registry.make>[0]>, 'defaultIdleTTL'> & {
  /** Must be finite; use `Atom.keepAlive` to retain an atom indefinitely. Zero removes on the next task. */
  idleTTL?: Duration.Input;
};

/**
 * An atom registry with the default idle grace period. Use it for any registry that hosts ECHO atoms,
 * which carry no `keepAlive` of their own.
 */
export const makeRegistry = ({ idleTTL = DEFAULT_ATOM_IDLE_TTL, ...options }: MakeRegistryOptions = {}) => {
  const millis = Duration.toMillis(idleTTL);
  // An infinite TTL makes the registry's bucket arithmetic NaN, which removes nodes at once.
  assertArgument(Number.isFinite(millis), 'idleTTL', 'Must be finite; use Atom.keepAlive to retain an atom');
  return Registry.make({ ...options, defaultIdleTTL: millis > 0 ? millis : undefined });
};

/**
 * `Atom.withLabel` captures a stack trace per call, so labels are opt-in and dev-only.
 */
const ATOM_LABELS = Boolean(import.meta.env?.DEV) && import.meta.env?.VITE_ATOM_LABELS === 'true';

/** {@link Atom.withLabel}, reduced to a pass-through wherever labels are not collected. */
export const withLabel: (name: string) => <A extends Atom.Atom<any>>(self: A) => A = ATOM_LABELS
  ? Atom.withLabel
  : () => (self) => self;
