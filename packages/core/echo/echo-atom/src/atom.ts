//
// Copyright 2025 DXOS.org
//

import * as Atom from '@effect-atom/atom/Atom';
import isEqual from 'lodash.isequal';

import { type Entity, Obj } from '@dxos/echo';
import { assertArgument } from '@dxos/invariant';
import { getSnapshot, isLiveObject } from '@dxos/live-object';

/**
 * Atom family for ECHO objects.
 * Uses object reference as key - same object returns same atom.
 */
const objectFamily = Atom.family(<T extends Entity.Unknown>(obj: T): Atom.Atom<T> => {
  return Atom.make<T>((get) => {
    const unsubscribe = Obj.subscribe(obj, () => {
      get.setSelf(getSnapshot(obj) as T);
    });

    get.addFinalizer(() => unsubscribe());

    return getSnapshot(obj) as T;
  });
});

/**
 * Create a read-only atom for a reactive object.
 * Works with both Echo objects (from createObject) and plain live objects (from Obj.make).
 * Returns immutable snapshots of the object data.
 * The atom updates automatically when the object is mutated.
 * Uses Atom.family internally - same object reference returns same atom instance.
 */
export function make<T extends Entity.Unknown>(obj: T): Atom.Atom<T> {
  assertArgument(isLiveObject(obj), 'obj', 'Object must be a reactive object');
  return objectFamily(obj);
}

/**
 * Atom family for ECHO object properties.
 * Uses nested families: outer keyed by object, inner keyed by property key.
 * Same object+key combination returns same atom instance.
 */
const propertyFamily = Atom.family(<T extends Entity.Unknown>(obj: T) =>
  Atom.family(<K extends keyof T>(key: K): Atom.Atom<T[K]> => {
    return Atom.make<T[K]>((get) => {
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
  }),
);

/**
 * Create a read-only atom for a specific property of a reactive object.
 * Works with both Echo objects (from createObject) and plain live objects (from Obj.make).
 * The atom updates automatically when the property is mutated.
 * Only fires updates when the property value actually changes.
 * Uses Atom.family internally - same object+key combination returns same atom instance.
 */
export function makeProperty<T extends Entity.Unknown, K extends keyof T>(obj: T, key: K): Atom.Atom<T[K]> {
  assertArgument(isLiveObject(obj), 'obj', 'Object must be a reactive object');
  assertArgument(key in obj, 'key', 'Property must exist on object');
  return propertyFamily(obj)(key);
}
