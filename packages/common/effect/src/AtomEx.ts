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

/**
 * Key under which an {@link Owner} exposes what its atoms are mounted with.
 */
export const OwnerId = Symbol.for('@dxos/effect/AtomEx/Owner');

/**
 * An object whose atoms live as long as it does; see {@link makeOwned}.
 */
export interface Owner {
  readonly [OwnerId]: {
    /** The registry the owner's atoms are mounted in. */
    readonly registry: Registry.AtomRegistry;
    /**
     * Unmounts a collected owner's atoms. One per class, held in a static field: a registry the
     * instance created would be collected with it and never run.
     */
    readonly finalizer: FinalizationRegistry<() => void>;
  };
}

/**
 * Keeps `atom` mounted until `owner` is collected. Unlike `Atom.keepAlive`, it does not outlive the
 * owner. Neither the atom nor its value may reference `owner`, or the registry keeps `owner` alive.
 */
export const makeOwned = <A extends Atom.Atom<any>>(owner: Owner, atom: A): A => {
  const { registry, finalizer } = owner[OwnerId];
  finalizer.register(owner, registry.mount(atom));
  return atom;
};
