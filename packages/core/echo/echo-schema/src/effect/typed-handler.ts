//
// Copyright 2024 DXOS.org
//

import { inspect, type InspectOptionsStylized } from 'node:util';

import { compositeRuntime, type GenericSignal } from '@dxos/echo-signals/runtime';

import { type ReactiveHandler, createReactiveProxy, isValidProxyTarget } from './proxy';
import { SchemaValidator, setSchemaProperties, symbolSchema } from './schema-validator';
import { data } from '../object';
import { defineHiddenProperty } from '../util/property';
import { invariant } from '@dxos/invariant';
import { ReactiveArray } from './reactive-array';
import * as S from '@effect/schema/Schema';

const symbolSignal = Symbol('signal');
const symbolPropertySignal = Symbol('property-signal');

type ProxyTarget = {
  /**
   * For get and set operations on value properties.
   */
  // TODO(dmaretskyi): Turn into a map of signals per-field.
  [symbolSignal]: GenericSignal;

  /**
   * For modifying the structure of the object.
   */
  [symbolPropertySignal]: GenericSignal;

  /**
   * Schema for the root.
   */
  [symbolSchema]: S.Schema<any>;
} & ({ [key: keyof any]: any } | any[]);

export class TypedReactiveHandler implements ReactiveHandler<ProxyTarget> {
  public static instance = new TypedReactiveHandler();

  private constructor() {}

  _proxyMap = new WeakMap<object, any>();

  _init(target: ProxyTarget): void {
    invariant(typeof target === 'object' && target !== null);
    invariant(symbolSchema in target, 'Schema is not defined for the target');

    if (!(symbolSignal in target)) {
      defineHiddenProperty(target, symbolSignal, compositeRuntime.createSignal());
      defineHiddenProperty(target, symbolPropertySignal, compositeRuntime.createSignal());
    }

    for (const key of Object.getOwnPropertyNames(target)) {
      const descriptor = Object.getOwnPropertyDescriptor(target, key)!;
      if (descriptor.get) {
        // Ignore getters.
        continue;
      }

      // Array reactivity is already handled by the schema validator.
    }

    if (inspect.custom) {
      defineHiddenProperty(target, inspect.custom, this._inspect.bind(target));
    }
  }

  get(target: ProxyTarget, prop: string | symbol, receiver: any): any {
    if (prop === data) {
      target[symbolSignal].notifyRead();
      return toJSON(target);
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
      return createReactiveProxy(value, this);
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
      const validatedValue = SchemaValidator.validateValue(target, prop, value);
      result = Reflect.set(target, prop, validatedValue, receiver);
      target[symbolSignal].notifyWrite();
    });
    return result;
  }

  defineProperty(target: ProxyTarget, property: string | symbol, attributes: PropertyDescriptor): boolean {
    const validatedValue = SchemaValidator.validateValue(target, property, attributes.value);
    const result = Reflect.defineProperty(target, property, {
      ...attributes,
      value: validatedValue,
    });
    target[symbolPropertySignal].notifyWrite();
    return result;
  }

  private _inspect(
    _: number,
    options: InspectOptionsStylized,
    inspectFn: (value: any, options?: InspectOptionsStylized) => string,
  ) {
    return `Typed ${inspectFn(this, {
      ...options,
      compact: true,
      showHidden: false,
      customInspect: false,
    })}`;
  }
}

const toJSON = (target: ProxyTarget): any => {
  return { '@type': 'TypedReactiveObject', ...target };
};
