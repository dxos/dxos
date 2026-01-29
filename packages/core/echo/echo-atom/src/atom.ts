//
// Copyright 2025 DXOS.org
//

import * as Atom from '@effect-atom/atom/Atom';
import isEqual from 'lodash.isequal';

import { Obj, Ref } from '@dxos/echo';
import { assertArgument } from '@dxos/invariant';

import { loadRefTarget } from './ref-utils';

/**
 * Atom family for ECHO objects.
 * Uses object reference as key - same object returns same atom.
 */
const objectFamily = Atom.family(<T extends Obj.Unknown>(obj: T): Atom.Atom<Obj.Snapshot<T>> => {
  return Atom.make<Obj.Snapshot<T>>((get) => {
    const unsubscribe = Obj.subscribe(obj, () => {
      get.setSelf(Obj.getSnapshot(obj));
    });

    get.addFinalizer(() => unsubscribe());

    return Obj.getSnapshot(obj);
  });
});

/**
 * Internal helper to create an atom from a Ref.
 * Handles async loading and subscribes to the target for reactive updates.
 * Uses Atom.family internally - same ref reference returns same atom instance.
 */
const refFamily = Atom.family(<T extends Obj.Unknown>(ref: Ref.Ref<T>): Atom.Atom<Obj.Snapshot<T> | undefined> => {
  return Atom.make<Obj.Snapshot<T> | undefined>((get) => {
    let unsubscribeTarget: (() => void) | undefined;

    const setupTargetSubscription = (target: T): Obj.Snapshot<T> => {
      unsubscribeTarget?.();
      unsubscribeTarget = Obj.subscribe(target, () => {
        get.setSelf(Obj.getSnapshot(target));
      });
      return Obj.getSnapshot(target);
    };

    get.addFinalizer(() => unsubscribeTarget?.());

    return loadRefTarget(ref, get, setupTargetSubscription);
  });
});

/**
 * Snapshot a value to create a new reference for comparison and React dependency tracking.
 * Arrays and plain objects are shallow-copied so that:
 * 1. The snapshot is isolated from mutations to the original value.
 * 2. React's shallow comparison (Object.is) detects changes via new reference identity.
 */
const snapshotForComparison = <V>(value: V): V => {
  if (Array.isArray(value)) {
    return [...value] as V;
  }
  if (value !== null && typeof value === 'object') {
    return { ...value } as V;
  }
  return value;
};

/**
 * Atom family for ECHO object properties.
 * Uses nested families: outer keyed by object, inner keyed by property key.
 * Same object+key combination returns same atom instance.
 */
const propertyFamily = Atom.family(<T extends Obj.Unknown>(obj: T) =>
  Atom.family(<K extends keyof T>(key: K): Atom.Atom<T[K]> => {
    return Atom.make<T[K]>((get) => {
      // Snapshot the initial value for comparison (arrays/objects need copying).
      let previousSnapshot = snapshotForComparison(obj[key]);

      const unsubscribe = Obj.subscribe(obj, () => {
        const newValue = obj[key];
        if (!isEqual(previousSnapshot, newValue)) {
          previousSnapshot = snapshotForComparison(newValue);
          // Return a snapshot copy so React sees a new reference.
          get.setSelf(snapshotForComparison(newValue));
        }
      });

      get.addFinalizer(() => unsubscribe());

      // Return a snapshot copy so React sees a new reference.
      return snapshotForComparison(obj[key]);
    });
  }),
);

/**
 * Create a read-only atom for a reactive object or ref.
 * Works with Echo objects, plain reactive objects (from Obj.make), and Refs.
 * Returns immutable snapshots of the object data (branded with SnapshotKindId).
 * The atom updates automatically when the object is mutated.
 * For refs, automatically handles async loading.
 * Uses Atom.family internally - same object/ref reference returns same atom instance.
 *
 * @param objOrRef - The reactive object or ref to create an atom for, or undefined.
 * @returns An atom that returns the object snapshot. Returns undefined only for refs (async loading) or undefined input.
 */
export function make<T extends Obj.Unknown>(obj: T): Atom.Atom<Obj.Snapshot<T>>;
export function make<T extends Obj.Unknown>(ref: Ref.Ref<T>): Atom.Atom<Obj.Snapshot<T> | undefined>;
export function make<T extends Obj.Unknown>(objOrRef: T | Ref.Ref<T> | undefined): Atom.Atom<Obj.Snapshot<T> | undefined>;
export function make<T extends Obj.Unknown>(objOrRef: T | Ref.Ref<T> | undefined): Atom.Atom<Obj.Snapshot<T> | undefined> {
  if (objOrRef === undefined) {
    return Atom.make<Obj.Snapshot<T> | undefined>(() => undefined);
  }

  // Handle Ref inputs.
  if (Ref.isRef(objOrRef)) {
    return refFamily(objOrRef as Ref.Ref<T>);
  }

  // At this point, objOrRef is definitely T (not a Ref).
  const obj = objOrRef as T;
  assertArgument(Obj.isObject(obj), 'obj', 'Object must be a reactive object');

  return objectFamily(obj);
}

/**
 * Create a read-only atom for a specific property of a reactive object.
 * Works with both Echo objects (from createObject) and plain live objects (from Obj.make).
 * The atom updates automatically when the property is mutated.
 * Only fires updates when the property value actually changes.
 * Uses Atom.family internally - same object+key combination returns same atom instance.
 *
 * @param obj - The reactive object to create an atom for, or undefined.
 * @param key - The property key to subscribe to.
 * @returns An atom that returns the property value, or undefined if obj is undefined.
 */
export function makeProperty<T extends Obj.Unknown, K extends keyof T>(obj: T, key: K): Atom.Atom<T[K]>;
export function makeProperty<T extends Obj.Unknown, K extends keyof T>(
  obj: T | undefined,
  key: K,
): Atom.Atom<T[K] | undefined>;
export function makeProperty<T extends Obj.Unknown, K extends keyof T>(
  obj: T | undefined,
  key: K,
): Atom.Atom<T[K] | undefined> {
  if (obj === undefined) {
    return Atom.make<T[K] | undefined>(() => undefined);
  }

  assertArgument(Obj.isObject(obj), 'obj', 'Object must be a reactive object');
  assertArgument(key in obj, 'key', 'Property must exist on object');
  return propertyFamily(obj)(key);
}
