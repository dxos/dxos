//
// Copyright 2024 DXOS.org
//

import { defineHiddenProperty, TYPENAME_SYMBOL } from '@dxos/echo-schema';
import { type ObjectMeta } from '@dxos/echo-schema';
import { compositeRuntime, type GenericSignal } from '@dxos/echo-signals/runtime';
import { invariant } from '@dxos/invariant';

import { getObjectMeta } from './object';
import { createProxy, isValidProxyTarget, objectData, ReactiveArray, type ReactiveHandler } from './proxy';

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
   * This is a separate signal so that getter properties are supported.
   */
  [symbolPropertySignal]: GenericSignal;
} & ({ [key: keyof any]: any } | any[]);

/**
 * Untyped in-memory reactive store.
 * Target can be an array or object with any type of values including other reactive proxies.
 */
export class UntypedReactiveHandler implements ReactiveHandler<ProxyTarget> {
  public static readonly instance: ReactiveHandler<any> = new UntypedReactiveHandler();

  // TODO(dmaretskyi): Does this work? Should this be a global variable instead?
  readonly _proxyMap = new WeakMap<object, any>();

  private constructor() {}

  init(target: ProxyTarget): void {
    invariant(typeof target === 'object' && target !== null);

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

      if (Array.isArray(target[key as any]) && !(target[key as any] instanceof ReactiveArray)) {
        target[key as any] = ReactiveArray.from(target[key as any]);
      }
    }
  }

  get(target: ProxyTarget, prop: string | symbol, receiver: any): any {
    // Handle getter properties. Will not subscribe the value signal.
    if (Object.getOwnPropertyDescriptor(target, prop)?.get) {
      target[symbolPropertySignal].notifyRead();

      // TODO(dmaretskyi): Turn getters into computed fields.
      return Reflect.get(target, prop, receiver);
    }

    target[symbolSignal].notifyRead();
    target[symbolPropertySignal].notifyRead();

    if (prop === objectData) {
      return toJSON(target);
    }

    if (prop === TYPENAME_SYMBOL) {
      return undefined;
    }

    const value = Reflect.get(target, prop);

    if (isValidProxyTarget(value)) {
      // Note: Need to pass in `this` instance to createProxy to ensure that the same proxy is used for target.
      return createProxy(value, this);
    }

    return value;
  }

  set(target: ProxyTarget, prop: string | symbol, value: any, receiver: any): boolean {
    // Convert arrays to reactive arrays on write.
    if (Array.isArray(value)) {
      value = ReactiveArray.from(value);
    }

    const result = Reflect.set(target, prop, value);
    target[symbolSignal].notifyWrite();
    return result;
  }

  ownKeys(target: ProxyTarget): ArrayLike<string | symbol> {
    // Touch both signals since `set` and `delete` operations may create or remove properties.
    target[symbolSignal].notifyRead();
    target[symbolPropertySignal].notifyRead();
    return Reflect.ownKeys(target);
  }

  defineProperty(target: ProxyTarget, property: string | symbol, attributes: PropertyDescriptor): boolean {
    const result = Reflect.defineProperty(target, property, attributes);
    target[symbolPropertySignal].notifyWrite();
    return result;
  }

  isDeleted(): boolean {
    return false;
  }

  getSchema() {
    return undefined;
  }

  getTypeReference() {
    return undefined;
  }

  getMeta(target: any): ObjectMeta {
    return getObjectMeta(target);
  }
}

const toJSON = (target: any): any => {
  return { '@type': 'ReactiveObject', ...target };
};