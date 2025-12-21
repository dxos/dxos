//
// Copyright 2025 DXOS.org
//

import { type MaybeAccessor, access } from '@solid-primitives/utils';
import { type Accessor, createEffect, createMemo, createSignal, onCleanup } from 'solid-js';

import type { Entity } from '@dxos/echo';
import { AtomObj } from '@dxos/echo-atom';
import { type Registry, useRegistry } from '@dxos/effect-atom-solid';

/**
 * Helper type to conditionally include undefined in return type only if input includes undefined.
 * Only adds undefined if T includes undefined AND R doesn't already include undefined.
 */
type ConditionalUndefined<T, R> = [T] extends [Exclude<T, undefined>]
  ? R // T doesn't include undefined, return R as-is
  : [R] extends [Exclude<R, undefined>]
    ? R | undefined // T includes undefined but R doesn't, add undefined
    : R; // Both T and R include undefined, return R as-is (no double undefined)

/**
 * Subscribe to a specific property of an Echo object.
 * Returns the current property value and automatically updates when the property changes.
 *
 * @param obj - The Echo object to subscribe to (can be reactive)
 * @param property - Property key to subscribe to
 * @returns An accessor that returns the current property value
 */
export function useObject<T extends Entity.Unknown | undefined, K extends keyof Exclude<T, undefined>>(
  obj: MaybeAccessor<T>,
  property: K,
): Accessor<ConditionalUndefined<T, Exclude<T, undefined>[K]>>;

/**
 * Subscribe to an entire Echo object.
 * Returns the current object value and automatically updates when the object changes.
 *
 * @param obj - The Echo object to subscribe to (can be reactive)
 * @returns An accessor that returns the current object value
 */
export function useObject<T extends Entity.Unknown>(obj: MaybeAccessor<T>): Accessor<ConditionalUndefined<T, T>>;
export function useObject<T extends Entity.Unknown | undefined>(
  obj: MaybeAccessor<T>,
): Accessor<ConditionalUndefined<T, Exclude<T, undefined>>>;

/**
 * Subscribe to an Echo object (entire object or specific property).
 * Returns the current value and automatically updates when the object or property changes.
 *
 * @param obj - The Echo object to subscribe to (can be reactive)
 * @param property - Optional property key to subscribe to a specific property
 * @returns An accessor that returns the current object value or property value
 */
export function useObject<T extends Entity.Unknown | undefined, K extends keyof Exclude<T, undefined>>(
  obj: MaybeAccessor<T>,
  property?: K,
):
  | Accessor<ConditionalUndefined<T, Exclude<T, undefined>>>
  | Accessor<ConditionalUndefined<T, Exclude<T, undefined>[K]>>;
export function useObject<T extends Entity.Unknown, K extends keyof T>(
  obj: MaybeAccessor<T>,
  property?: K,
): Accessor<ConditionalUndefined<T, T>> | Accessor<ConditionalUndefined<T, T[K]>>;
export function useObject<T extends Entity.Unknown | undefined, K extends keyof Exclude<T, undefined>>(
  obj: MaybeAccessor<T>,
  property?: K,
):
  | Accessor<ConditionalUndefined<T, Exclude<T, undefined>>>
  | Accessor<ConditionalUndefined<T, Exclude<T, undefined>[K]>> {
  const registry = useRegistry();

  if (property !== undefined) {
    return useObjectProperty(registry, obj, property);
  }
  return useObjectValue(registry, obj);
}

/**
 * Internal function for subscribing to an entire Echo object.
 */
function useObjectValue<T extends Entity.Unknown | undefined>(
  registry: Registry.Registry,
  obj: MaybeAccessor<T>,
): Accessor<ConditionalUndefined<T, Exclude<T, undefined>>> {
  // Memoize the resolved object to track changes
  const resolvedObj = createMemo(() => access(obj));

  // Store the current value in a signal
  // Internally we use T | undefined for runtime safety, but return type is conditional
  const [value, setValue] = createSignal<T | undefined>(resolvedObj());

  // Subscribe to atom updates
  createEffect(() => {
    const currentObj = resolvedObj();

    // If object is undefined, set it (the return type will be conditional)
    if (!currentObj) {
      setValue(() => undefined);
      return;
    }

    // Memoize the atom creation only when we have a valid object
    const a = AtomObj.make(currentObj);
    let currentValue: T | undefined = currentObj;

    currentValue = AtomObj.get(registry, a);
    setValue(() => currentValue);

    // Subscribe to atom updates
    const unsubscribe = AtomObj.subscribe(
      registry,
      a,
      () => {
        setValue(() => AtomObj.get(registry, a) as T);
      },
      { immediate: true },
    );

    onCleanup(unsubscribe);
  });

  // Return with conditional type - TypeScript will narrow based on T
  return value as Accessor<ConditionalUndefined<T, Exclude<T, undefined>>>;
}

/**
 * Internal function for subscribing to a specific property of an Echo object.
 */
function useObjectProperty<T extends Entity.Unknown | undefined, K extends keyof Exclude<T, undefined>>(
  registry: Registry.Registry,
  obj: MaybeAccessor<T>,
  property: K,
): Accessor<ConditionalUndefined<T, Exclude<T, undefined>[K]>> {
  // Memoize the resolved object to track changes
  const resolvedObj = createMemo(() => access(obj));

  // Store the current value in a signal
  // Internally we use Exclude<T, undefined>[K] | undefined for runtime safety, but return type is conditional
  type NonUndefinedT = Exclude<T, undefined>;
  const initialValue = resolvedObj() ? (resolvedObj() as NonUndefinedT)[property] : undefined;
  const [value, setValue] = createSignal<NonUndefinedT[K] | undefined>(initialValue);

  // Subscribe to atom updates
  createEffect(() => {
    const currentObj = resolvedObj();

    // If object is undefined, set undefined (the return type will be conditional)
    if (!currentObj) {
      setValue(() => undefined);
      return;
    }

    // Memoize the atom creation only when we have a valid object
    // currentObj is guaranteed to be Entity.Unknown here (not undefined) due to the check above
    type NonUndefinedT = Exclude<T, undefined>;
    const obj = currentObj as NonUndefinedT;
    const a = AtomObj.makeProperty(obj, property);
    let currentValue: NonUndefinedT[K] | undefined = obj[property];

    currentValue = AtomObj.get(registry, a);
    setValue(() => currentValue);

    // Subscribe to atom updates
    const unsubscribe = AtomObj.subscribe(
      registry,
      a,
      () => {
        setValue(() => AtomObj.get(registry, a) as NonUndefinedT[K]);
      },
      { immediate: true },
    );

    onCleanup(unsubscribe);
  });

  // Return with conditional type - TypeScript will narrow based on T
  return value as Accessor<ConditionalUndefined<T, Exclude<T, undefined>[K]>>;
}
