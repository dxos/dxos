//
// Copyright 2024 DXOS.org
//

import { GenericSignal, compositeRuntime } from '@dxos/echo-signals/runtime';

import { type ReactiveHandler, createReactiveProxy, isValidProxyTarget, symbolIsProxy } from './proxy';
import { log } from '@dxos/log';
import { invariant } from '@dxos/invariant';

export class UntypedReactiveHandler implements ReactiveHandler<any> {
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
