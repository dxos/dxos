//
// Copyright 2025 DXOS.org
//

import type * as Atom from '@effect-atom/atom/Atom';
import type * as Registry from '@effect-atom/atom/Registry';
import isEqual from 'lodash.isequal';

import type { CleanupFn } from '@dxos/async';
import { type Entity, Obj } from '@dxos/echo';
import { getObjectCore } from '@dxos/echo-db';
import type { KeyPath } from '@dxos/echo-db';

/**
 * Subscription handle for an atom watching an Echo object.
 */
export interface AtomSubscription {
  readonly unsubscribe: () => void;
}

/**
 * Options for creating a subscription.
 */
export interface SubscriptionOptions {
  /**
   * The property path to watch (empty array for entire object).
   */
  readonly path?: KeyPath;
  /**
   * Whether to call the callback immediately with the current value.
   */
  readonly immediate?: boolean;
}

/**
 * Manages subscriptions to Echo object updates for atoms.
 * Directly subscribes to ObjectCore.updates (NOT through signals).
 */
export class EchoAtomSubscriptionManager {
  private readonly _registry: Registry.Registry;

  private readonly _subscriptions = new Map<
    Atom.Writable<any, any>,
    {
      obj: Entity.Unknown;
      path: KeyPath;
      previousValue: any;
      unsubscribe: CleanupFn;
    }
  >();

  private _batchQueue = new Map<Atom.Writable<any, any>, any>();
  private _batchScheduled = false;

  constructor(registry: Registry.Registry) {
    this._registry = registry;
  }

  /**
   * Get the underlying Effect Atom Registry.
   */
  getRegistry(): Registry.Registry {
    return this._registry;
  }

  /**
   * Subscribe an atom to updates from an Echo object.
   * The atom will be updated when the watched property changes.
   */
  subscribe<R, W>(atom: Atom.Writable<R, W>, obj: Entity.Unknown, options: SubscriptionOptions = {}): AtomSubscription {
    const core = getObjectCore(obj);
    const path = options.path ?? [];

    // Get initial value
    const getCurrentValue = () => {
      if (path.length === 0) {
        // For entire object, return the object itself
        return obj;
      }
      // For property path, get the value at that path
      return this._getValueAtPath(obj, path);
    };

    const currentValue = getCurrentValue();
    let previousValue = currentValue;

    // Store previous value for comparison
    // For object atoms, we need to do a deep clone to compare properties
    // For property atoms, we can compare the value directly
    const storedValue = path.length === 0 ? this._deepClone(currentValue) : currentValue;

    // Subscribe to ObjectCore.updates directly (NOT through signals)
    // Note: ObjectCore.updates fires AFTER the change has been applied,
    // so we can read the value directly
    const unsubscribe = core.updates.on(() => {
      const newValue = getCurrentValue();

      // For object atoms (path.length === 0), always update since the object reference
      // doesn't change but properties do. For property atoms, compare values.
      let shouldUpdate = false;
      if (path.length === 0) {
        // For entire object, always update when ObjectCore.updates fires
        // since properties have changed even if the object reference is the same
        shouldUpdate = true;
      } else {
        // For property atoms, compare the specific property value
        shouldUpdate = !isEqual(previousValue, newValue);
      }

      if (shouldUpdate) {
        previousValue = path.length === 0 ? this._deepClone(newValue) : newValue;
        // Get the atom's current value structure to preserve metadata
        let atomValue: any;
        try {
          atomValue = this._registry.get(atom);
        } catch {
          // Atom not in registry yet, create value structure from subscription info
          atomValue = { obj, path, value: newValue };
        }

        // Update the value structure with new value, preserving obj and path
        if (atomValue && typeof atomValue === 'object' && 'obj' in atomValue && 'path' in atomValue) {
          const updatedAtomValue = { ...atomValue, value: newValue };
          this._scheduleAtomUpdate(atom, updatedAtomValue as R);
        } else {
          // Fallback: create new value structure
          this._scheduleAtomUpdate(atom, { obj, path, value: newValue } as R);
        }
      }
    });

    // Store subscription info
    this._subscriptions.set(atom, {
      obj,
      path,
      previousValue: storedValue,
      unsubscribe,
    });

    // Call immediately if requested
    // Set the initial value structure directly (not batched) to ensure it's set before any updates
    if (options.immediate) {
      // Get the atom's current value structure to preserve metadata
      let atomValue: any;
      try {
        atomValue = this._registry.get(atom);
      } catch {
        // Atom not in registry yet, create value structure
        atomValue = { obj, path, value: currentValue };
      }

      // Update the value structure with current value, preserving obj and path
      if (atomValue && typeof atomValue === 'object' && 'obj' in atomValue && 'path' in atomValue) {
        const updatedAtomValue = { ...atomValue, value: currentValue };
        this._registry.set(atom, updatedAtomValue as W);
      } else {
        // Fallback: create new value structure
        this._registry.set(atom, { obj, path, value: currentValue } as W);
      }
    }

    return {
      unsubscribe: () => {
        const sub = this._subscriptions.get(atom);
        if (sub) {
          sub.unsubscribe();
          this._subscriptions.delete(atom);
          this._batchQueue.delete(atom);
        }
      },
    };
  }

  /**
   * Schedule an atom update, batching multiple updates in the same tick.
   * For single updates, applies immediately. For multiple updates, batches them.
   */
  private _scheduleAtomUpdate<R, W>(atom: Atom.Writable<R, W>, value: R): void {
    // Store the latest value for this atom
    // If the atom is already in the queue, this will overwrite with the latest value
    const wasEmpty = this._batchQueue.size === 0;
    this._batchQueue.set(atom, value);

    // If this is the first update and no batch is scheduled, update immediately
    if (wasEmpty && !this._batchScheduled) {
      // Update immediately for synchronous behavior
      this._registry.set(atom, value as unknown as W);
      this._batchQueue.delete(atom);
    } else if (!this._batchScheduled) {
      // Multiple updates in the same tick - batch them
      this._batchScheduled = true;
      queueMicrotask(() => {
        this._flushBatchUpdates();
      });
    }
  }

  /**
   * Flush all batched atom updates.
   * This ensures multiple property updates fire a single update per atom.
   */
  private _flushBatchUpdates(): void {
    const updates = Array.from(this._batchQueue.entries());
    this._batchQueue.clear();
    this._batchScheduled = false;

    // Update all atoms in the batch with their latest values
    for (const [atom, value] of updates) {
      // Update atom value through registry
      this._registry.set(atom, value);
    }
  }

  /**
   * Get the current value for an atom's subscription.
   */
  private _getValueForAtom(sub: { obj: Entity.Unknown; path: KeyPath }): any {
    if (sub.path.length === 0) {
      // For entire object, return the proxy object itself
      return sub.obj;
    }
    // For property path, get the value at that path from the object
    return this._getValueAtPath(sub.obj, sub.path);
  }

  /**
   * Update an atom's value through the registry.
   */
  private _updateAtomValue<R>(atom: Atom.Writable<R, R>, value: R): void {
    this._registry.set(atom, value);
  }

  /**
   * Get value at a path in the Echo object.
   */
  private _getValueAtPath(obj: Entity.Unknown, path: KeyPath): any {
    if (path.length === 0) {
      // For entire object, return the proxy object itself
      return obj;
    }
    // For property path, get the value at that path from the object
    return Obj.getValue(obj, path);
  }

  /**
   * Deep clone a value for comparison.
   */
  private _deepClone<T>(value: T): T {
    if (value == null) {
      return value;
    }
    if (typeof value === 'object') {
      try {
        return JSON.parse(JSON.stringify(value)) as T;
      } catch {
        // If JSON serialization fails, return as-is
        return value;
      }
    }
    return value;
  }

  /**
   * Cleanup all subscriptions.
   */
  dispose(): void {
    for (const sub of this._subscriptions.values()) {
      sub.unsubscribe();
    }
    this._subscriptions.clear();
    this._batchQueue.clear();
    this._batchScheduled = false;
  }
}

// Note: No default subscription manager - must be created with a Registry
