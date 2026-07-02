//
// Copyright 2026 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Data from 'effect/Data';

import { Position } from '@dxos/util';

import { Capabilities } from '../../../common';
import { type CapabilityManager } from '../../../core';
import { type Definition } from './types';

const EMPTY_CANDIDATES: ReadonlyArray<Definition> = Data.array<Definition[]>([]);

/**
 * Groups definitions by role with each bucket pre-sorted by {@link Position}, so
 * dispatch avoids a full scan and re-sort on every render. Pure helper shared by
 * {@link SurfaceManager} and `isSurfaceAvailable`.
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

/**
 * Owns the per-manager surface memoization: one derived index atom plus a per-role
 * family of candidate atoms. A single instance is provided via
 * {@link SurfaceManagerProvider}, so instance identity does the per-manager keying
 * (replacing module-level WeakMaps) and `Atom.family` does the per-role keying.
 * Atom lifecycle is tied to the provider rather than module-global state.
 */
export class SurfaceManager {
  readonly #capabilities: CapabilityManager.CapabilityManager;

  // Role index (each bucket position-sorted); rebuilt once per contribution change.
  readonly #index = Atom.make((get) =>
    indexByRole(get(this.#capabilities.atom(Capabilities.ReactSurface)).flat()),
  ).pipe(Atom.keepAlive);

  // Per-role candidate atoms. `Data.array` gives the result structural equality, so a
  // contribution to a different role recomputes to an equal value and is dropped —
  // that role's subscribers never re-render.
  readonly #candidates = Atom.family<string, Atom.Atom<ReadonlyArray<Definition>>>((role) =>
    Atom.make((get) => {
      const bucket = get(this.#index).get(role);
      return bucket ? Data.array(bucket) : EMPTY_CANDIDATES;
    }).pipe(Atom.keepAlive),
  );

  constructor(capabilities: CapabilityManager.CapabilityManager) {
    this.#capabilities = capabilities;
  }

  /** Derived atom yielding the (position-sorted) candidates for a single role. */
  candidatesAtom(role: string): Atom.Atom<ReadonlyArray<Definition>> {
    return this.#candidates(role);
  }
}
