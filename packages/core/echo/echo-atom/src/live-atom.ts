//
// Copyright 2025 DXOS.org
//

import * as Atom from '@effect-atom/atom/Atom';

import { type Live, getSnapshot, isLiveObject, subscribe } from '@dxos/live-object';

/**
 * Atom family for plain live objects (not ECHO entities).
 * Uses object reference as key - same object returns same atom.
 */
const liveFamily = Atom.family(<T extends object>(obj: Live<T>): Atom.Atom<T> => {
  return Atom.make<T>((get) => {
    const unsubscribe = subscribe(obj, () => {
      get.setSelf(getSnapshot(obj));
    });

    get.addFinalizer(() => unsubscribe());

    return getSnapshot(obj);
  });
});

/**
 * Create a read-only atom for a plain live object.
 * Works with objects created via `live()` from @dxos/live-object.
 * Returns immutable snapshots of the object data.
 * The atom updates automatically when the object is mutated.
 * Uses Atom.family internally - same object reference returns same atom instance.
 *
 * @deprecated This is a transitional API. Non-ECHO state should be migrated directly to Effect Atom.
 */
export function make<T extends object>(obj: Live<T>): Atom.Atom<T> {
  if (!isLiveObject(obj)) {
    throw new Error('Object must be a live object');
  }
  return liveFamily(obj);
}
