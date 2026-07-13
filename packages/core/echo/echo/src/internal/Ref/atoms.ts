//
// Copyright 2025 DXOS.org
//

import * as Atom from '@effect-atom/atom/Atom';

import { subscribe } from '../common/proxy/reactive';
import { ObjectDeletedId } from '../common/types/model-symbols';
import type { Ref } from './ref';
import { loadRefTarget } from './utils';

/**
 * Atom family for ECHO refs.
 * Uses ref reference as key — same ref returns same atom.
 * Subscribes to target object changes and resolves to undefined when the target is deleted.
 */
export const refSimpleFamily = Atom.family(<T>(ref: Ref<T>): Atom.Atom<T | undefined> => {
  // `keepAlive` pins the node for the registry's lifetime: an atom that pushes updates from an external
  // `subscribe` callback must never be swept, or the callback can fire against an already-disposed
  // lifetime and throw `Cannot use context of disposed Atom` (DX-1103). Mirrors `refFamily` in
  // `Obj/atoms.ts`.
  return Atom.make<T | undefined>((get) => {
    let unsubscribeTarget: (() => void) | undefined;

    const setupSubscription = (target: T): T | undefined => {
      // Release any previous subscription before re-subscribing (loadRefTarget may call this more than once).
      // T has no ECHO-proxy constraint at this generic level; `subscribe` and ObjectDeletedId
      // both require the internal proxy shape that cannot be expressed statically here.
      unsubscribeTarget?.();
      unsubscribeTarget = subscribe(target as any, () => {
        const deleted = !!(target as any)[ObjectDeletedId];
        get.setSelf(deleted ? undefined : target);
      });
      const deleted = !!(target as any)[ObjectDeletedId];
      return deleted ? undefined : target;
    };

    get.addFinalizer(() => {
      unsubscribeTarget?.();
    });

    return loadRefTarget(ref, get, setupSubscription);
  }).pipe(Atom.keepAlive);
});
