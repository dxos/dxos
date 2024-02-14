//
// Copyright 2024 DXOS.org
//

import { GenericSignal, compositeRuntime } from '@dxos/echo-signals/runtime';

import { createReactiveProxy, isValidProxyTarget, symbolIsProxy, type ReactiveHandler } from './proxy';

/**
 * Untyped in-memory reactive store.
 *
 * Target can be an array or object with any type of values including other reactive proxies.
 */
export class UntypedReactiveHandler implements ReactiveHandler<any> {
  // TODO(dmaretskyi): Does this work? Should this be a global variable instead?
  _proxyMap = new WeakMap<object, any>();
  _signal = compositeRuntime.createSignal();

  _init(target: any): void {
    if (typeof target === 'object' && target !== null) {
      for (const key in target) {
        if (Array.isArray(target[key])) {
          target[key] = new ReactiveArray(...target[key]);
          target[key]._signal = this._signal;
        }
      }
    }
  }

  get(target: any, prop: string | symbol, receiver: any): any {
    this._signal.notifyRead();
    const value = Reflect.get(target, prop);

    if ((value instanceof ReactiveArray || isValidProxyTarget(value)) && !(value as any)[symbolIsProxy]) {
      // Note: Need to pass in `this` instance to createReactiveProxy to ensure that the same proxy is used for target.
      return createReactiveProxy(value, this);
    }

    return value;
  }

  set(target: any, prop: string | symbol, value: any, receiver: any): boolean {
    // Convert arrays to reactive arrays on write.
    if (Array.isArray(value)) {
      value = new ReactiveArray(...value);
      value._signal = this._signal;
    }

    const result = Reflect.set(target, prop, value);
    this._signal.notifyWrite();
    return result;
  }

  defineProperty(target: any, property: string | symbol, attributes: PropertyDescriptor): boolean {
    const result = Reflect.defineProperty(target, property, attributes);
    this._signal.notifyWrite();
    return result;
  }
}

/**
 * Extends the native array to make sure that arrays methods are correctly reactive.
 */
class ReactiveArray<T> extends Array<T> {
  _signal!: GenericSignal;

  override push(...items: T[]): number {
    let result!: number;
    compositeRuntime.batch(() => {
      result = super.push(...items);
    });
    return result;
  }
}
