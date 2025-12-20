//
// Copyright 2025 DXOS.org
//

import { createMemo } from 'solid-js';

import { Registry, useRegistry } from '@dxos/effect-atom-solid';

import type { Entity } from '@dxos/echo';
import { AtomObj } from '@dxos/echo-atom';

/**
 * Returns an update function for a specific property of an Echo object.
 * The returned function is stable and memoized.
 *
 * @param obj - The Echo object to update
 * @param property - Property key to update
 * @returns Update function that accepts a value or updater function
 */
export function useObjectUpdate<T extends Entity.Unknown, K extends keyof T>(
  obj: T,
  property: K,
): (value: T[K] | ((current: T[K]) => T[K])) => void;

/**
 * Returns an update function for an entire Echo object.
 * The returned function is stable and memoized.
 *
 * @param obj - The Echo object to update
 * @returns Update function that accepts an updater function
 */
export function useObjectUpdate<T extends Entity.Unknown>(
  obj: T,
  property?: undefined,
): (updater: (obj: T) => void) => void;

/**
 * Returns an update function for an Echo object (entire object or specific property).
 * The returned function is stable and memoized.
 *
 * @param obj - The Echo object to update
 * @param property - Optional property key to update a specific property
 * @returns Update function
 */
export function useObjectUpdate<T extends Entity.Unknown, K extends keyof T>(
  obj: T,
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
  obj: T,
): (updater: (obj: T) => void) => void {
  // Memoize the atom creation
  const atom = createMemo(() => AtomObj.make(obj));

  // Return a stable update function that uses the memoized atom
  return (updater: (obj: T) => void) => {
    AtomObj.update(registry, atom(), updater);
  };
}

/**
 * Internal function for updating a specific property of an Echo object.
 */
function useObjectPropertyUpdate<T extends Entity.Unknown, K extends keyof T>(
  registry: Registry.Registry,
  obj: T,
  property: K,
): (value: T[K] | ((current: T[K]) => T[K])) => void {
  // Memoize the atom creation
  const atom = createMemo(() => AtomObj.makeProperty(obj, property));

  // Return a stable update function that uses the memoized atom
  return (value: T[K] | ((current: T[K]) => T[K])) => {
    AtomObj.updateProperty(registry, atom(), value);
  };
}

