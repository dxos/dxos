//
// Copyright 2025 DXOS.org
//

import * as Atom from '@effect-atom/atom/Atom';
import isEqual from 'lodash.isequal';

import { type Entity, Obj } from '@dxos/echo';
import { assertArgument } from '@dxos/invariant';
import { getSnapshot, isLiveObject } from '@dxos/live-object';

/**
 * Namespace for Echo Atom utility functions.
 */
export namespace AtomObj {
  /**
   * Create a read-only atom for a reactive object.
   * Works with both Echo objects (from createObject) and plain live objects (from Obj.make).
   * Returns immutable snapshots of the object data.
   * The atom updates automatically when the object is mutated.
   */
  export function make<T extends Entity.Unknown>(obj: T): Atom.Atom<T> {
    assertArgument(isLiveObject(obj), 'obj', 'Object must be a reactive object');

    return Atom.make<T>((get) => {
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
   */
  export function makeProperty<T extends Entity.Unknown, K extends keyof T>(obj: T, key: K): Atom.Atom<T[K]> {
    assertArgument(isLiveObject(obj), 'obj', 'Object must be a reactive object');
    assertArgument(key in obj, 'key', 'Property must exist on object');

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
  }
}
