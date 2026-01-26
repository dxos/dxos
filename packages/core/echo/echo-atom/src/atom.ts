//
// Copyright 2025 DXOS.org
//

import * as Atom from '@effect-atom/atom/Atom';
import isEqual from 'lodash.isequal';

import { type Entity, Obj, Ref } from '@dxos/echo';
import { assertArgument } from '@dxos/invariant';
import { getSnapshot, isLiveObject } from '@dxos/live-object';

import { loadRefTarget } from './ref-utils';

/**
 * Create a read-only atom for a reactive object or ref.
 * Works with Echo objects, plain live objects (from Obj.make), and Refs.
 * Returns immutable snapshots of the object data.
 * The atom updates automatically when the object is mutated.
 * For refs, automatically handles async loading.
 *
 * @param objOrRef - The reactive object or ref to create an atom for, or undefined.
 * @returns An atom that returns the object snapshot, or undefined if not loaded/undefined.
 */
export function make<T extends Entity.Unknown>(objOrRef: T | Ref.Ref<T>): Atom.Atom<T | undefined>;
export function make<T extends Entity.Unknown>(objOrRef: T | Ref.Ref<T> | undefined): Atom.Atom<T | undefined>;
export function make<T extends Entity.Unknown>(objOrRef: T | Ref.Ref<T> | undefined): Atom.Atom<T | undefined> {
  if (objOrRef === undefined) {
    return Atom.make<T | undefined>(() => undefined);
  }

  // Handle Ref inputs.
  if (Ref.isRef(objOrRef)) {
    return makeFromRef(objOrRef as Ref.Ref<T>);
  }

  // At this point, objOrRef is definitely T (not a Ref).
  const obj = objOrRef as T;
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
 * Internal helper to create an atom from a Ref.
 * Handles async loading and subscribes to the target for reactive updates.
 */
const makeFromRef = <T extends Entity.Unknown>(ref: Ref.Ref<T>): Atom.Atom<T | undefined> => {
  return Atom.make<T | undefined>((get) => {
    let unsubscribeTarget: (() => void) | undefined;

    const setupTargetSubscription = (target: T): T => {
      unsubscribeTarget?.();
      unsubscribeTarget = Obj.subscribe(target, () => {
        get.setSelf(getSnapshot(target) as T);
      });
      return getSnapshot(target) as T;
    };

    get.addFinalizer(() => unsubscribeTarget?.());

    return loadRefTarget(ref, get, setupTargetSubscription);
  });
};

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
