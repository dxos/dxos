//
// Copyright 2024 DXOS.org
//

import { type InspectOptionsStylized } from 'node:util';

import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import { Event } from '@dxos/async';
import { inspectCustom } from '@dxos/debug';
import { invariant } from '@dxos/invariant';
import {
  EventId,
  ReactiveArray,
  type ReactiveHandler,
  batchEvents,
  createProxy,
  defineHiddenProperty,
  emitEvent,
  getProxyTarget,
  isProxy,
  isValidProxyTarget,
  objectData,
  symbolIsProxy,
} from '@dxos/live-object';

import { getSchemaDXN } from '../annotations';
import { ObjectDeletedId } from '../entities';
import { SchemaValidator } from '../object';
import { SchemaId, TypeId } from '../types';

/**
 * Symbol to track which typed root object owns a nested object.
 * Each nested JS object should be attributed to exactly one typed root.
 */
const OwnerId = Symbol.for('@dxos/echo/OwnerId');

type ProxyTarget = {
  /**
   * Typename or type DXN.
   */
  [TypeId]: string;

  /**
   * Schema for the root.
   */
  [SchemaId]: Schema.Schema.AnyNoContext;

  /**
   * For modifications.
   */
  [EventId]: Event<void>;
} & ({ [key: keyof any]: any } | any[]);

/**
 * WeakMap for tracking parent references without mutating user objects.
 * Maps child objects to their parent targets.
 */
const parentMap = new WeakMap<object, object>();

/**
 * Get the parent reference from a proxy target if it exists.
 */
const getParent = (value: object): ProxyTarget | undefined => {
  return parentMap.get(value) as ProxyTarget | undefined;
};

/**
 * Set the parent reference on a proxy target.
 */
const setParent = (value: object, parent: object): void => {
  parentMap.set(value, parent);
};

/**
 * Clear the parent reference from a proxy target.
 */
const clearParent = (value: object): void => {
  parentMap.delete(value);
};

/**
 * Get the owner ID from an object if it exists.
 */
const getOwner = (value: any): symbol | undefined => {
  return value?.[OwnerId] as symbol | undefined;
};

/**
 * Set the owner ID on an object and all its nested objects.
 */
const setOwnerRecursive = (value: any, ownerId: symbol, visited = new Set<object>()): void => {
  if (value == null || typeof value !== 'object' || visited.has(value)) {
    return;
  }
  visited.add(value);

  defineHiddenProperty(value, OwnerId, ownerId);

  if (Array.isArray(value)) {
    for (const item of value) {
      setOwnerRecursive(item, ownerId, visited);
    }
  } else {
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        setOwnerRecursive(value[key], ownerId, visited);
      }
    }
  }
};

/**
 * Check if a value would create a cycle when assigned to a target.
 * Returns true if assigning value to target would create a cycle.
 */
const wouldCreateCycle = (target: ProxyTarget, value: any, visited = new Set<object>()): boolean => {
  if (value == null || typeof value !== 'object') {
    return false;
  }

  // Get the actual target if value is a proxy.
  const actualValue = isProxy(value) ? getProxyTarget(value) : value;

  if (visited.has(actualValue)) {
    return false; // Already checked this object.
  }
  visited.add(actualValue);

  // Check if value IS the target or any of its ancestors.
  let ancestor: ProxyTarget | undefined = target;
  while (ancestor) {
    if (ancestor === actualValue) {
      return true; // Would create a cycle.
    }
    ancestor = getParent(ancestor);
  }

  // Recursively check nested objects in value.
  if (Array.isArray(actualValue)) {
    for (const item of actualValue) {
      if (wouldCreateCycle(target, item, visited)) {
        return true;
      }
    }
  } else {
    for (const key in actualValue) {
      if (Object.prototype.hasOwnProperty.call(actualValue, key)) {
        if (wouldCreateCycle(target, actualValue[key], visited)) {
          return true;
        }
      }
    }
  }

  return false;
};

/**
 * Deep copy a value, handling arrays and nested objects.
 * Does not copy class instances or functions.
 */
const deepCopy = <T>(value: T, visited = new Map<object, object>()): T => {
  if (value == null || typeof value !== 'object') {
    return value;
  }

  // Handle proxies - get the underlying target.
  const actualValue = isProxy(value) ? getProxyTarget(value) : value;

  // Check for circular references in the copy.
  if (visited.has(actualValue)) {
    return visited.get(actualValue) as T;
  }

  // Don't copy class instances (objects with non-Object prototype).
  const proto = Object.getPrototypeOf(actualValue);
  if (proto !== Object.prototype && proto !== Array.prototype && proto !== null) {
    return value; // Return as-is, don't copy class instances.
  }

  if (Array.isArray(actualValue)) {
    const copy: any[] = [];
    visited.set(actualValue, copy);
    for (const item of actualValue) {
      copy.push(deepCopy(item, visited));
    }
    return copy as T;
  }

  const copy: Record<string, any> = {};
  visited.set(actualValue, copy);
  for (const key of Object.keys(actualValue)) {
    copy[key] = deepCopy((actualValue as any)[key], visited);
  }
  return copy as T;
};

/**
 * Emit events up the parent chain to notify ancestors of changes.
 */
const bubbleEvent = (target: ProxyTarget): void => {
  let ancestor = getParent(target);
  while (ancestor) {
    emitEvent(ancestor);
    ancestor = getParent(ancestor);
  }
};

/**
 * Typed in-memory reactive store (with Schema).
 * Reactivity is based on Event subscriptions, not signals.
 */
export class TypedReactiveHandler implements ReactiveHandler<ProxyTarget> {
  public static readonly instance: ReactiveHandler<any> = new TypedReactiveHandler();

  readonly _proxyMap = new WeakMap<object, any>();
  private _inSet = false;

  private constructor() {}

  init(target: ProxyTarget): void {
    invariant(typeof target === 'object' && target !== null);
    invariant(SchemaId in target, 'Schema is not defined for the target');

    if (!(EventId in target)) {
      defineHiddenProperty(target, EventId, new Event());
    }

    defineHiddenProperty(target, ObjectDeletedId, false);

    // Create a unique owner ID for this root typed object.
    // This ID is used to track which nested objects belong to this root.
    const ownerId = Symbol('typed-object-owner');
    setOwnerRecursive(target, ownerId);

    // Set parent references on nested objects for event bubbling.
    for (const key in target) {
      if ((target as any)[symbolIsProxy]) {
        continue;
      }
      const value = (target as any)[key];
      if (isValidProxyTarget(value)) {
        setParent(value, target);
      } else if (isProxy(value)) {
        // Value is already a proxy - set parent on its underlying target.
        setParent(getProxyTarget(value), target);
      }
    }

    // Maybe have been set by `create`.
    Object.defineProperty(target, inspectCustom, {
      enumerable: false,
      configurable: true,
      value: this._inspect.bind(target),
    });
  }

  get(target: ProxyTarget, prop: string | symbol, receiver: any): any {
    switch (prop) {
      // TODO(burdon): Remove?
      case objectData: {
        return toJSON(target);
      }
    }

    // Handle getter properties.
    if (Object.getOwnPropertyDescriptor(target, prop)?.get) {
      return Reflect.get(target, prop, receiver);
    }

    const value = Reflect.get(target, prop, receiver);
    if (isValidProxyTarget(value)) {
      // Set parent reference for event bubbling.
      setParent(value, target);
      return createProxy(value, this);
    }

    return value;
  }

  set(target: ProxyTarget, prop: string | symbol, value: any, receiver: any): boolean {
    // Clear parent reference on old value if it exists.
    const oldValue = target[prop as any];
    if (isValidProxyTarget(oldValue) && getParent(oldValue) === target) {
      clearParent(oldValue);
    }

    // Check for cycles before assignment.
    if (isValidProxyTarget(value) || isProxy(value)) {
      if (wouldCreateCycle(target, value)) {
        throw new Error('Cannot create cycles in typed object graph. Consider using Ref for circular references.');
      }
    }

    // Copy-on-assign: If the value is already owned by another typed object, deep copy it.
    // This prevents multiple inbound pointers to the same nested object.
    if (isValidProxyTarget(value) || isProxy(value)) {
      const actualValue = isProxy(value) ? getProxyTarget(value) : value;
      const existingOwner = getOwner(actualValue);
      const targetOwner = getOwner(target);
      if (existingOwner != null && existingOwner !== targetOwner) {
        // Value is owned by a different typed object - copy it.
        value = deepCopy(value);
      }
    }

    // Convert arrays to reactive arrays on write.
    if (Array.isArray(value)) {
      value = ReactiveArray.from(value);
    }

    let result: boolean = false;
    this._inSet = true;
    try {
      batchEvents(() => {
        const validatedValue = this._validateValue(target, prop, value);
        // Set parent reference on new value for event bubbling.
        if (isValidProxyTarget(validatedValue)) {
          setParent(validatedValue, target);
          // Set ownership on the new value.
          const targetOwner = getOwner(target);
          if (targetOwner != null) {
            setOwnerRecursive(validatedValue, targetOwner);
          }
        } else if (isProxy(validatedValue)) {
          // Value is already a proxy - set parent on its underlying target.
          const proxyTarget = getProxyTarget(validatedValue);
          setParent(proxyTarget, target);
          // Set ownership on the proxy target.
          const targetOwner = getOwner(target);
          if (targetOwner != null) {
            setOwnerRecursive(proxyTarget, targetOwner);
          }
        }
        result = Reflect.set(target, prop, validatedValue, receiver);
        emitEvent(target);
        // Bubble event up to ancestors.
        bubbleEvent(target);
      });
    } finally {
      this._inSet = false;
    }
    return result;
  }

  ownKeys(target: ProxyTarget): ArrayLike<string | symbol> {
    return Reflect.ownKeys(target);
  }

  defineProperty(target: ProxyTarget, property: string | symbol, attributes: PropertyDescriptor): boolean {
    let value = attributes.value;

    // Check for cycles before assignment.
    if (isValidProxyTarget(value) || isProxy(value)) {
      if (wouldCreateCycle(target, value)) {
        throw new Error('Cannot create cycles in typed object graph. Consider using Ref for circular references.');
      }
    }

    // Copy-on-assign: If the value is already owned by another typed object, deep copy it.
    if (isValidProxyTarget(value) || isProxy(value)) {
      const actualValue = isProxy(value) ? getProxyTarget(value) : value;
      const existingOwner = getOwner(actualValue);
      const targetOwner = getOwner(target);
      if (existingOwner != null && existingOwner !== targetOwner) {
        value = deepCopy(value);
      }
    }

    // Convert arrays to reactive arrays.
    if (Array.isArray(value)) {
      value = ReactiveArray.from(value);
    }

    const validatedValue = this._validateValue(target, property, value);
    // Set parent reference on new value for event bubbling.
    if (isValidProxyTarget(validatedValue)) {
      setParent(validatedValue, target);
      // Set ownership on the new value.
      const targetOwner = getOwner(target);
      if (targetOwner != null) {
        setOwnerRecursive(validatedValue, targetOwner);
      }
    } else if (isProxy(validatedValue)) {
      // Value is already a proxy - set parent on its underlying target.
      const proxyTarget = getProxyTarget(validatedValue);
      setParent(proxyTarget, target);
      // Set ownership on the proxy target.
      const targetOwner = getOwner(target);
      if (targetOwner != null) {
        setOwnerRecursive(proxyTarget, targetOwner);
      }
    }
    const result = Reflect.defineProperty(target, property, {
      ...attributes,
      value: validatedValue,
    });
    if (!this._inSet) {
      emitEvent(target);
      // Bubble event up to ancestors.
      bubbleEvent(target);
    }
    return result;
  }

  private _validateValue(target: any, prop: string | symbol, value: any) {
    const schema = SchemaValidator.getTargetPropertySchema(target, prop);
    const _ = Schema.asserts(schema)(value);
    if (Array.isArray(value)) {
      value = new ReactiveArray(...value);
    }
    if (isValidProxyTarget(value)) {
      setSchemaProperties(value, schema);
    }

    return value;
  }

  private _inspect(
    _: number,
    options: InspectOptionsStylized,
    inspectFn: (value: any, options?: InspectOptionsStylized) => string,
  ): string {
    const inspected = inspectFn(this, {
      ...options,
      showHidden: false,
      customInspect: false,
    });

    return `Typed ${inspected}`;
  }
}

/**
 * @deprecated Use `Obj.toJSON` instead.
 */
// TODO(burdon): Remove?
const toJSON = (target: ProxyTarget): any => {
  return { '@type': 'TypedReactiveObject', ...target };
};

/**
 * Recursively set AST on all potential proxy targets.
 */
const setSchemaProperties = (obj: any, schema: Schema.Schema.AnyNoContext) => {
  const schemaType = getSchemaDXN(schema);
  if (schemaType != null) {
    defineHiddenProperty(obj, TypeId, schemaType);
  }

  defineHiddenProperty(obj, SchemaId, schema);
  for (const key in obj) {
    if (isValidProxyTarget(obj[key])) {
      const elementSchema = SchemaValidator.getTargetPropertySchema(obj, key);
      if (elementSchema != null) {
        setSchemaProperties(obj[key], elementSchema);
      }
    }
  }
};

export const prepareTypedTarget = <T>(target: T, schema: Schema.Schema<T>) => {
  // log.info('prepareTypedTarget', { target, schema });
  if (!SchemaAST.isTypeLiteral(schema.ast)) {
    throw new Error('schema has to describe an object type');
  }

  SchemaValidator.validateSchema(schema);
  const _ = Schema.asserts(schema)(target);
  makeArraysReactive(target);
  setSchemaProperties(target, schema);
};

const makeArraysReactive = (target: any) => {
  for (const key in target) {
    if (target[symbolIsProxy]) {
      continue;
    }
    if (Array.isArray(target[key])) {
      target[key] = ReactiveArray.from(target[key]);
    }
    if (typeof target[key] === 'object') {
      makeArraysReactive(target[key]);
    }
  }
};
