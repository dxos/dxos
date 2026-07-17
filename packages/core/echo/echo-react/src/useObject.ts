//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import * as Atom from '@effect-atom/atom/Atom';
import { useCallback, useMemo } from 'react';

import { Obj, Ref } from '@dxos/echo';

export interface ObjectUpdateCallback<T> {
  (update: (obj: Obj.Mutable<T>) => void): void;
  (update: (obj: Obj.Mutable<T>) => Obj.Mutable<T>): void;
}

export interface ObjectPropUpdateCallback<T> {
  (update: (value: Obj.Mutable<T>) => void): void;
  (update: (value: Obj.Mutable<T>) => Obj.Mutable<T>): void;
  (newValue: T): void;
}

export const useObject: {
  /**
   * Hook to subscribe to a Ref's target object.
   * Automatically dereferences the ref and handles async loading.
   * Returns a snapshot (undefined if the ref hasn't loaded yet).
   * Re-renders the component when the ref resolves or the target object changes.
   *
   * @param ref - The Ref to dereference and subscribe to
   * @returns The current target snapshot (or undefined if not loaded) and update callback
   *
   * @idiom org.dxos.echo-react.useObjectReactive
   *   applies: Reading a ref's target (or a specific property) inside a React component — establishes a reactive subscription so the component re-renders when the ref resolves or the value changes
   *   instead-of: `ref.target` — synchronous and not reactive; returns `undefined` when the target isn't loaded yet and never triggers a re-render when it becomes available
   *   uses: {@link useObject}
   *   related: org.dxos.echo.objAtomReactive, org.dxos.echo.refLoad
   */
  <T extends Obj.Unknown>(ref: Ref.Ref<T>): [Obj.Snapshot<T> | undefined, ObjectUpdateCallback<T>];

  /**
   * Hook to subscribe to a Ref's target object that may be undefined.
   * Returns a snapshot (undefined if the ref is undefined or hasn't loaded yet).
   *
   * @param ref - The Ref to dereference and subscribe to (can be undefined)
   * @returns The current target snapshot (or undefined) and update callback
   */
  <T extends Obj.Unknown>(ref: Ref.Ref<T> | undefined): [Obj.Snapshot<T> | undefined, ObjectUpdateCallback<T>];

  /**
   * Hook to subscribe to an entire Echo object.
   * Returns a snapshot of the current object value and automatically re-renders when the object changes.
   *
   * @param obj - The Echo object to subscribe to (objects only, not relations)
   * @returns The current object snapshot and update callback
   */
  <T extends Obj.Unknown>(obj: T): [Obj.Snapshot<T>, ObjectUpdateCallback<T>];

  /**
   * Hook to subscribe to an entire Echo object that may be undefined.
   * Returns a snapshot (undefined if the object is undefined).
   *
   * @param obj - The Echo object to subscribe to (can be undefined, objects only)
   * @returns The current object snapshot (or undefined) and update callback
   */
  <T extends Obj.Unknown>(obj: T | undefined): [Obj.Snapshot<T> | undefined, ObjectUpdateCallback<T>];

  /**
   * Hook to subscribe to an Echo object or Ref.
   * Handles both cases - if passed a Ref, dereferences it and subscribes to the target.
   * Returns a snapshot (undefined if ref hasn't loaded).
   *
   * @param objOrRef - The Echo object or Ref to subscribe to
   * @returns The current object snapshot (or undefined) and update callback
   */
  <T extends Obj.Unknown>(objOrRef: T | Ref.Ref<T> | undefined): [Obj.Snapshot<T> | undefined, ObjectUpdateCallback<T>];

  /**
   * Hook to subscribe to a specific property of an Echo object.
   * Returns the current property value and automatically re-renders when the property changes.
   *
   * @param obj - The Echo object to subscribe to (objects only, not relations)
   * @param property - Property key to subscribe to
   * @returns The current property value and update callback
   */
  <T extends Obj.Unknown, K extends keyof T>(obj: T, property: K): [T[K], ObjectPropUpdateCallback<T[K]>];

  /**
   * Hook to subscribe to a specific property of an Echo object that may be undefined.
   * Returns undefined if the object is undefined.
   *
   * @param obj - The Echo object to subscribe to (can be undefined, objects only)
   * @param property - Property key to subscribe to
   * @returns The current property value (or undefined) and update callback
   */
  <T extends Obj.Unknown, K extends keyof T>(
    obj: T | undefined,
    property: K,
  ): [T[K] | undefined, ObjectPropUpdateCallback<T[K]>];

  /**
   * Hook to subscribe to a specific property of a Ref's target object.
   * Automatically dereferences the ref and handles async loading.
   * Returns undefined if the ref hasn't loaded yet.
   *
   * @param ref - The Ref to dereference and subscribe to
   * @param property - Property key to subscribe to
   * @returns The current property value (or undefined if not loaded) and update callback
   */
  <T, K extends keyof T>(ref: Ref.Ref<T>, property: K): [T[K] | undefined, ObjectPropUpdateCallback<T[K]>];

  /**
   * Hook to subscribe to a specific property of a Ref's target object that may be undefined.
   * Returns undefined if the ref is undefined or hasn't loaded yet.
   *
   * @param ref - The Ref to dereference and subscribe to (can be undefined)
   * @param property - Property key to subscribe to
   * @returns The current property value (or undefined) and update callback
   */
  <T, K extends keyof T>(ref: Ref.Ref<T> | undefined, property: K): [T[K] | undefined, ObjectPropUpdateCallback<T[K]>];
} = (<T extends Obj.Unknown, K extends keyof T>(objOrRef: T | Ref.Ref<T> | undefined, property?: K): any => {
  const isRef = Ref.isRef(objOrRef);
  const liveObj = useResolveRef(objOrRef);

  const callback: ObjectPropUpdateCallback<unknown> = useCallback(
    (updateOrValue: unknown | ((obj: unknown) => unknown)) => {
      // Get current target for refs (may have loaded since render).
      const obj = isRef ? (objOrRef as Ref.Ref<T>)?.target : liveObj;
      if (obj === undefined) {
        return;
      }
      Obj.update(obj, (obj: any) => {
        if (typeof updateOrValue === 'function') {
          const returnValue = updateOrValue(property !== undefined ? obj[property] : obj);
          if (returnValue !== undefined) {
            if (property === undefined) {
              throw new Error('Cannot re-assign the entire object');
            }
            obj[property] = returnValue;
          }
        } else {
          if (property === undefined) {
            throw new Error('Cannot re-assign the entire object');
          }
          obj[property] = updateOrValue;
        }
      });
    },
    [objOrRef, property, isRef, liveObj],
  );

  if (property !== undefined) {
    return [useObjectProperty(liveObj, property), callback];
  } else {
    return [useObjectValue(objOrRef), callback];
  }
}) as any;

/**
 * Hook for subscribing to an Echo object or Ref.
 */
export const useObjectValue = <T extends Obj.Unknown | Obj.Snapshot>(
  objOrRef: T | Ref.Ref<T> | undefined,
): T extends Obj.Snapshot ? T : Obj.Snapshot<T & Obj.Unknown> | undefined => {
  const atom = useMemo(() => {
    if (objOrRef == null) {
      return Atom.make<Obj.Snapshot<T & Obj.Unknown> | undefined>(() => undefined);
    }
    if (Ref.isRef(objOrRef)) {
      return Obj.atom(objOrRef);
    }
    if (Obj.isSnapshot(objOrRef)) {
      return Atom.make<T>(() => objOrRef);
    }
    return Obj.atom(objOrRef as T & Obj.Unknown);
  }, [objOrRef]);
  return useAtomValue(atom as any);
};

/**
 * Resolves a Ref to its live target object, or returns the input when it is already an object.
 * For refs, subscribes to load events only (not full mutation tracking).
 */
export const useResolveRef = <T extends Obj.Unknown>(objOrRef: T | Ref.Ref<T> | undefined): T | undefined => {
  const atom = useMemo(() => {
    if (objOrRef == null) {
      return Atom.make<T | undefined>(() => undefined);
    }
    if (!Ref.isRef(objOrRef)) {
      return Atom.make<T | undefined>(() => objOrRef as T);
    }
    return objOrRef.atom;
  }, [objOrRef]);
  return useAtomValue(atom);
};

/**
 * Internal hook for subscribing to a specific property of an Echo object.
 */
const useObjectProperty = <T extends Obj.Unknown | Obj.Snapshot, K extends keyof T>(
  obj: T | undefined,
  property: K,
): T[K] | undefined => {
  const atom = useMemo(() => {
    if (obj == null) {
      return Atom.make<T[K] | undefined>(() => undefined);
    }
    if (Obj.isSnapshot(obj)) {
      return Atom.make<T[K]>(() => obj[property]);
    }
    return Obj.atomProperty(obj as T & Obj.Unknown, property);
  }, [obj, property]);
  return useAtomValue(atom);
};

/**
 * Hook to subscribe to multiple Refs' target objects.
 * Automatically dereferences each ref and handles async loading.
 * Returns an array of loaded snapshots (filtering out undefined values).
 *
 * This hook is useful for aggregate computations like counts or filtering
 * across multiple refs without using .target directly.
 *
 * @deprecated Subscribes the component to the whole list, re-rendering on any element's change. Prefer pushing
 * the subscription down — derive the aggregate in an atom (reading each `Obj.atom(ref)`) and read it where it is
 * needed, or subscribe to the individual ref/property closest to the consumer — to keep subscriptions granular.
 *
 * @param refs - Array of Refs to dereference and subscribe to
 * @returns Array of loaded target snapshots (excludes unloaded refs)
 */
export const useObjects = <T extends Obj.Unknown>(refs: readonly Ref.Ref<T>[]): Obj.Snapshot<T>[] => {
  const atom = useMemo(
    () =>
      Atom.make((get) => {
        const results: Obj.Snapshot<T>[] = [];
        for (const ref of refs) {
          const value = get(Obj.atom(ref));
          if (value !== undefined) {
            results.push(value as Obj.Snapshot<T>);
          }
        }
        return results;
      }),
    [refs],
  );
  return useAtomValue(atom);
};
