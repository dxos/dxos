//
// Copyright 2024 DXOS.org
//

import { type InspectOptionsStylized } from 'node:util';

import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import { Event } from '@dxos/async';
import { inspectCustom } from '@dxos/debug';
import { invariant } from '@dxos/invariant';

import { getSchemaDXN } from '../annotations';
import { ObjectDeletedId } from '../entities';
import { SchemaId, TypeId } from '../types';

import { defineHiddenProperty } from './define-hidden-property';
import { batchEvents, emitEvent } from './event-batch';
import { type ReactiveHandler, objectData } from './proxy-types';
import { createProxy, getProxyTarget, isProxy, isValidProxyTarget, symbolIsProxy } from './proxy-utils';
import { ReactiveArray } from './reactive-array';
import { SchemaValidator } from './schema-validator';
import { EventId } from './symbols';

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
 * Symbol to store the owning ECHO object reference on nested JS objects (records).
 * Every nested record is attributed to exactly one ECHO object.
 * This achieves:
 * - No cycles in the object graph (cyclical Refs are still allowed)
 * - No multiple inbound pointers to one record
 * - Centralized reactivity for entire ECHO object
 */
const EchoOwner = Symbol.for('@dxos/echo/Owner');

/**
 * Get the raw target from a value, unwrapping proxy if needed.
 */
const getRawTarget = (value: any): any => {
  return isProxy(value) ? getProxyTarget(value) : value;
};

/**
 * Get the ECHO object that owns this nested record.
 */
const getOwner = (value: any): object | undefined => {
  return value?.[EchoOwner];
};

/**
 * Set the ECHO object owner on a value and all its nested records.
 * All nested JS objects point directly to the root ECHO object.
 */
const setOwnerRecursive = (value: any, owner: object, visited = new Set<object>(), depth = 0): void => {
  if (value == null || typeof value !== 'object') {
    return;
  }

  const actualValue = getRawTarget(value);
  if (visited.has(actualValue)) {
    return;
  }
  visited.add(actualValue);

  // Set owner directly to the root ECHO object.
  defineHiddenProperty(actualValue, EchoOwner, owner);

  // Recursively set owner on nested objects and array elements.
  if (Array.isArray(actualValue)) {
    for (const item of actualValue) {
      if (isValidProxyTarget(item) || isProxy(item)) {
        setOwnerRecursive(item, owner, visited, depth + 1);
      }
    }
  } else {
    for (const key in actualValue) {
      if (Object.prototype.hasOwnProperty.call(actualValue, key)) {
        const nested = actualValue[key];
        if (isValidProxyTarget(nested) || isProxy(nested)) {
          setOwnerRecursive(nested, owner, visited, depth + 1);
        }
      }
    }
  }
};

/**
 * Check if a value would create a cycle when assigned to a target ECHO object.
 * Returns true if the value (or any nested object) IS the target root.
 */
const wouldCreateCycle = (targetRoot: object, value: any, visited = new Set<object>()): boolean => {
  if (value == null || typeof value !== 'object') {
    return false;
  }

  const actualValue = getRawTarget(value);

  if (visited.has(actualValue)) {
    return false; // Already checked this object.
  }
  visited.add(actualValue);

  // Check if value IS the target root ECHO object.
  if (actualValue === targetRoot) {
    return true;
  }

  // Recursively check nested objects in value.
  if (Array.isArray(actualValue)) {
    for (const item of actualValue) {
      if (wouldCreateCycle(targetRoot, item, visited)) {
        return true;
      }
    }
  } else {
    for (const key in actualValue) {
      if (Object.prototype.hasOwnProperty.call(actualValue, key)) {
        if (wouldCreateCycle(targetRoot, actualValue[key], visited)) {
          return true;
        }
      }
    }
  }

  return false;
};

/**
 * Deep copy a value, handling arrays and nested objects.
 * Preserves ReactiveArray type and hidden properties (SchemaId, TypeId).
 * Does not copy class instances or functions (except ReactiveArray).
 *
 * Note: Cannot use structuredClone because we need to:
 * - Unwrap proxies
 * - Preserve ReactiveArray instances
 * - Copy Symbol-keyed hidden properties (SchemaId, TypeId)
 * - Convert plain arrays to ReactiveArray
 *
 * Performance: O(n) where n is the total number of nested objects/arrays.
 * For large structures, consider using Refs for frequently reassigned subtrees.
 */
const deepCopy = <T>(value: T, visited = new Map<object, object>()): T => {
  if (value == null || typeof value !== 'object') {
    return value;
  }

  // Handle proxies - get the underlying target.
  const actualValue = getRawTarget(value);

  // Check for circular references in the copy.
  if (visited.has(actualValue)) {
    return visited.get(actualValue) as T;
  }

  // Handle ReactiveArray specially to preserve reactivity.
  if (actualValue instanceof ReactiveArray) {
    const copy = new ReactiveArray<any>();
    visited.set(actualValue, copy);
    for (const item of actualValue) {
      copy.push(deepCopy(item, visited));
    }
    // Copy hidden properties.
    copyHiddenProperties(actualValue, copy);
    return copy as T;
  }

  // Don't copy other class instances (objects with non-Object prototype).
  const proto = Object.getPrototypeOf(actualValue);
  if (proto !== Object.prototype && proto !== Array.prototype && proto !== null) {
    return value; // Return as-is, don't copy class instances.
  }

  if (Array.isArray(actualValue)) {
    // Plain arrays become ReactiveArrays.
    const copy = new ReactiveArray<any>();
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
  // Copy hidden properties (SchemaId, TypeId).
  copyHiddenProperties(actualValue, copy);
  return copy as T;
};

/**
 * Copy hidden properties (SchemaId, TypeId) from source to target.
 */
const copyHiddenProperties = (source: any, target: any): void => {
  if (SchemaId in source) {
    defineHiddenProperty(target, SchemaId, source[SchemaId]);
  }
  if (TypeId in source) {
    defineHiddenProperty(target, TypeId, source[TypeId]);
  }
};

/**
 * Maximum depth for owner chain traversal.
 * This is a defensive measure against malformed circular ownership.
 * Primary cycle detection is handled by wouldCreateCycle() before assignment.
 */
const MAX_OWNER_DEPTH = 100;

/**
 * Get the root ECHO object for a target.
 * Follows the owner chain to find the ultimate root.
 * An object may have EventId (from being created standalone) but if it now
 * has an owner, it's nested and we should use its owner's root instead.
 */
const getEchoRoot = (target: object, depth = 0): object => {
  invariant(depth < MAX_OWNER_DEPTH, 'Owner chain too deep - possible circular ownership');
  // If target has an owner, follow the chain to find the true root.
  // This handles the case where a standalone reactive object (with EventId)
  // is later nested into another object.
  const owner = getOwner(target);
  if (owner) {
    return getEchoRoot(owner, depth + 1);
  }
  // No owner means this is a root object.
  return target;
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

    // Only set EventId on root objects (those without an owner).
    // Nested objects share their root's EventId for centralized reactivity.
    const hasOwner = !!getOwner(target);
    if (!(EventId in target) && !hasOwner) {
      defineHiddenProperty(target, EventId, new Event());
    }

    defineHiddenProperty(target, ObjectDeletedId, false);

    // Only set owners if this is a root object (no existing owner).
    // Nested objects already have owners set by their root's initialization.
    // If we re-set owners here for nested objects, we'd incorrectly point
    // array elements to the array instead of the true root ECHO object.
    if (!hasOwner) {
      // Set owner on all nested objects to this root ECHO object.
      // All nested records point directly to this root for centralized reactivity.
      for (const key in target) {
        if ((target as any)[symbolIsProxy]) {
          continue;
        }
        const value = (target as any)[key];
        if (isValidProxyTarget(value) || isProxy(value)) {
          setOwnerRecursive(value, target);
        }
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
      return createProxy(value, this);
    }

    return value;
  }

  set(target: ProxyTarget, prop: string | symbol, value: any, receiver: any): boolean {
    let result: boolean = false;
    this._inSet = true;
    try {
      batchEvents(() => {
        const { echoRoot, preparedValue } = this._prepareValueForAssignment(target, prop, value);
        result = Reflect.set(target, prop, preparedValue, receiver);
        // Emit event on the root ECHO object (centralized reactivity).
        emitEvent(echoRoot);
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
    const { echoRoot, preparedValue } = this._prepareValueForAssignment(target, property, attributes.value);
    const result = Reflect.defineProperty(target, property, {
      ...attributes,
      value: preparedValue,
    });
    if (!this._inSet) {
      // Emit event on the root ECHO object (centralized reactivity).
      emitEvent(echoRoot);
    }
    return result;
  }

  /**
   * Prepare a value for assignment to a typed object property.
   * Handles cycle detection, copy-on-assign, array conversion, validation, and ownership.
   */
  private _prepareValueForAssignment(
    target: ProxyTarget,
    prop: string | symbol,
    value: any,
  ): { echoRoot: object; preparedValue: any } {
    const echoRoot = getEchoRoot(target);

    // Check for cycles before assignment.
    if (isValidProxyTarget(value) || isProxy(value)) {
      if (wouldCreateCycle(echoRoot, value)) {
        throw new Error('Cannot create cycles in typed object graph. Consider using Ref for circular references.');
      }
    }

    // Copy-on-assign: If the value is already owned by a different ECHO object, deep copy it.
    if (isValidProxyTarget(value) || isProxy(value)) {
      const actualValue = getRawTarget(value);
      const existingOwner = getOwner(actualValue);
      if (existingOwner != null && existingOwner !== echoRoot) {
        value = deepCopy(value);
      }
    }

    // Convert arrays to reactive arrays.
    if (Array.isArray(value) && !(value instanceof ReactiveArray)) {
      value = ReactiveArray.from(value);
    }

    const validatedValue = this._validateValue(target, prop, value);

    // Set owner on new value to the root ECHO object.
    if (isValidProxyTarget(validatedValue) || isProxy(validatedValue)) {
      setOwnerRecursive(validatedValue, echoRoot);
    }

    return { echoRoot, preparedValue: validatedValue };
  }

  private _validateValue(target: any, prop: string | symbol, value: any) {
    const schema = SchemaValidator.getTargetPropertySchema(target, prop);
    const _ = Schema.asserts(schema)(value);
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
