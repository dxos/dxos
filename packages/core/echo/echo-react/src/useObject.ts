//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import { useCallback, useMemo } from 'react';

import { type Entity, Obj } from '@dxos/echo';
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
   * Hook to subscribe to an entire Echo object.
   * Returns the current object value and automatically re-renders when the object changes.
   *
   * @param obj - The Echo object to subscribe to
   * @returns The current object value
   */
  <T extends Entity.Unknown>(obj: T): [Readonly<T>, ObjectUpdateCallback<T>];

  /**
   * Hook to subscribe to a specific property of an Echo object.
   * Returns the current property value and automatically re-renders when the property changes.
   *
   * @param obj - The Echo object to subscribe to
   * @param property - Property key to subscribe to
   * @returns The current property value
   */
  <T extends Entity.Unknown, K extends keyof T>(obj: T, property: K): [Readonly<T[K]>, ObjectPropUpdateCallback<T[K]>];
} = <T extends Entity.Unknown, K extends keyof T>(
  obj: T,
  property?: K,
): [Readonly<T | T[K]>, ObjectUpdateCallback<T | T[K]>] => {
  const callback: ObjectPropUpdateCallback<unknown> = useCallback(
    (updateOrValue: unknown | ((obj: unknown) => unknown)) => {
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
    [obj, property],
  );

  if (property !== undefined) {
    return [useObjectProperty(obj, property), callback];
  }
  return [useObjectValue(obj), callback];
};

/**
 * Internal hook for subscribing to an entire Echo object.
 * Uses useAtomValue directly since AtomObj.make() now returns snapshots.
 */
function useObjectValue<T extends Entity.Unknown>(obj: T): T {
  const atom = useMemo(() => AtomObj.make(obj), [obj]);
  return useAtomValue(atom);
}

/**
 * Internal hook for subscribing to a specific property of an Echo object.
 * Uses useAtomValue directly since makeProperty returns the value directly.
 */
function useObjectProperty<T extends Entity.Unknown, K extends keyof T>(obj: T, property: K): T[K] {
  const atom = useMemo(() => AtomObj.makeProperty(obj, property), [obj, property]);
  return useAtomValue(atom);
}
