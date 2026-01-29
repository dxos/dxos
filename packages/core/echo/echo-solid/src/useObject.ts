//
// Copyright 2025 DXOS.org
//

import { type MaybeAccessor, access } from '@solid-primitives/utils';
import { type Accessor, createEffect, createMemo, createSignal, onCleanup } from 'solid-js';

import { Entity, Obj, Ref } from '@dxos/echo';
import { AtomObj } from '@dxos/echo-atom';
import { type Registry, useRegistry } from '@dxos/effect-atom-solid';

export interface ObjectUpdateCallback<T> {
  (update: (obj: Entity.Mutable<T>) => void): void;
  (update: (obj: Entity.Mutable<T>) => Entity.Mutable<T>): void;
}

export interface ObjectPropUpdateCallback<T> {
  (update: (value: Entity.Mutable<T>) => void): void;
  (update: (value: Entity.Mutable<T>) => Entity.Mutable<T>): void;
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
 * Subscribe to a Ref's target object.
 * Automatically dereferences the ref and handles async loading.
 * Returns undefined if the ref hasn't loaded yet.
 *
 * @param ref - The Ref to dereference and subscribe to (can be reactive)
 * @returns A tuple of [accessor, updateCallback]
 */
export function useObject<T>(
  ref: MaybeAccessor<Ref.Ref<T>>,
): [Accessor<Readonly<T> | undefined>, ObjectUpdateCallback<T>];

/**
 * Subscribe to a Ref's target object that may be undefined.
 * Returns undefined if the ref is undefined or hasn't loaded yet.
 *
 * @param ref - The Ref to dereference and subscribe to (can be undefined/reactive)
 * @returns A tuple of [accessor, updateCallback]
 */
export function useObject<T>(
  ref: MaybeAccessor<Ref.Ref<T> | undefined>,
): [Accessor<Readonly<T> | undefined>, ObjectUpdateCallback<T>];

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

/**
 * Subscribe to an entire Echo object that may be undefined.
 * Returns undefined if the object is undefined.
 *
 * @param obj - The Echo object to subscribe to (can be undefined/reactive)
 * @returns A tuple of [accessor, updateCallback]
 */
export function useObject<T extends Entity.Unknown>(
  obj: MaybeAccessor<T | undefined>,
): [Accessor<ConditionalUndefined<T, T>>, ObjectUpdateCallback<T>];

/**
 * Subscribe to a specific property of an Echo object.
 * Returns the current property value accessor and an update callback.
 *
 * @param obj - The Echo object to subscribe to (can be reactive)
 * @param property - Property key to subscribe to
 * @returns A tuple of [accessor, updateCallback]
 */
export function useObject<T extends Entity.Unknown, K extends keyof T>(
  obj: MaybeAccessor<T>,
  property: K,
): [Accessor<Readonly<T[K]>>, ObjectPropUpdateCallback<T[K]>];

/**
 * Subscribe to a specific property of an Echo object that may be undefined.
 * Returns undefined if the object is undefined.
 *
 * @param obj - The Echo object to subscribe to (can be undefined/reactive)
 * @param property - Property key to subscribe to
 * @returns A tuple of [accessor, updateCallback]
 */
export function useObject<T extends Entity.Unknown, K extends keyof T>(
  obj: MaybeAccessor<T | undefined>,
  property: K,
): [Accessor<Readonly<T[K]> | undefined>, ObjectPropUpdateCallback<T[K]>];

/**
 * Subscribe to a specific property of a Ref's target object.
 * Automatically dereferences the ref and handles async loading.
 * Returns undefined if the ref hasn't loaded yet.
 *
 * @param ref - The Ref to dereference and subscribe to (can be reactive)
 * @param property - Property key to subscribe to
 * @returns A tuple of [accessor, updateCallback]
 */
export function useObject<T, K extends keyof T>(
  ref: MaybeAccessor<Ref.Ref<T>>,
  property: K,
): [Accessor<Readonly<T[K]> | undefined>, ObjectPropUpdateCallback<T[K]>];

/**
 * Subscribe to a specific property of a Ref's target object that may be undefined.
 * Returns undefined if the ref is undefined or hasn't loaded yet.
 *
 * @param ref - The Ref to dereference and subscribe to (can be undefined/reactive)
 * @param property - Property key to subscribe to
 * @returns A tuple of [accessor, updateCallback]
 */
export function useObject<T, K extends keyof T>(
  ref: MaybeAccessor<Ref.Ref<T> | undefined>,
  property: K,
): [Accessor<Readonly<T[K]> | undefined>, ObjectPropUpdateCallback<T[K]>];

/**
 * Subscribe to an Echo object or Ref (entire object or specific property).
 * Returns the current value accessor and an update callback.
 *
 * @param objOrRef - The Echo object or Ref to subscribe to (can be reactive)
 * @param property - Optional property key to subscribe to a specific property
 * @returns A tuple of [accessor, updateCallback]
 */
export function useObject<T extends Entity.Unknown, K extends keyof T>(
  objOrRef: MaybeAccessor<T | Ref.Ref<T> | undefined>,
  property?: K,
): [Accessor<any>, ObjectUpdateCallback<T> | ObjectPropUpdateCallback<T[K]>] {
  const registry = useRegistry();

  // Memoize the resolved input to track changes.
  const resolvedInput = createMemo(() => access(objOrRef));

  // Determine if input is a ref.
  const isRef = createMemo(() => Ref.isRef(resolvedInput()));

  // Get the live object for the callback (refs need to dereference).
  const liveObj = createMemo(() => {
    const input = resolvedInput();
    return isRef() ? (input as Ref.Ref<T>)?.target : (input as T | undefined);
  });

  // Create a stable callback that handles both object and property updates.
  const callback = (updateOrValue: unknown | ((obj: unknown) => unknown)) => {
    // Get current target for refs (may have loaded since render).
    const obj = isRef() ? (resolvedInput() as Ref.Ref<T>)?.target : liveObj();
    if (!obj) {
      return;
    }

    Entity.change(obj, (o: any) => {
      if (typeof updateOrValue === 'function') {
        const returnValue = (updateOrValue as (obj: unknown) => unknown)(property !== undefined ? o[property] : o);
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
  };

  if (property !== undefined) {
    // For property subscriptions on refs, we subscribe to trigger re-render on load.
    useObjectValue(registry, objOrRef);
    return [useObjectProperty(registry, liveObj, property), callback as ObjectPropUpdateCallback<T[K]>];
  }
  return [useObjectValue(registry, objOrRef), callback as ObjectUpdateCallback<T>];
}

/**
 * Internal function for subscribing to an Echo object or Ref.
 * AtomObj.make handles both objects and refs, returning snapshots.
 */
function useObjectValue<T extends Entity.Unknown>(
  registry: Registry.Registry,
  objOrRef: MaybeAccessor<T | Ref.Ref<T> | undefined>,
): Accessor<T | undefined> {
  // Memoize the resolved input to track changes.
  const resolvedInput = createMemo(() => access(objOrRef));

  // Initialize with the current value (if available).
  const initialInput = resolvedInput();
  const initialValue = initialInput ? registry.get(AtomObj.make(initialInput)) : undefined;
  const [value, setValue] = createSignal<T | undefined>(initialValue as T | undefined);

  // Subscribe to atom updates.
  createEffect(() => {
    const input = resolvedInput();

    if (!input) {
      setValue(() => undefined);
      return;
    }

    const atom = AtomObj.make(input);
    const currentValue = registry.get(atom);
    setValue(() => currentValue as T);

    const unsubscribe = registry.subscribe(
      atom,
      () => {
        setValue(() => registry.get(atom) as T);
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
  obj: Accessor<T | undefined>,
  property: K,
): Accessor<T[K] | undefined> {
  // Initialize with the current value (if available).
  const initialObj = obj();
  const initialValue = initialObj ? registry.get(AtomObj.makeProperty(initialObj, property)) : undefined;
  const [value, setValue] = createSignal<T[K] | undefined>(initialValue);

  // Subscribe to atom updates.
  createEffect(() => {
    const currentObj = obj();

    if (!currentObj) {
      setValue(() => undefined);
      return;
    }

    const atom = AtomObj.makeProperty(currentObj, property);
    const currentValue = registry.get(atom);
    setValue(() => currentValue);

    const unsubscribe = registry.subscribe(
      atom,
      () => {
        setValue(() => registry.get(atom) as T[K]);
      },
      { immediate: true },
    );

    onCleanup(unsubscribe);
  });

  return value;
}

/**
 * Subscribe to multiple Refs' target objects.
 * Automatically dereferences each ref and handles async loading.
 * Returns an accessor to an array of loaded snapshots (filtering out undefined values).
 *
 * This hook is useful for aggregate computations like counts or filtering
 * across multiple refs without using .target directly.
 *
 * @param refs - Array of Refs to dereference and subscribe to (can be reactive)
 * @returns Accessor to array of loaded target snapshots (excludes unloaded refs)
 */
export const useObjects = <T extends Entity.Unknown>(
  refs: MaybeAccessor<readonly Ref.Ref<T>[]>,
): Accessor<Readonly<T>[]> => {
  // Track version to trigger re-renders when any ref or target changes.
  const [version, setVersion] = createSignal(0);

  // Memoize the refs array to track changes.
  const resolvedRefs = createMemo(() => access(refs));

  // Subscribe to all refs and their targets.
  createEffect(() => {
    const currentRefs = resolvedRefs();
    const targetUnsubscribes = new Map<string, () => void>();

    // Function to trigger re-render.
    const triggerUpdate = () => {
      setVersion((v) => v + 1);
    };

    // Function to set up subscription for a target.
    const subscribeToTarget = (ref: Ref.Ref<T>) => {
      const target = ref.target;
      if (target) {
        const key = ref.dxn.toString();
        if (!targetUnsubscribes.has(key)) {
          targetUnsubscribes.set(key, Obj.subscribe(target, triggerUpdate));
        }
      }
    };

    // Try to load all refs and subscribe to targets.
    for (const ref of currentRefs) {
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

    onCleanup(() => {
      targetUnsubscribes.forEach((u) => u());
    });
  });

  // Compute current snapshots by reading each ref's target.
  return createMemo(() => {
    // Depend on version to re-compute when targets change.
    version();

    const currentRefs = resolvedRefs();
    const snapshots: Readonly<T>[] = [];
    for (const ref of currentRefs) {
      const target = ref.target;
      if (target !== undefined) {
        snapshots.push(target as Readonly<T>);
      }
    }
    return snapshots;
  });
};
