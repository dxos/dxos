//
// Copyright 2024 DXOS.org
//

import { type InspectOptionsStylized } from 'node:util';

import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import { inspectCustom } from '@dxos/debug';
import { type GenericSignal, compositeRuntime } from '@dxos/echo-signals/runtime';
import { invariant } from '@dxos/invariant';
import {
  ReactiveArray,
  type ReactiveHandler,
  createProxy,
  defineHiddenProperty,
  isValidProxyTarget,
  objectData,
  symbolIsProxy,
} from '@dxos/live-object';

import { getSchemaDXN } from '../ast';
import { DeletedId, SchemaId, SchemaValidator, TypeId } from '../object';

const symbolSignal = Symbol('signal');
const symbolPropertySignal = Symbol('property-signal');

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
   * For get and set operations on value properties.
   */
  // TODO(dmaretskyi): Turn into a map of signals per-field.
  [symbolSignal]: GenericSignal;

  /**
   * For modifying the structure of the object.
   */
  [symbolPropertySignal]: GenericSignal;
} & ({ [key: keyof any]: any } | any[]);

/**
 * Typed in-memory reactive store (with Schema).
 */
export class TypedReactiveHandler implements ReactiveHandler<ProxyTarget> {
  public static readonly instance: ReactiveHandler<any> = new TypedReactiveHandler();

  readonly _proxyMap = new WeakMap<object, any>();

  private constructor() {}

  init(target: ProxyTarget): void {
    invariant(typeof target === 'object' && target !== null);
    invariant(SchemaId in target, 'Schema is not defined for the target');

    if (!(symbolSignal in target)) {
      defineHiddenProperty(target, symbolSignal, compositeRuntime.createSignal());
      defineHiddenProperty(target, symbolPropertySignal, compositeRuntime.createSignal());
    }

    defineHiddenProperty(target, DeletedId, false);

    for (const key of Object.getOwnPropertyNames(target)) {
      const descriptor = Object.getOwnPropertyDescriptor(target, key)!;
      if (descriptor.get) {
        // Ignore getters.
        continue;
      }

      // Array reactivity is already handled by the schema validator.
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
      case objectData: {
        target[symbolSignal].notifyRead();
        return toJSON(target);
      }
    }

    // Handle getter properties. Will not subscribe the value signal.
    if (Object.getOwnPropertyDescriptor(target, prop)?.get) {
      target[symbolPropertySignal].notifyRead();

      // TODO(dmaretskyi): Turn getters into computed fields.
      return Reflect.get(target, prop, receiver);
    }

    target[symbolSignal].notifyRead();
    target[symbolPropertySignal].notifyRead();

    const value = Reflect.get(target, prop, receiver);
    if (isValidProxyTarget(value)) {
      return createProxy(value, this);
    }

    return value;
  }

  set(target: ProxyTarget, prop: string | symbol, value: any, receiver: any): boolean {
    // Convert arrays to reactive arrays on write.
    if (Array.isArray(value)) {
      value = ReactiveArray.from(value);
    }

    let result: boolean = false;
    compositeRuntime.batch(() => {
      const validatedValue = this._validateValue(target, prop, value);
      result = Reflect.set(target, prop, validatedValue, receiver);
      target[symbolSignal].notifyWrite();
    });
    return result;
  }

  ownKeys(target: ProxyTarget): ArrayLike<string | symbol> {
    // Touch both signals since `set` and `delete` operations may create or remove properties.
    target[symbolSignal].notifyRead();
    target[symbolPropertySignal].notifyRead();
    return Reflect.ownKeys(target);
  }

  defineProperty(target: ProxyTarget, property: string | symbol, attributes: PropertyDescriptor): boolean {
    const validatedValue = this._validateValue(target, property, attributes.value);
    const result = Reflect.defineProperty(target, property, {
      ...attributes,
      value: validatedValue,
    });
    target[symbolPropertySignal].notifyWrite();
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
    return `Typed ${inspectFn(this, {
      ...options,
      compact: true,
      showHidden: false,
      customInspect: false,
    })}`;
  }
}

/**
 * @deprecated Use `Obj.toJSON` instead.
 */
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
