//
// Copyright 2025 DXOS.org
//

import * as Atom from '@effect-atom/atom/Atom';
import type * as Registry from '@effect-atom/atom/Registry';

import { type Entity, Obj } from '@dxos/echo';
import { isEchoObject } from '@dxos/echo-db';
import type { KeyPath } from '@dxos/echo-db';
import { assertArgument } from '@dxos/invariant';

import { EchoAtomSubscriptionManager } from './subscription';

/**
 * Atom value structure that includes metadata.
 */
export interface AtomValue<T> {
  readonly obj: Entity.Unknown;
  readonly path: KeyPath;
  readonly value: T;
}

/**
 * Extract metadata from an atom's current value.
 */
function getAtomMetadata(
  atom: Atom.Writable<any, any>,
  registry: Registry.Registry,
): { obj: Entity.Unknown; path: KeyPath } | undefined {
  const atomValue = registry.get(atom);
  if (atomValue && typeof atomValue === 'object' && 'obj' in atomValue && 'path' in atomValue) {
    return {
      obj: (atomValue as AtomValue<any>).obj,
      path: (atomValue as AtomValue<any>).path,
    };
  }
  return undefined;
}

/**
 * Extract just the value part from an atom's current value.
 */
function getAtomValue<T>(atom: Atom.Writable<AtomValue<T>, AtomValue<T>>, registry: Registry.Registry): T {
  const atomValue = registry.get(atom);
  if (atomValue && typeof atomValue === 'object' && 'value' in atomValue) {
    return (atomValue as AtomValue<T>).value;
  }
  // Fallback for atoms that might not have the structure yet
  return atomValue as T;
}

/**
 * Helper function to get EchoAtomSubscriptionManager instance for a registry.
 * Uses closure-level WeakMap cache (not module-level).
 */
const getSubscriptionManager = (() => {
  const cache = new WeakMap<Registry.Registry, EchoAtomSubscriptionManager>();
  return (registry: Registry.Registry): EchoAtomSubscriptionManager => {
    let manager = cache.get(registry);
    if (!manager) {
      manager = new EchoAtomSubscriptionManager(registry);
      cache.set(registry, manager);
    }
    return manager;
  };
})();

/**
 * Namespace for Echo Atom utility functions.
 */
export namespace AtomObj {
  /**
   * Create an atom for an entire Echo object.
   * The atom stores metadata as part of its value structure.
   *
   * @param obj - The Echo object to wrap
   * @returns A writable atom that tracks the entire object
   */
  export function make<T extends Entity.Unknown>(obj: T): Atom.Writable<AtomValue<T>, AtomValue<T>> {
    assertArgument(isEchoObject(obj), 'obj', 'Object must be an Echo object');
    const atomValue: AtomValue<T> = { obj, path: [], value: obj };
    const atom = Atom.make<AtomValue<T>>(atomValue);
    return atom;
  }

  /**
   * Create an atom for a specific property of an Echo object.
   * The atom stores metadata as part of its value structure.
   *
   * @param obj - The Echo object
   * @param key - The property key to watch
   * @returns A writable atom that tracks the specific property
   */
  export function makeProperty<T extends Entity.Unknown, K extends keyof T>(
    obj: T,
    key: K,
  ): Atom.Writable<AtomValue<T[K]>, AtomValue<T[K]>> {
    assertArgument(isEchoObject(obj), 'obj', 'Object must be an Echo object');
    assertArgument(key in obj, 'key', 'Property must exist on object');
    const pathArray: KeyPath = [String(key)];
    const atomValue: AtomValue<T[K]> = { obj, path: pathArray, value: obj[key] };
    const atom = Atom.make<AtomValue<T[K]>>(atomValue);
    return atom;
  }

  /**
   * Get the current value of an Echo atom from the registry.
   * Automatically registers the atom if not already registered.
   * Does not set up subscriptions - use AtomObj.subscribe() for that.
   *
   * @param registry - The Effect Atom Registry
   * @param atom - The atom to get the value from
   * @returns The current value (extracted from atom value structure)
   */
  export function get<T>(registry: Registry.Registry, atom: Atom.Writable<AtomValue<T>, AtomValue<T>>): T {
    // Extract and return just the value part
    return getAtomValue(atom, registry);
  }

  /**
   * Update an Echo object through its atom.
   * Accepts a callback that mutates the object directly.
   * Updates the registry to fire existing subscriptions (registry update is a noop but needed for subscriptions).
   *
   * @param registry - The Effect Atom Registry
   * @param atom - The atom to update
   * @param updater - Callback function that mutates the object (no return value expected)
   */
  export function update<T extends Entity.Unknown>(
    registry: Registry.Registry,
    atom: Atom.Writable<AtomValue<T>, AtomValue<T>>,
    updater: (obj: T) => void,
  ): void {
    const metadata = getAtomMetadata(atom, registry);
    if (!metadata) {
      throw new Error('Atom metadata not found');
    }

    // Get the current object value
    const currentObj = getAtomValue(atom, registry);

    // TODO: Updates to the object should be restricted to being made within this callback.
    // Call the updater callback to mutate the object
    updater(currentObj);

    // Update registry to fire existing subscriptions (noop but needed for subscriptions)
    registry.update(atom, (currentAtomValue) => ({ ...currentAtomValue, value: currentObj }));
  }

  /**
   * Update a property of an Echo object through its atom.
   * Accepts either a value or an updater function.
   * Updates the registry value directly and fires existing subscriptions.
   * Also updates the Echo object to keep it in sync.
   *
   * @param registry - The Effect Atom Registry
   * @param atom - The property atom to update
   * @param value - The new value or an updater function
   */
  export function updateProperty<T extends Entity.Unknown, K extends keyof T>(
    registry: Registry.Registry,
    atom: Atom.Writable<AtomValue<T[K]>, AtomValue<T[K]>>,
    value: T[K] | ((current: T[K]) => T[K]),
  ): void {
    const metadata = getAtomMetadata(atom, registry);
    if (!metadata || metadata.path.length !== 1) {
      throw new Error('Atom metadata not found or invalid for property atom');
    }

    const currentValue = getAtomValue(atom, registry);
    const newValue = typeof value === 'function' ? (value as (current: T[K]) => T[K])(currentValue) : value;

    // Update registry value directly to fire existing subscriptions
    registry.update(atom, (currentAtomValue) => ({ ...currentAtomValue, value: newValue }));

    // Update the Echo object property to keep it in sync
    Obj.setValue(metadata.obj, metadata.path, newValue);
  }

  /**
   * Subscribe to updates from an Echo atom.
   *
   * @param registry - The Effect Atom Registry
   * @param atom - The atom to subscribe to
   * @param callback - Callback function called when the atom updates (receives just the value)
   * @param options - Subscription options
   * @returns Unsubscribe function
   */
  export function subscribe<T>(
    registry: Registry.Registry,
    atom: Atom.Writable<AtomValue<T>, AtomValue<T>>,
    callback: (value: T) => void,
    options?: { readonly immediate?: boolean },
  ): () => void {
    const subscriptionManager = getSubscriptionManager(registry);

    const metadata = getAtomMetadata(atom, registry);
    if (!metadata) {
      throw new Error('Atom metadata not found');
    }

    // Set up Echo object subscription
    subscriptionManager.subscribe(atom, metadata.obj, {
      path: metadata.path,
      immediate: options?.immediate ?? false,
    });

    // Subscribe to registry updates and extract value before calling callback
    return registry.subscribe(
      atom,
      (atomValue: AtomValue<T>) => {
        callback(atomValue.value);
      },
      options?.immediate !== undefined ? { immediate: options.immediate } : undefined,
    );
  }
}
