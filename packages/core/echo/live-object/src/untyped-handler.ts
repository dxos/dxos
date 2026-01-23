//
// Copyright 2024 DXOS.org
//

import { Event } from '@dxos/async';
import { invariant } from '@dxos/invariant';

import { defineHiddenProperty } from './define-hidden-property';
import { emitEvent } from './event-batch';
import { EventId } from './live';
import {
  ReactiveArray,
  type ReactiveHandler,
  createProxy,
  getProxyTarget,
  isProxy,
  isValidProxyTarget,
  objectData,
} from './proxy';

/**
 * Symbol to mark typed objects (objects with schema).
 * Event propagation stops at typed object boundaries.
 */
export const symbolIsTypedObject = Symbol('isTypedObject');

/**
 * WeakMap for tracking parent references without mutating user objects.
 * Maps child objects to their parent targets.
 */
const parentMap = new WeakMap<object, object>();

/**
 * Type for objects that may have a parent reference for event bubbling.
 */
export type WithParentRef = {
  [symbolIsTypedObject]?: boolean;
};

type ProxyTarget = {
  [EventId]: Event<void>;
} & ({ [key: keyof any]: any } | any[]);

/**
 * Check if a value is a typed object (has schema).
 * Typed objects are boundaries for event propagation.
 */
const isTypedObject = (value: object): boolean => {
  return (value as WithParentRef)[symbolIsTypedObject] === true;
};

/**
 * Get the parent reference from a proxy target if it exists.
 * Uses WeakMap to avoid mutating user objects.
 */
export const getParent = (value: object): object | undefined => {
  return parentMap.get(value);
};

/**
 * Set the parent reference on a proxy target.
 * Only sets parent if the value is not a typed object (typed objects are roots).
 * Uses WeakMap to avoid mutating user objects.
 */
const setParent = (value: object, parent: object): void => {
  // Don't set parent on typed objects - they are roots of their own trees.
  if (!isTypedObject(value)) {
    parentMap.set(value, parent);
  }
};

/**
 * Clear the parent reference from a proxy target.
 */
const clearParent = (value: object): void => {
  parentMap.delete(value);
};

/**
 * Recursively set parent references on all nested objects.
 * Sets parent on the value itself, then recurses into children.
 * For typed objects, we still recurse into children but the typed object
 * itself becomes the root for its subtree (its children point to it).
 */
const setParentRecursively = (value: object, parent: object): void => {
  setParent(value, parent);

  // Recurse into nested objects and arrays.
  // For typed objects, the children should point to the typed object as their parent.
  for (const key of Object.keys(value)) {
    const nested = (value as Record<string, unknown>)[key];
    if (isValidProxyTarget(nested)) {
      setParentRecursively(nested, value);
    } else if (isProxy(nested)) {
      // Nested value is already a proxy - set parent on its underlying target.
      setParent(getProxyTarget(nested), value);
    }
  }
};

/**
 * Emit events up the parent chain to notify ancestors of changes.
 * Stops at typed object boundaries (typed objects don't propagate to their parents).
 * Uses a visited set to prevent infinite loops from cycles in the parent chain.
 */
const bubbleEvent = (target: object): void => {
  const visited = new Set<object>();
  let ancestor = getParent(target) as ProxyTarget | undefined;
  while (ancestor && !visited.has(ancestor)) {
    visited.add(ancestor);
    emitEvent(ancestor);
    // Stop propagation at typed object boundary.
    if (isTypedObject(ancestor)) {
      break;
    }
    ancestor = getParent(ancestor) as ProxyTarget | undefined;
  }
};

/**
 * Untyped in-memory reactive store.
 * Target can be an array or object with any type of values including other reactive proxies.
 * Reactivity is based on Event subscriptions, not signals.
 */
export class UntypedReactiveHandler implements ReactiveHandler<ProxyTarget> {
  public static readonly instance: ReactiveHandler<any> = new UntypedReactiveHandler();

  readonly _proxyMap = new WeakMap<object, any>();

  private constructor() {}

  init(target: ProxyTarget): void {
    invariant(typeof target === 'object' && target !== null);

    if (!(EventId in target)) {
      defineHiddenProperty(target, EventId, new Event());
    }

    for (const key of Object.getOwnPropertyNames(target)) {
      const descriptor = Object.getOwnPropertyDescriptor(target, key)!;
      if (descriptor.get) {
        // Ignore getters.
        continue;
      }

      let value = target[key as any];
      if (Array.isArray(value) && !(value instanceof ReactiveArray)) {
        value = ReactiveArray.from(value);
        target[key as any] = value;
      }

      // Set parent references recursively on nested objects for event bubbling.
      // This establishes the parent chain when the object is first proxied.
      if (isValidProxyTarget(value)) {
        setParentRecursively(value, target);
      } else if (isProxy(value)) {
        // Value is already a proxy - set parent on its underlying target.
        setParent(getProxyTarget(value), target);
      }
    }
  }

  get(target: ProxyTarget, prop: string | symbol, receiver: any): any {
    // Handle getter properties.
    if (Object.getOwnPropertyDescriptor(target, prop)?.get) {
      return Reflect.get(target, prop, receiver);
    }

    if (prop === objectData) {
      return toJSON(target);
    }

    const value = Reflect.get(target, prop);

    if (isValidProxyTarget(value)) {
      return createProxy(value, this);
    }

    return value;
  }

  has(target: ProxyTarget, prop: string | symbol): boolean {
    // Hide internal symbols from `in` operator and hasOwnProperty checks.
    if (prop === EventId) {
      return false;
    }
    return Reflect.has(target, prop);
  }

  set(target: ProxyTarget, prop: string | symbol, value: any, receiver: any): boolean {
    // Clear parent reference on old value if it exists.
    const oldValue = target[prop as any];
    if (isValidProxyTarget(oldValue) && getParent(oldValue) === target) {
      clearParent(oldValue);
    }

    // Convert arrays to reactive arrays on write.
    if (Array.isArray(value)) {
      value = ReactiveArray.from(value);
    }

    // Set parent references recursively on new value for event bubbling.
    if (isValidProxyTarget(value)) {
      setParentRecursively(value, target);
    } else if (isProxy(value)) {
      // Value is already a proxy - set parent on its underlying target.
      setParent(getProxyTarget(value), target);
    }

    const result = Reflect.set(target, prop, value);
    emitEvent(target);
    // Bubble event up to ancestors.
    bubbleEvent(target);
    return result;
  }

  ownKeys(target: ProxyTarget): ArrayLike<string | symbol> {
    // Filter out internal symbols from enumeration.
    return Reflect.ownKeys(target).filter((key) => key !== EventId);
  }

  getOwnPropertyDescriptor(target: ProxyTarget, prop: string | symbol): PropertyDescriptor | undefined {
    // Hide internal symbols from property descriptor checks.
    if (prop === EventId) {
      return undefined;
    }
    return Reflect.getOwnPropertyDescriptor(target, prop);
  }

  defineProperty(target: ProxyTarget, property: string | symbol, attributes: PropertyDescriptor): boolean {
    // Set parent references recursively on new value if it's a proxy target.
    if (attributes.value && isValidProxyTarget(attributes.value)) {
      setParentRecursively(attributes.value, target);
    } else if (attributes.value && isProxy(attributes.value)) {
      // Value is already a proxy - set parent on its underlying target.
      setParent(getProxyTarget(attributes.value), target);
    }

    const result = Reflect.defineProperty(target, property, attributes);
    emitEvent(target);
    // Bubble event up to ancestors.
    bubbleEvent(target);
    return result;
  }

  deleteProperty(target: ProxyTarget, prop: string | symbol): boolean {
    // Clear parent reference on deleted value.
    const oldValue = target[prop as any];
    if (isValidProxyTarget(oldValue) && getParent(oldValue) === target) {
      clearParent(oldValue);
    }

    const result = Reflect.deleteProperty(target, prop);
    emitEvent(target);
    // Bubble event up to ancestors.
    bubbleEvent(target);
    return result;
  }
}

const toJSON = (target: any): any => {
  return { '@type': 'ReactiveObject', ...target };
};
