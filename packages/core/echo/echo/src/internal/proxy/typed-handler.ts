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

import { executeChange, isInChangeContext, queueNotification } from './change-context';
import { defineHiddenProperty } from './define-hidden-property';
import { createPropertyDeleteError } from './errors';
import { batchEvents } from './event-batch';
import {
  getEchoRoot,
  getOwner,
  getRawTarget,
  hasForeignOwner,
  notifyOwnerChain,
  setOwnerRecursive,
  wouldCreateCycle,
} from './ownership';
import { type ReactiveHandler, objectData } from './proxy-types';
import { createProxy, isProxy, isValidProxyTarget, symbolIsProxy } from './proxy-utils';
import { ReactiveArray } from './reactive-array';
import { SchemaValidator } from './schema-validator';
import { ChangeId, EventId } from './symbols';

// Re-export for external consumers.
export { getEchoRoot, setMetaOwner } from './ownership';

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

    // Mark root objects as having a change handler.
    // The actual handler is returned dynamically in get() to have access to the proxy.
    if (!hasOwner && !(ChangeId in target)) {
      defineHiddenProperty(target, ChangeId, true);
    }

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
        let value = (target as any)[key];
        if (isValidProxyTarget(value) || isProxy(value)) {
          // Deep copy values that have foreign owners (owned by a different object,
          // or are root ECHO objects whose nested structures would be owned by them).
          // This recursively checks all nested objects.
          if (hasForeignOwner(value, target)) {
            value = deepCopy(value);
            (target as any)[key] = value;
          }
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
      case ChangeId: {
        // Return change handler only for root objects that have been marked with ChangeId.
        if ((target as any)[ChangeId] !== true) {
          return undefined;
        }
        // Return a function that allows mutations within a controlled context.
        // Uses target as both the context key and event target for non-database objects.
        return (callback: (obj: any) => void) => executeChange(target, target, receiver, callback);
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
    const echoRoot = getEchoRoot(target);

    // Check readonly enforcement - mutations only allowed within Obj.change().
    // Skip check if the object is still being initialized (no ChangeId handler yet).
    // Also skip for non-initialized root objects (those without EventId).
    // Skip for symbol properties (internal infrastructure, not user data).
    const isInitialized = ChangeId in echoRoot || EventId in echoRoot;
    const isSymbolProp = typeof prop === 'symbol';
    if (isInitialized && !isSymbolProp && !isInChangeContext(echoRoot)) {
      throw new Error(
        `Cannot modify object property "${String(prop)}" outside of Obj.change(). ` +
          'Use Obj.change(obj, (mutableObj) => { mutableObj.property = value; }) instead.',
      );
    }

    let result: boolean = false;
    this._inSet = true;
    try {
      batchEvents(() => {
        const { echoRoot: _, preparedValue } = this._prepareValueForAssignment(target, prop, value);
        result = Reflect.set(target, prop, preparedValue, receiver);
        // Queue notification instead of emitting immediately (batched).
        if (isInitialized) {
          queueNotification(echoRoot);
          // Also notify the owner chain so parent objects are updated when nested objects change.
          notifyOwnerChain(target);
        }
      });
    } finally {
      this._inSet = false;
    }
    return result;
  }

  ownKeys(target: ProxyTarget): ArrayLike<string | symbol> {
    return Reflect.ownKeys(target);
  }

  deleteProperty(target: ProxyTarget, property: string | symbol): boolean {
    const echoRoot = getEchoRoot(target);

    // Check readonly enforcement - mutations only allowed within Obj.change().
    // Skip for symbol properties (internal infrastructure, not user data).
    const isInitialized = (echoRoot as any)[ChangeId] === true || EventId in echoRoot;
    const isSymbolProp = typeof property === 'symbol';
    if (isInitialized && !isSymbolProp && !isInChangeContext(echoRoot)) {
      throw createPropertyDeleteError(property);
    }

    const result = Reflect.deleteProperty(target, property);
    if (isInitialized) {
      queueNotification(echoRoot);
    }
    return result;
  }

  defineProperty(target: ProxyTarget, property: string | symbol, attributes: PropertyDescriptor): boolean {
    const echoRoot = getEchoRoot(target);

    // Check readonly enforcement - mutations only allowed within Obj.change().
    // Skip check if the object is still being initialized (no ChangeId handler yet).
    // Skip for symbol properties (internal infrastructure, not user data).
    const isInitialized = ChangeId in echoRoot || EventId in echoRoot;
    const isSymbolProp = typeof property === 'symbol';
    if (isInitialized && !isSymbolProp && !isInChangeContext(echoRoot)) {
      throw new Error(
        `Cannot modify object property "${String(property)}" outside of Obj.change(). ` +
          'Use Obj.change(obj, (mutableObj) => { mutableObj.property = value; }) instead.',
      );
    }

    const { echoRoot: _, preparedValue } = this._prepareValueForAssignment(target, property, attributes.value);
    const result = Reflect.defineProperty(target, property, {
      ...attributes,
      value: preparedValue,
    });
    if (!this._inSet && isInitialized) {
      // Queue notification instead of emitting immediately (batched).
      queueNotification(echoRoot);
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

    // Prevent direct assignment of root ECHO objects (those created with Obj.make/Relation.make).
    // These must be wrapped with Ref.make for proper reference handling.
    // This matches database object behavior for consistency.
    if (isValidProxyTarget(value) || isProxy(value)) {
      const actualValue = getRawTarget(value);
      const isRootEchoObject = EventId in actualValue;
      if (isRootEchoObject) {
        throw new Error('Object references must be wrapped with `Ref.make`');
      }
    }

    // Copy-on-assign: If the value is a nested record owned by a different ECHO object, deep copy it.
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
