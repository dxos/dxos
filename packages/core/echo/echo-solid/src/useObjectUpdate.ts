//
// Copyright 2025 DXOS.org
//

import { type MaybeAccessor, access } from '@solid-primitives/utils';
import { createMemo } from 'solid-js';

import type { Entity } from '@dxos/echo';
import { AtomObj } from '@dxos/echo-atom';
import { type Registry, useRegistry } from '@dxos/effect-atom-solid';

/**
 * Returns an update function for a specific property of an Echo object.
 * The returned function is stable and memoized.
 *
 * @param obj - The Echo object to update (can be reactive)
 * @param property - Property key to update
 * @returns Update function that accepts a value or updater function
 */
export function useObjectUpdate<T extends Entity.Unknown, K extends keyof T>(
  obj: MaybeAccessor<T | undefined>,
  property: K,
): (value: T[K] | ((current: T[K]) => T[K])) => void;

/**
 * Returns an update function for an entire Echo object.
 * The returned function is stable and memoized.
 *
 * @param obj - The Echo object to update (can be reactive)
 * @returns Update function that accepts an updater function
 */
export function useObjectUpdate<T extends Entity.Unknown>(
  obj: MaybeAccessor<T | undefined>,
  property?: undefined,
): (updater: (obj: T) => void) => void;

/**
 * Returns an update function for an Echo object (entire object or specific property).
 * The returned function is stable and memoized.
 *
 * @param obj - The Echo object to update (can be reactive)
 * @param property - Optional property key to update a specific property
 * @returns Update function
 */
export function useObjectUpdate<T extends Entity.Unknown, K extends keyof T>(
  obj: MaybeAccessor<T | undefined>,
  property?: K,
): ((value: T[K] | ((current: T[K]) => T[K])) => void) | ((updater: (obj: T) => void) => void) {
  const registry = useRegistry();

  if (property !== undefined) {
    return useObjectPropertyUpdate(registry, obj, property);
  }
  return useObjectValueUpdate(registry, obj);
}

/**
 * Internal function for updating an entire Echo object.
 */
function useObjectValueUpdate<T extends Entity.Unknown>(
  registry: Registry.Registry,
  obj: MaybeAccessor<T | undefined>,
): (updater: (obj: T) => void) => void {
  // Memoize the resolved object to track changes
  const resolvedObj = createMemo(() => access(obj));

  // Return a stable update function that uses the memoized atom
  return (updater: (obj: T) => void) => {
    const currentObj = resolvedObj();
    if (!currentObj) {
      // Can't update undefined object
      return;
    }
    const a = AtomObj.make(currentObj);
    AtomObj.update(registry, a, updater);
  };
}

/**
 * Internal function for updating a specific property of an Echo object.
 */
function useObjectPropertyUpdate<T extends Entity.Unknown, K extends keyof T>(
  registry: Registry.Registry,
  obj: MaybeAccessor<T | undefined>,
  property: K,
): (value: T[K] | ((current: T[K]) => T[K])) => void {
  // Memoize the resolved object to track changes
  const resolvedObj = createMemo(() => access(obj));

  // Return a stable update function that uses the memoized atom
  return (value: T[K] | ((current: T[K]) => T[K])) => {
    const currentObj = resolvedObj();
    if (!currentObj) {
      // Can't update property on undefined object
      return;
    }
    const a = AtomObj.makeProperty(currentObj, property);
    AtomObj.updateProperty(registry, a, value);
  };
}
