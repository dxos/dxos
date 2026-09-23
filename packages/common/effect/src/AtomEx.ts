//
// Copyright 2026 DXOS.org
//

import * as Duration from 'effect/Duration';
import type * as Atom from 'effect/unstable/reactivity/Atom';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';

import { assertArgument } from '@dxos/invariant';

// @import-as-namespace

/**
 * Default grace period before an atom with no subscribers is removed from a registry.
 */
export const DEFAULT_IDLE_TTL = Duration.seconds(5);

export type RegistryOptions = Omit<NonNullable<Parameters<typeof Registry.make>[0]>, 'defaultIdleTTL'> & {
  /** Must be finite; use `Atom.keepAlive` to retain an atom indefinitely. Zero removes on the next task. */
  idleTTL?: Duration.Input;
};

/**
 * An atom registry with the default idle grace period. Use it for any registry that hosts ECHO atoms,
 * which carry no `keepAlive` of their own.
 */
export const makeRegistry = ({ idleTTL = DEFAULT_IDLE_TTL, ...options }: RegistryOptions = {}) => {
  const millis = Duration.toMillis(idleTTL);
  // An infinite TTL makes the registry's bucket arithmetic NaN, which removes nodes at once.
  assertArgument(Number.isFinite(millis), 'idleTTL', 'Must be finite; use Atom.keepAlive to retain an atom');
  return Registry.make({ ...options, defaultIdleTTL: millis > 0 ? millis : undefined });
};

const ownedMounts = new FinalizationRegistry<() => void>((unmount) => unmount());

/**
 * Keeps `atom` in `registry` for as long as `owner` is alive, and releases it once `owner` is
 * collected. For state that belongs to an object: unlike `Atom.keepAlive`, it does not outlive the
 * object. Neither the atom nor its value may reference `owner`, or the registry keeps `owner` alive.
 */
export const makeOwned = <A extends Atom.Atom<any>>(owner: object, registry: Registry.AtomRegistry, atom: A): A => {
  ownedMounts.register(owner, registry.mount(atom));
  return atom;
};
