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
  batchEvents,
  EventId,
  ReactiveArray,
  type ReactiveHandler,
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
        } else if (isProxy(validatedValue)) {
          // Value is already a proxy - set parent on its underlying target.
          setParent(getProxyTarget(validatedValue), target);
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
    const validatedValue = this._validateValue(target, property, attributes.value);
    // Set parent reference on new value for event bubbling.
    if (isValidProxyTarget(validatedValue)) {
      setParent(validatedValue, target);
    } else if (isProxy(validatedValue)) {
      // Value is already a proxy - set parent on its underlying target.
      setParent(getProxyTarget(validatedValue), target);
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
