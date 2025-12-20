//
// Copyright 2025 DXOS.org
//

import { type MaybeAccessor, access } from '@solid-primitives/utils';
import { type Accessor, createEffect, createMemo, createSignal, onCleanup } from 'solid-js';

import type { Entity } from '@dxos/echo';
import { AtomObj } from '@dxos/echo-atom';
import { type Registry, useRegistry } from '@dxos/effect-atom-solid';

/**
 * Subscribe to a specific property of an Echo object.
 * Returns the current property value and automatically updates when the property changes.
 *
 * @param obj - The Echo object to subscribe to (can be reactive)
 * @param property - Property key to subscribe to
 * @returns An accessor that returns the current property value
 */
export function useObject<T extends Entity.Unknown, K extends keyof T>(
  obj: MaybeAccessor<T>,
  property: K,
): Accessor<T[K]>;

/**
 * Subscribe to an entire Echo object.
 * Returns the current object value and automatically updates when the object changes.
 *
 * @param obj - The Echo object to subscribe to (can be reactive)
 * @returns An accessor that returns the current object value
 */
export function useObject<T extends Entity.Unknown>(obj: MaybeAccessor<T>): Accessor<T>;

/**
 * Subscribe to an Echo object (entire object or specific property).
 * Returns the current value and automatically updates when the object or property changes.
 *
 * @param obj - The Echo object to subscribe to (can be reactive)
 * @param property - Optional property key to subscribe to a specific property
 * @returns An accessor that returns the current object value or property value
 */
export function useObject<T extends Entity.Unknown, K extends keyof T>(
  obj: MaybeAccessor<T>,
  property?: K,
): Accessor<T> | Accessor<T[K]> {
  const registry = useRegistry();

  if (property !== undefined) {
    return useObjectProperty(registry, obj, property);
  }
  return useObjectValue(registry, obj);
}

/**
 * Internal function for subscribing to an entire Echo object.
 */
function useObjectValue<T extends Entity.Unknown>(registry: Registry.Registry, obj: MaybeAccessor<T>): Accessor<T> {
  // Memoize the resolved object to track changes
  const resolvedObj = createMemo(() => access(obj));

  // Memoize the atom creation
  const atom = createMemo(() => AtomObj.make(resolvedObj()));

  // Store the current value in a signal
  const [value, setValue] = createSignal<T>(resolvedObj());

  // Subscribe to atom updates
  createEffect(() => {
    const currentObj = resolvedObj();
    const a = atom();
    let currentValue = currentObj;

    // Try to get initial value from registry
    try {
      currentValue = AtomObj.get(registry, a);
    } catch {
      // Atom not registered yet, use initial value
      currentValue = currentObj;
    }

    setValue(() => currentValue);

    // Subscribe to atom updates
    const unsubscribe = AtomObj.subscribe(
      registry,
      a,
      () => {
        setValue(() => AtomObj.get(registry, a));
      },
      { immediate: true },
    );

    onCleanup(unsubscribe);
  });

  return value;
}

/**
 * Internal function for subscribing to a specific property of an Echo object.
 */
function useObjectProperty<T extends Entity.Unknown, K extends keyof T>(
  registry: Registry.Registry,
  obj: MaybeAccessor<T>,
  property: K,
): Accessor<T[K]> {
  // Memoize the resolved object to track changes
  const resolvedObj = createMemo(() => access(obj));

  // Memoize the atom creation
  const atom = createMemo(() => AtomObj.makeProperty(resolvedObj(), property));

  // Store the current value in a signal
  const [value, setValue] = createSignal<T[K]>(resolvedObj()[property]);

  // Subscribe to atom updates
  createEffect(() => {
    const currentObj = resolvedObj();
    const a = atom();
    let currentValue = currentObj[property];

    // Try to get initial value from registry
    try {
      currentValue = AtomObj.get(registry, a);
    } catch {
      // Atom not registered yet, use initial value
      currentValue = currentObj[property];
    }

    setValue(() => currentValue);

    // Subscribe to atom updates
    const unsubscribe = AtomObj.subscribe(
      registry,
      a,
      () => {
        setValue(() => AtomObj.get(registry, a));
      },
      { immediate: true },
    );

    onCleanup(unsubscribe);
  });

  return value;
}
