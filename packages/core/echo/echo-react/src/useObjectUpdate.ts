//
// Copyright 2025 DXOS.org
//

import type * as Registry from '@effect-atom/atom/Registry';
import { RegistryContext } from '@effect-atom/atom-react';
import { useCallback, useContext, useMemo } from 'react';

import type { Entity } from '@dxos/echo';
import { AtomObj } from '@dxos/echo-atom';

/**
 * Hook that returns an update function for a specific property of an Echo object.
 * The returned function is stable and memoized to prevent unnecessary re-renders.
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
 * Hook that returns an update function for an entire Echo object.
 * The returned function is stable and memoized to prevent unnecessary re-renders.
 *
 * @param obj - The Echo object to update
 * @returns Update function that accepts an updater function
 */
export function useObjectUpdate<T extends Entity.Unknown>(
  obj: T,
  property?: undefined,
): (updater: (obj: T) => void) => void;

/**
 * Hook that returns an update function for an Echo object (entire object or specific property).
 * The returned function is stable and memoized to prevent unnecessary re-renders.
 *
 * @param obj - The Echo object to update
 * @param property - Optional property key to update a specific property
 * @returns Update function
 */
export function useObjectUpdate<T extends Entity.Unknown, K extends keyof T>(
  obj: T,
  property?: K,
): ((value: T[K] | ((current: T[K]) => T[K])) => void) | ((updater: (obj: T) => void) => void) {
  const registry = useContext(RegistryContext);

  if (!registry) {
    throw new Error('RegistryContext not found. Make sure to wrap your component with RegistryContext.Provider');
  }

  if (property !== undefined) {
    return useObjectPropertyUpdate(registry, obj, property);
  }
  return useObjectValueUpdate(registry, obj);
}

/**
 * Internal hook for updating an entire Echo object.
 */
function useObjectValueUpdate<T extends Entity.Unknown>(
  registry: Registry.Registry,
  obj: T,
): (updater: (obj: T) => void) => void {
  const atom = useMemo(() => AtomObj.make(obj), [obj]);

  return useCallback(
    (updater: (obj: T) => void) => {
      AtomObj.update(registry, atom, updater);
    },
    [registry, atom],
  );
}

/**
 * Internal hook for updating a specific property of an Echo object.
 */
function useObjectPropertyUpdate<T extends Entity.Unknown, K extends keyof T>(
  registry: Registry.Registry,
  obj: T,
  property: K,
): (value: T[K] | ((current: T[K]) => T[K])) => void {
  const atom = useMemo(() => AtomObj.makeProperty(obj, property), [obj, property]);

  return useCallback(
    (value: T[K] | ((current: T[K]) => T[K])) => {
      AtomObj.updateProperty(registry, atom, value);
    },
    [registry, atom],
  );
}
