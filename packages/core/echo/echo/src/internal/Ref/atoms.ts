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
  return Atom.make<T | undefined>((get) => {
    const setupSubscription = (target: T): T | undefined => {
      // T has no ECHO-proxy constraint at this generic level; `subscribe` and ObjectDeletedId
      // both require the internal proxy shape that cannot be expressed statically here.
      const unsubscribe = subscribe(target as any, () => {
        const deleted = !!(target as any)[ObjectDeletedId];
        get.setSelf(deleted ? undefined : target);
      });
      get.addFinalizer(unsubscribe);
      const deleted = !!(target as any)[ObjectDeletedId];
      return deleted ? undefined : target;
    };

    return loadRefTarget(ref, get, setupSubscription);
  });
});
