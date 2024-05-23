//
// Copyright 2024 DXOS.org
//

import { compositeRuntime, type GenericSignal } from '@dxos/echo-signals/runtime';
import { invariant } from '@dxos/invariant';

import { getTargetMeta } from './object';
import { createReactiveProxy, isValidProxyTarget, ReactiveArray, type ReactiveHandler } from '../proxy';
import { data, type ObjectMeta } from '../types';
import { defineHiddenProperty } from '../utils';

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
} & ({ [key: keyof any]: any } | any[]);

/**
 * Untyped in-memory reactive store.
 * Target can be an array or object with any type of values including other reactive proxies.
 */
export class UntypedReactiveHandler implements ReactiveHandler<ProxyTarget> {
  public static instance = new UntypedReactiveHandler();

  private constructor() {}

  // TODO(dmaretskyi): Does this work? Should this be a global variable instead?
  _proxyMap = new WeakMap<object, any>();

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

    if (prop === data) {
      return toJSON(target);
    }

    const value = Reflect.get(target, prop);

    if (isValidProxyTarget(value)) {
      // Note: Need to pass in `this` instance to createReactiveProxy to ensure that the same proxy is used for target.
      return createReactiveProxy(value, this);
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
    return getTargetMeta(target);
  }
}

const toJSON = (target: any): any => {
  return { '@type': 'ReactiveObject', ...target };
};
