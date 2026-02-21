//
// Copyright 2025 DXOS.org
//

import * as Atom from '@effect-atom/atom/Atom';
import * as Result from '@effect-atom/atom/Result';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';

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
 * Atom family for ECHO refs.
 * RefImpl implements Effect's Hash/Equal traits using DXN, so different Ref instances
 * pointing to the same object resolve to the same atom.
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

    get.addFinalizer(() => {
      unsubscribeTarget?.();
    });

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
        if (previousSnapshot !== newValue) {
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
 * Create a read-only atom for a single reactive object or ref.
 * Returns {@link Obj.Snapshot} (immutable plain data), not the live reactive object.
 * Use this when you need one object's data for display or React dependency tracking.
 * The atom updates automatically when the object is mutated.
 * For refs, automatically handles async loading.
 * Uses Atom.family internally - same object/ref returns same atom instance.
 *
 * @param objOrRef - The reactive object or ref to create an atom for, or undefined.
 * @returns An atom that returns the object snapshot (plain data). Returns undefined only for refs (async loading) or undefined input.
 */
export function make<T extends Obj.Unknown>(obj: T): Atom.Atom<Obj.Snapshot<T>>;
export function make<T extends Obj.Unknown>(ref: Ref.Ref<T>): Atom.Atom<Obj.Snapshot<T> | undefined>;
export function make<T extends Obj.Unknown>(
  objOrRef: T | Ref.Ref<T> | undefined,
): Atom.Atom<Obj.Snapshot<T> | undefined>;
export function make<T extends Obj.Unknown>(
  objOrRef: T | Ref.Ref<T> | undefined,
): Atom.Atom<Obj.Snapshot<T> | undefined> {
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

/**
 * Atom family for ECHO objects - returns the live object, not a snapshot.
 * Same as objectFamily but returns T instead of Obj.Snapshot<T>.
 */
const objectWithReactiveFamily = Atom.family(<T extends Obj.Unknown>(obj: T): Atom.Atom<T> => {
  return Atom.make<T>((get) => {
    const unsubscribe = Obj.subscribe(obj, () => {
      get.setSelf(obj);
    });

    get.addFinalizer(() => unsubscribe());

    return obj;
  });
});

/**
 * Atom family for ECHO refs - returns the live reactive object, not a snapshot.
 * Resolves the ref via the database; returns undefined while loading or if unresolved.
 */
const refWithReactiveFamily = Atom.family(<T extends Obj.Unknown>(ref: Ref.Ref<T>): Atom.Atom<T | undefined> => {
  const effect = (get: Atom.Context) =>
    Effect.gen(function* () {
      const snapshot = get(make(ref));
      if (snapshot == null) return undefined;
      const option = yield* Obj.getReactiveOption(snapshot);
      return Option.getOrElse(option, () => undefined);
    });

  return Function.pipe(
    Atom.make(effect),
    Atom.map((result) => Result.getOrElse(result, () => undefined)),
  );
});

/**
 * Like {@link make} but returns the live reactive object instead of a snapshot.
 * Same input: Obj or Ref.Ref. Same output shape: Atom that updates when the object mutates.
 * Prefer {@link make} (snapshot) unless you need the live Obj.Obj for generic mutations (e.g. Obj.change).
 *
 * @param objOrRef - The reactive object or ref.
 * @returns An atom that returns the live object. Returns undefined for refs (async loading) or undefined input.
 */
export function makeWithReactive<T extends Obj.Unknown>(obj: T): Atom.Atom<T>;
export function makeWithReactive<T extends Obj.Unknown>(ref: Ref.Ref<T>): Atom.Atom<T | undefined>;
export function makeWithReactive<T extends Obj.Unknown>(objOrRef: T | Ref.Ref<T> | undefined): Atom.Atom<T | undefined>;
export function makeWithReactive<T extends Obj.Unknown>(
  objOrRef: T | Ref.Ref<T> | undefined,
): Atom.Atom<T | undefined> {
  if (objOrRef === undefined) {
    return Atom.make<T | undefined>(() => undefined);
  }

  if (Ref.isRef(objOrRef)) {
    return refWithReactiveFamily(objOrRef as Ref.Ref<T>);
  }

  const obj = objOrRef as T;
  assertArgument(Obj.isObject(obj), 'obj', 'Object must be a reactive object');
  return objectWithReactiveFamily(obj);
}
