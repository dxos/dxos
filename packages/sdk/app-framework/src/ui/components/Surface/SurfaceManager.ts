//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/unstable/reactivity/Atom';

import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { Position } from '@dxos/util';

import { ActivationEvents, Capabilities } from '../../../common';
import { ActivationEvent, type CapabilityManager, type PluginManager } from '../../../core';
import { type Definition } from './types';

const EMPTY_CANDIDATES: ReadonlyArray<Definition> = [];

/**
 * Groups definitions by role with each bucket pre-sorted by {@link Position}, so
 * dispatch avoids a full scan and re-sort on every render. Pure helper — callers
 * are responsible for filtering out invalid definitions before calling this.
 */
export const indexByRole = (definitions: Definition[]): Map<string, Definition[]> => {
  const index = new Map<string, Definition[]>();
  for (const definition of definitions) {
    const roles = Array.isArray(definition.role) ? definition.role : [definition.role];
    for (const role of roles) {
      let bucket = index.get(role);
      if (!bucket) {
        bucket = [];
        index.set(role, bucket);
      }
      bucket.push(definition);
    }
  }
  for (const bucket of index.values()) {
    bucket.sort(Position.compare);
  }
  return index;
};

/** Whether an activation spec fires on `key` (directly, or as a member of a one-of/all-of). */
const activatesOn = (events: ActivationEvent.Events, key: string): boolean => {
  const list = ActivationEvent.isOneOf(events) || ActivationEvent.isAllOf(events) ? events.events : [events];
  return list.some((event) => String(ActivationEvent.eventKey(event)) === key);
};

/** Definitions are stable objects, so a bucket is unchanged when it holds the same ones in order. */
const sameCandidates = (left: ReadonlyArray<Definition>, right: ReadonlyArray<Definition>): boolean =>
  left.length === right.length && left.every((definition, index) => definition === right[index]);

/**
 * Owns the per-manager surface memoization: one derived index atom plus a per-role
 * family of candidate atoms. A single instance is provided via
 * {@link SurfaceManagerProvider}, so instance identity does the per-manager keying
 * (replacing module-level WeakMaps) and `Atom.family` does the per-role keying.
 * Atom lifecycle is tied to the provider rather than module-global state.
 */
export class SurfaceManager {
  readonly #capabilities: CapabilityManager.CapabilityManager;
  readonly #plugins: PluginManager.PluginManager;

  // Role index (each bucket position-sorted); rebuilt once per contribution change.
  readonly #index = Atom.make((get) => {
    const definitions = get(this.#capabilities.atom(Capabilities.ReactSurface)).flat();
    return indexByRole(this.#dropInvalid(definitions));
  }).pipe(Atom.keepAlive);

  // Per-role candidate atoms. The atom carries the equality, so a contribution to a different role
  // recomputes this bucket to an equal value and is dropped — that role's subscribers never
  // re-render. (v4 removed `Data.array`, which used to supply that equality structurally.)
  readonly #candidates = Atom.family<string, Atom.Atom<ReadonlyArray<Definition>>>((role) =>
    Atom.make((get) => {
      const bucket = get(this.#index).get(role);
      return bucket ? [...bucket] : EMPTY_CANDIDATES;
    }).pipe(Atom.withEquality(sameCandidates), Atom.keepAlive),
  );

  // Per-role activation-in-flight atoms; see `pendingAtom`. `modules` carries only enabled,
  // non-failed plugins' modules (a plugin that fails — including by exceeding the module timeout —
  // is excluded and auto-disabled), so a role cannot stay pending forever.
  readonly #pending = Atom.family<string, Atom.Atom<boolean>>((role) =>
    Atom.make((get) => {
      if (role === '') {
        return false;
      }
      const key = String(ActivationEvent.eventKey(ActivationEvents.SurfacesRequested(role)));
      const active = new Set(get(this.#plugins.active));
      return get(this.#plugins.modules).some(
        (module) => !active.has(module.id) && activatesOn(module.activation.activatesOn, key),
      );
    }).pipe(Atom.keepAlive),
  );

  // Ids already reported as invalid on this manager, so a persistently-malformed
  // contribution warns once rather than on every index rebuild.
  #warnedInvalidIds = new Set<string>();

  // Roles whose surface demand event has already been dispatched, so re-renders and
  // repeated availability checks do not re-activate the role's modules.
  #requestedRoles = new Set<string>();

  constructor(capabilities: CapabilityManager.CapabilityManager, plugins: PluginManager.PluginManager) {
    this.#capabilities = capabilities;
    this.#plugins = plugins;
  }

  /** Derived atom yielding the (position-sorted) candidates for a single role. */
  candidatesAtom(role: string): Atom.Atom<ReadonlyArray<Definition>> {
    return this.#candidates(role);
  }

  /**
   * Derived atom: true while a module gated on this role's demand event has yet to activate — i.e.
   * a surface specific to the rendered data may still be coming. Boolean-valued, so subscribers
   * re-render only when it flips, not on every activation.
   */
  pendingAtom(role: string): Atom.Atom<boolean> {
    return this.#pending(role);
  }

  /**
   * Claims the first surface demand for a role, returning `true` only to that first caller so
   * it can fire the activation event. Subsequent calls — re-renders, repeated availability
   * checks — return `false`.
   */
  requestRole(role: string): boolean {
    if (role === '' || this.#requestedRoles.has(role)) {
      return false;
    }
    this.#requestedRoles.add(role);
    return true;
  }

  /**
   * Returns a claimed role to the pool. The claim is taken before the dispatch is known to have
   * happened, so a dispatch that fails or is interrupted (shutdown, a failed activation) must give
   * it back — nothing else re-requests the role, and `useIsSurfaceAvailable`'s own retry is
   * claimed away too, leaving every surface in that role permanently empty.
   */
  releaseRole(role: string): void {
    this.#requestedRoles.delete(role);
  }

  /** Drops definitions with an invalid local id, warning once per id. */
  #dropInvalid(definitions: Definition[]): Definition[] {
    return definitions.filter((definition) => {
      if (DXN.isValidPath(definition.id)) {
        return true;
      }
      if (!this.#warnedInvalidIds.has(definition.id)) {
        this.#warnedInvalidIds.add(definition.id);
        log.warn(
          'dropping surface with invalid id; the final segment must be camelCase — letters and digits, starting with a letter',
          {
            id: definition.id,
          },
        );
      }
      return false;
    });
  }
}
