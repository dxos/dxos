//
// Copyright 2025 DXOS.org
//

import * as Atom from 'effect/unstable/reactivity/Atom';

import { isNonNullable } from '@dxos/util';

import { subscribe } from '../common/proxy/reactive.ts';
import type { LoadOptions, Ref } from './ref.ts';
import { isTargetDeleted, loadRefTarget } from './utils.ts';

const toOptions = (includeDeleted: boolean): LoadOptions | undefined =>
  includeDeleted ? { deleted: 'include' } : undefined;

/**
 * Atom family for ECHO refs, keyed by `[ref, includeDeleted]`.
 * Subscribes to target object changes; a deleted target reads as `undefined` unless included.
 */
export const refFamily = Atom.family(
  <T>([ref, includeDeleted]: readonly [Ref<T>, boolean]): Atom.Atom<T | undefined> => {
    return Atom.make<T | undefined>((get) => {
      let unsubscribeTarget: (() => void) | undefined;

      const read = (target: T): T | undefined => (!includeDeleted && isTargetDeleted(target) ? undefined : target);

      const setupSubscription = (target: T): T | undefined => {
        // Release any previous subscription before re-subscribing (loadRefTarget may call this more than once).
        unsubscribeTarget?.();
        unsubscribeTarget = subscribe(target, () => {
          get.setSelf(read(target));
        });
        // Runs at once when the node was disposed while the target loaded.
        get.addFinalizer(unsubscribeTarget);
        return read(target);
      };

      return loadRefTarget(ref, get, setupSubscription, toOptions(includeDeleted));
    });
  },
);

/**
 * Atom family for arrays of ECHO refs, keyed by `[refs, includeDeleted]` (arrays compare structurally).
 * Holds the targets in ref order, omitting those not loaded yet and, unless included, deleted ones.
 */
export const refArrayFamily = Atom.family(
  <T>([refs, includeDeleted]: readonly [readonly Ref<T>[], boolean]): Atom.Atom<T[]> =>
    Atom.make<T[]>((get) => refs.map((ref) => get(refFamily([ref, includeDeleted]))).filter(isNonNullable)),
);

/**
 * Reactive target of a ref, or targets of a ref array (see {@link refFamily}, {@link refArrayFamily}).
 */
export function makeAtom<T>(ref: Ref<T>, options?: LoadOptions): Atom.Atom<T | undefined>;
export function makeAtom<T>(refs: readonly Ref<T>[], options?: LoadOptions): Atom.Atom<T[]>;
export function makeAtom<T>(
  refs: Ref<T> | readonly Ref<T>[],
  options?: LoadOptions,
): Atom.Atom<T | undefined> | Atom.Atom<T[]> {
  const includeDeleted = options?.deleted === 'include';
  // Copied: a live ECHO array would mutate under the family key.
  return isRefArray(refs) ? refArrayFamily([[...refs], includeDeleted]) : refFamily([refs, includeDeleted]);
}

const isRefArray = <T>(refs: Ref<T> | readonly Ref<T>[]): refs is readonly Ref<T>[] => Array.isArray(refs);
