//
// Copyright 2025 DXOS.org
//

import type * as Registry from '@effect-atom/atom/Registry';
import { RegistryContext } from '@effect-atom/atom-react';
import { useCallback, useContext, useMemo, useSyncExternalStore } from 'react';

import type { Entity } from '@dxos/echo';
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
  const registry = useContext(RegistryContext);

  if (!registry) {
    throw new Error('RegistryContext not found. Make sure to wrap your component with RegistryContext.Provider');
  }

  const callback: ObjectPropUpdateCallback<unknown> = useCallback(
    (updateOrValue: unknown | ((obj: unknown) => unknown)) => {
      if (typeof updateOrValue === 'function') {
        const returnValue = updateOrValue(property !== undefined ? obj[property] : obj);
        if (returnValue !== undefined) {
          if (property === undefined) {
            throw new Error('Cannot re-assign the entire object');
          }
          obj[property] = updateOrValue as any;
        }
      } else {
        if (property === undefined) {
          throw new Error('Cannot re-assign the entire object');
        }
        obj[property] = updateOrValue as any;
      }
    },
    [obj, property],
  );

  if (property !== undefined) {
    return [useObjectProperty(registry, obj, property), callback];
  }
  return [useObjectValue(registry, obj), callback];
};

/**
 * Internal hook for subscribing to an entire Echo object.
 */
function useObjectValue<T extends Entity.Unknown>(registry: Registry.Registry, obj: T): T {
  const { getValue, subscribe } = useMemo(() => {
    const atom = AtomObj.make(obj);
    const initialValue = obj;

    // Track subscription state
    let unsubscribe: (() => void) | undefined;
    let subscribed = false;

    return {
      getValue: () => {
        // Try to get value from registry (will work after subscription is set up)
        try {
          return AtomObj.get(registry, atom);
        } catch {
          // Atom not registered yet, return initial value
          return initialValue;
        }
      },
      subscribe: (onStoreChange: () => void) => {
        if (!subscribed) {
          subscribed = true;

          // Subscribe to atom updates (this will register the atom and set up Echo subscription)
          unsubscribe = AtomObj.subscribe(
            registry,
            atom,
            () => {
              onStoreChange();
            },
            { immediate: true },
          );
        }

        return () => {
          unsubscribe?.();
          subscribed = false;
        };
      },
    };
  }, [registry, obj]);

  // https://beta.reactjs.org/reference/react/useSyncExternalStore
  // NOTE: This hook will resubscribe whenever the callback passed to the first argument changes; make sure it is stable.
  return useSyncExternalStore<T>(subscribe, getValue);
}

/**
 * Internal hook for subscribing to a specific property of an Echo object.
 */
function useObjectProperty<T extends Entity.Unknown, K extends keyof T>(
  registry: Registry.Registry,
  obj: T,
  property: K,
): T[K] {
  const { getValue, subscribe } = useMemo(() => {
    const atom = AtomObj.makeProperty(obj, property);
    const initialValue = obj[property];

    // Track subscription state
    let unsubscribe: (() => void) | undefined;
    let subscribed = false;

    return {
      getValue: () => {
        // Try to get value from registry (will work after subscription is set up)
        try {
          return AtomObj.get(registry, atom);
        } catch {
          // Atom not registered yet, return initial value
          return initialValue;
        }
      },
      subscribe: (onStoreChange: () => void) => {
        if (!subscribed) {
          subscribed = true;

          // Subscribe to atom updates (this will register the atom and set up Echo subscription)
          unsubscribe = AtomObj.subscribe(
            registry,
            atom,
            () => {
              onStoreChange();
            },
            { immediate: true },
          );
        }

        return () => {
          unsubscribe?.();
          subscribed = false;
        };
      },
    };
  }, [registry, obj, property]);

  // https://beta.reactjs.org/reference/react/useSyncExternalStore
  // NOTE: This hook will resubscribe whenever the callback passed to the first argument changes; make sure it is stable.
  return useSyncExternalStore<T[K]>(subscribe, getValue);
}
