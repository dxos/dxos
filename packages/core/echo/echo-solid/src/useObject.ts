//
// Copyright 2025 DXOS.org
//

import { type MaybeAccessor, access } from '@solid-primitives/utils';
import { type Accessor, createEffect, createMemo, createSignal, onCleanup } from 'solid-js';

import type { Entity } from '@dxos/echo';
import { AtomObj } from '@dxos/echo-atom';
import { type Registry, useRegistry } from '@dxos/effect-atom-solid';

export interface ObjectUpdateCallback<T> {
  (update: (obj: T) => void): void;
  (update: (obj: T) => T): void;
}

export interface ObjectPropUpdateCallback<T> extends ObjectUpdateCallback<T> {
  (newValue: T): void;
}

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
 * Returns the current property value accessor and an update callback.
 *
 * @param obj - The Echo object to subscribe to (can be reactive)
 * @param property - Property key to subscribe to
 * @returns A tuple of [accessor, updateCallback]
 */
export function useObject<T extends Entity.Unknown | undefined, K extends keyof Exclude<T, undefined>>(
  obj: MaybeAccessor<T>,
  property: K,
): [Accessor<ConditionalUndefined<T, Exclude<T, undefined>[K]>>, ObjectPropUpdateCallback<Exclude<T, undefined>[K]>];

/**
 * Subscribe to an entire Echo object.
 * Returns the current object value accessor and an update callback.
 *
 * @param obj - The Echo object to subscribe to (can be reactive)
 * @returns A tuple of [accessor, updateCallback]
 */
export function useObject<T extends Entity.Unknown>(
  obj: MaybeAccessor<T>,
): [Accessor<ConditionalUndefined<T, T>>, ObjectUpdateCallback<T>];
export function useObject<T extends Entity.Unknown | undefined>(
  obj: MaybeAccessor<T>,
): [Accessor<ConditionalUndefined<T, Exclude<T, undefined>>>, ObjectUpdateCallback<Exclude<T, undefined>>];

/**
 * Subscribe to an Echo object (entire object or specific property).
 * Returns the current value accessor and an update callback.
 *
 * @param obj - The Echo object to subscribe to (can be reactive)
 * @param property - Optional property key to subscribe to a specific property
 * @returns A tuple of [accessor, updateCallback]
 */
export function useObject<T extends Entity.Unknown | undefined, K extends keyof Exclude<T, undefined>>(
  obj: MaybeAccessor<T>,
  property?: K,
):
  | [Accessor<ConditionalUndefined<T, Exclude<T, undefined>>>, ObjectUpdateCallback<Exclude<T, undefined>>]
  | [Accessor<ConditionalUndefined<T, Exclude<T, undefined>[K]>>, ObjectPropUpdateCallback<Exclude<T, undefined>[K]>];
export function useObject<T extends Entity.Unknown, K extends keyof T>(
  obj: MaybeAccessor<T>,
  property?: K,
):
  | [Accessor<ConditionalUndefined<T, T>>, ObjectUpdateCallback<T>]
  | [Accessor<ConditionalUndefined<T, T[K]>>, ObjectPropUpdateCallback<T[K]>];
export function useObject<T extends Entity.Unknown | undefined, K extends keyof Exclude<T, undefined>>(
  obj: MaybeAccessor<T>,
  property?: K,
):
  | [Accessor<ConditionalUndefined<T, Exclude<T, undefined>>>, ObjectUpdateCallback<Exclude<T, undefined>>]
  | [Accessor<ConditionalUndefined<T, Exclude<T, undefined>[K]>>, ObjectPropUpdateCallback<Exclude<T, undefined>[K]>] {
  const registry = useRegistry();

  // Memoize the resolved object to track changes.
  const resolvedObj = createMemo(() => access(obj));

  // Create a stable callback that handles both object and property updates.
  const callback = (updateOrValue: unknown | ((obj: unknown) => unknown)) => {
    const currentObj = resolvedObj();
    if (!currentObj) {
      return;
    }

    if (typeof updateOrValue === 'function') {
      const returnValue = (updateOrValue as (obj: unknown) => unknown)(
        property !== undefined ? (currentObj as any)[property] : currentObj,
      );
      if (returnValue !== undefined) {
        if (property === undefined) {
          throw new Error('Cannot re-assign the entire object');
        }
        (currentObj as any)[property] = returnValue;
      }
    } else {
      if (property === undefined) {
        throw new Error('Cannot re-assign the entire object');
      }
      (currentObj as any)[property] = updateOrValue;
    }
  };

  if (property !== undefined) {
    return [useObjectProperty(registry, obj, property), callback as ObjectPropUpdateCallback<Exclude<T, undefined>[K]>];
  }
  return [useObjectValue(registry, obj), callback as ObjectUpdateCallback<Exclude<T, undefined>>];
}

/**
 * Internal function for subscribing to an entire Echo object.
 */
function useObjectValue<T extends Entity.Unknown | undefined>(
  registry: Registry.Registry,
  obj: MaybeAccessor<T>,
): Accessor<ConditionalUndefined<T, Exclude<T, undefined>>> {
  // Memoize the resolved object to track changes.
  const resolvedObj = createMemo(() => access(obj));

  // Store the current value in a signal.
  // Internally we use T | undefined for runtime safety, but return type is conditional.
  // Use { equals: false } because Echo objects are mutated in place, and we need to
  // notify subscribers even when the object reference hasn't changed.
  const [value, setValue] = createSignal<T | undefined>(resolvedObj(), { equals: false });

  // Subscribe to atom updates.
  createEffect(() => {
    const currentObj = resolvedObj();

    // If object is undefined, set it (the return type will be conditional).
    if (!currentObj) {
      setValue(() => undefined);
      return;
    }

    // Memoize the atom creation only when we have a valid object.
    const atom = AtomObj.make(currentObj);
    const currentValue = registry.get(atom).value;
    setValue(() => currentValue);

    // Subscribe to atom updates.
    const unsubscribe = registry.subscribe(
      atom,
      () => {
        setValue(() => registry.get(atom).value as T);
      },
      { immediate: true },
    );

    onCleanup(unsubscribe);
  });

  // Return with conditional type - TypeScript will narrow based on T.
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
  // Memoize the resolved object to track changes.
  const resolvedObj = createMemo(() => access(obj));

  // Store the current value in a signal.
  // Internally we use Exclude<T, undefined>[K] | undefined for runtime safety, but return type is conditional.
  type NonUndefinedT = Exclude<T, undefined>;
  const initialValue = resolvedObj() ? (resolvedObj() as NonUndefinedT)[property] : undefined;
  const [value, setValue] = createSignal<NonUndefinedT[K] | undefined>(initialValue);

  // Subscribe to atom updates.
  createEffect(() => {
    const currentObj = resolvedObj();

    // If object is undefined, set undefined (the return type will be conditional).
    if (!currentObj) {
      setValue(() => undefined);
      return;
    }

    // Memoize the atom creation only when we have a valid object.
    // currentObj is guaranteed to be Entity.Unknown here (not undefined) due to the check above.
    type NonUndefinedT = Exclude<T, undefined>;
    const echoObj = currentObj as NonUndefinedT;
    const atom = AtomObj.makeProperty(echoObj, property);
    const currentValue = registry.get(atom).value;
    setValue(() => currentValue);

    // Subscribe to atom updates.
    const unsubscribe = registry.subscribe(
      atom,
      () => {
        setValue(() => registry.get(atom).value as NonUndefinedT[K]);
      },
      { immediate: true },
    );

    onCleanup(unsubscribe);
  });

  // Return with conditional type - TypeScript will narrow based on T.
  return value as Accessor<ConditionalUndefined<T, Exclude<T, undefined>[K]>>;
}
