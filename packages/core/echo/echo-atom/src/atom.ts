//
// Copyright 2025 DXOS.org
//

import * as Atom from '@effect-atom/atom/Atom';
import isEqual from 'lodash.isequal';

import { type Entity, Obj } from '@dxos/echo';
import { assertArgument } from '@dxos/invariant';
import { getSnapshot, isLiveObject } from '@dxos/live-object';

/**
 * Create a read-only atom for a reactive object.
 * Works with both Echo objects (from createObject) and plain live objects (from Obj.make).
 * Returns immutable snapshots of the object data.
 * The atom updates automatically when the object is mutated.
 *
 * @param obj - The reactive object to create an atom for, or undefined.
 * @returns An atom that returns the object snapshot, or undefined if obj is undefined.
 */
export function make<T extends Entity.Unknown>(obj: T): Atom.Atom<T>;
export function make<T extends Entity.Unknown>(obj: T | undefined): Atom.Atom<T | undefined>;
export function make<T extends Entity.Unknown>(obj: T | undefined): Atom.Atom<T | undefined> {
  if (obj === undefined) {
    return Atom.make<T | undefined>(() => undefined);
  }

  assertArgument(isLiveObject(obj), 'obj', 'Object must be a reactive object');

  return Atom.make<T | undefined>((get) => {
    const unsubscribe = Obj.subscribe(obj, () => {
      get.setSelf(getSnapshot(obj) as T);
    });

    get.addFinalizer(() => unsubscribe());

    return getSnapshot(obj) as T;
  });
}

/**
 * Create a read-only atom for a specific property of a reactive object.
 * Works with both Echo objects (from createObject) and plain live objects (from Obj.make).
 * The atom updates automatically when the property is mutated.
 * Only fires updates when the property value actually changes.
 *
 * @param obj - The reactive object to create an atom for, or undefined.
 * @param key - The property key to subscribe to.
 * @returns An atom that returns the property value, or undefined if obj is undefined.
 */
export function makeProperty<T extends Entity.Unknown, K extends keyof T>(obj: T, key: K): Atom.Atom<T[K]>;
export function makeProperty<T extends Entity.Unknown, K extends keyof T>(
  obj: T | undefined,
  key: K,
): Atom.Atom<T[K] | undefined>;
export function makeProperty<T extends Entity.Unknown, K extends keyof T>(
  obj: T | undefined,
  key: K,
): Atom.Atom<T[K] | undefined> {
  if (obj === undefined) {
    return Atom.make<T[K] | undefined>(() => undefined);
  }

  assertArgument(isLiveObject(obj), 'obj', 'Object must be a reactive object');
  assertArgument(key in obj, 'key', 'Property must exist on object');

  return Atom.make<T[K] | undefined>((get) => {
    let previousValue = obj[key];

    const unsubscribe = Obj.subscribe(obj, () => {
      const newValue = obj[key];
      if (!isEqual(previousValue, newValue)) {
        previousValue = newValue;
        get.setSelf(newValue);
      }
    });

    get.addFinalizer(() => unsubscribe());

    return obj[key];
  });
}
