//
// Copyright 2025 DXOS.org
//

import * as Atom from '@effect-atom/atom/Atom';
import { useAtomValue } from '@effect-atom/atom-react';
import { useCallback, useMemo } from 'react';

import { Obj, Ref } from '@dxos/echo';
import { AtomObj } from '@dxos/echo-atom';

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
   *
   * @param ref - The Ref to dereference and subscribe to
   * @returns The current target snapshot (or undefined if not loaded) and update callback
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
  <T extends Obj.Unknown>(objOrRef: T | Ref.Ref<T>): [Obj.Snapshot<T> | undefined, ObjectUpdateCallback<T>];

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
  // Get the live object for the callback (refs need to dereference).
  const isRef = Ref.isRef(objOrRef);
  const liveObj = isRef ? (objOrRef as Ref.Ref<T>)?.target : (objOrRef as T | undefined);

  const callback: ObjectPropUpdateCallback<unknown> = useCallback(
    (updateOrValue: unknown | ((obj: unknown) => unknown)) => {
      // Get current target for refs (may have loaded since render).
      const obj = isRef ? (objOrRef as Ref.Ref<T>)?.target : liveObj;
      if (obj === undefined) {
        return;
      }
      Obj.change(obj, (o: any) => {
        if (typeof updateOrValue === 'function') {
          const returnValue = updateOrValue(property !== undefined ? o[property] : o);
          if (returnValue !== undefined) {
            if (property === undefined) {
              throw new Error('Cannot re-assign the entire object');
            }
            o[property] = returnValue;
          }
        } else {
          if (property === undefined) {
            throw new Error('Cannot re-assign the entire object');
          }
          o[property] = updateOrValue;
        }
      });
    },
    [objOrRef, property, isRef, liveObj],
  );

  if (property !== undefined) {
    // For property subscriptions on refs, we subscribe to trigger re-render on load.
    // TODO(dxos): Property subscriptions on refs may not update correctly until the ref loads.
    useObjectValue(objOrRef);
    return [useObjectProperty(liveObj, property as any), callback];
  }
  return [useObjectValue(objOrRef), callback];
}) as any;

/**
 * Internal hook for subscribing to an Echo object or Ref.
 * AtomObj.make handles both objects and refs, returning snapshots.
 */
const useObjectValue = <T extends Obj.Unknown>(objOrRef: T | Ref.Ref<T> | undefined): Obj.Snapshot<T> | undefined => {
  const atom = useMemo(() => AtomObj.make(objOrRef), [objOrRef]);
  return useAtomValue(atom) as Obj.Snapshot<T> | undefined;
};

/**
 * Internal hook for subscribing to a specific property of an Echo object.
 * Uses useAtomValue directly since makeProperty returns the value directly.
 */
const useObjectProperty = <T extends Obj.Unknown, K extends keyof T>(
  obj: T | undefined,
  property: K,
): T[K] | undefined => {
  const atom = useMemo(() => AtomObj.makeProperty(obj, property), [obj, property]);
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
 * @param refs - Array of Refs to dereference and subscribe to
 * @returns Array of loaded target snapshots (excludes unloaded refs)
 */
export const useObjects = <T extends Obj.Unknown>(refs: readonly Ref.Ref<T>[]): Obj.Snapshot<T>[] => {
  const atom = useMemo(
    () =>
      Atom.make((get) => {
        const results: Obj.Snapshot<T>[] = [];
        for (const ref of refs) {
          const value = get(AtomObj.make(ref));
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
