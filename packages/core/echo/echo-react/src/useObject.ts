//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { type Entity, Obj, Ref } from '@dxos/echo';
import { AtomObj } from '@dxos/echo-atom';

export interface ObjectUpdateCallback<T> {
  (update: (obj: T) => void): void;
  (update: (obj: T) => T): void;
}

export interface ObjectPropUpdateCallback<T> extends ObjectUpdateCallback<T> {
  (newValue: T): void;
}

export const useObject: {
  /**
   * Hook to subscribe to a Ref's target object.
   * Automatically dereferences the ref and handles async loading.
   * Returns undefined if the ref hasn't loaded yet.
   *
   * @param ref - The Ref to dereference and subscribe to
   * @returns The current target value (or undefined if not loaded) and update callback
   */
  <T>(ref: Ref.Ref<T>): [Readonly<T> | undefined, ObjectUpdateCallback<T>];

  /**
   * Hook to subscribe to a Ref's target object that may be undefined.
   * Returns undefined if the ref is undefined or hasn't loaded yet.
   *
   * @param ref - The Ref to dereference and subscribe to (can be undefined)
   * @returns The current target value (or undefined) and update callback
   */
  <T>(ref: Ref.Ref<T> | undefined): [Readonly<T> | undefined, ObjectUpdateCallback<T>];

  /**
   * Hook to subscribe to an entire Echo object.
   * Returns the current object value and automatically re-renders when the object changes.
   *
   * @param obj - The Echo object to subscribe to
   * @returns The current object value and update callback
   */
  <T extends Entity.Unknown>(obj: T): [Readonly<T>, ObjectUpdateCallback<T>];

  /**
   * Hook to subscribe to an entire Echo object that may be undefined.
   * Returns undefined if the object is undefined.
   *
   * @param obj - The Echo object to subscribe to (can be undefined)
   * @returns The current object value (or undefined) and update callback
   */
  <T extends Entity.Unknown>(obj: T | undefined): [Readonly<T> | undefined, ObjectUpdateCallback<T>];

  /**
   * Hook to subscribe to a specific property of an Echo object.
   * Returns the current property value and automatically re-renders when the property changes.
   *
   * @param obj - The Echo object to subscribe to
   * @param property - Property key to subscribe to
   * @returns The current property value and update callback
   */
  <T extends Entity.Unknown, K extends keyof T>(obj: T, property: K): [Readonly<T[K]>, ObjectPropUpdateCallback<T[K]>];

  /**
   * Hook to subscribe to a specific property of an Echo object that may be undefined.
   * Returns undefined if the object is undefined.
   *
   * @param obj - The Echo object to subscribe to (can be undefined)
   * @param property - Property key to subscribe to
   * @returns The current property value (or undefined) and update callback
   */
  <T extends Entity.Unknown, K extends keyof T>(
    obj: T | undefined,
    property: K,
  ): [Readonly<T[K]> | undefined, ObjectPropUpdateCallback<T[K]>];
} = (<T extends Entity.Unknown, K extends keyof T>(objOrRef: T | Ref.Ref<T> | undefined, property?: K): any => {
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
      Obj.change(obj as Entity.Unknown, (o: any) => {
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
    return [useObjectProperty(liveObj as Entity.Unknown | undefined, property as any), callback];
  }
  return [useObjectValue(objOrRef), callback];
}) as any;

/**
 * Internal hook for subscribing to an Echo object or Ref.
 * AtomObj.make handles both objects and refs, returning snapshots.
 */
const useObjectValue = <T extends Entity.Unknown>(objOrRef: T | Ref.Ref<T> | undefined): T | undefined => {
  const atom = useMemo(() => AtomObj.make(objOrRef), [objOrRef]);
  return useAtomValue(atom);
};

/**
 * Internal hook for subscribing to a specific property of an Echo object.
 * Uses useAtomValue directly since makeProperty returns the value directly.
 */
const useObjectProperty = <T extends Entity.Unknown, K extends keyof T>(
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
export const useObjects = <T extends Entity.Unknown>(refs: Ref.Ref<T>[]): Readonly<T>[] => {
  // Track version to trigger re-renders when any ref or target changes.
  const [, setVersion] = useState(0);

  // Subscribe to all refs and their targets.
  useEffect(() => {
    let isMounted = true;
    const targetUnsubscribes = new Map<string, () => void>();

    // Function to trigger re-render.
    const triggerUpdate = () => {
      if (isMounted) {
        setVersion((v) => v + 1);
      }
    };

    // Function to set up subscription for a target.
    const subscribeToTarget = (ref: Ref.Ref<T>) => {
      if (!isMounted) return;
      const target = ref.target;
      if (target) {
        const key = ref.dxn.toString();
        if (!targetUnsubscribes.has(key)) {
          targetUnsubscribes.set(key, Obj.subscribe(target, triggerUpdate));
        }
      }
    };

    // Try to load all refs and subscribe to targets.
    for (const ref of refs) {
      // Subscribe to existing target if available.
      subscribeToTarget(ref);

      // Trigger async load if not already loaded.
      if (!ref.target) {
        void ref
          .load()
          .then(() => {
            subscribeToTarget(ref);
            triggerUpdate();
          })
          .catch(() => {
            // Ignore load errors.
          });
      }
    }

    return () => {
      isMounted = false;
      targetUnsubscribes.forEach((u) => u());
    };
  }, [refs]);

  // Compute current snapshots by reading each ref's target.
  const snapshots: Readonly<T>[] = [];
  for (const ref of refs) {
    const target = ref.target;
    if (target !== undefined) {
      snapshots.push(target as Readonly<T>);
    }
  }
  return snapshots;
};
