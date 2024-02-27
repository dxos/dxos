//
// Copyright 2024 DXOS.org
//

import { compositeRuntime } from '@dxos/echo-signals/runtime';

import { type ReactiveHandler, createReactiveProxy, isValidProxyTarget } from './proxy';
import { SchemaValidator } from './schema-validator';

export class TypedReactiveHandler<T extends object> implements ReactiveHandler<T> {
  _proxyMap = new WeakMap<object, any>();
  _signal = compositeRuntime.createSignal();

  _init(target: any): void {
    SchemaValidator.initTypedTarget(target);
  }

  get(target: any, prop: string | symbol, receiver: any): any {
    this._signal.notifyRead();
    const value = Reflect.get(target, prop, receiver);
    if (isValidProxyTarget(value)) {
      return createReactiveProxy(value, this);
    }

    return value;
  }

  set(target: any, prop: string | symbol, value: any, receiver: any): boolean {
    let result: boolean = false;
    compositeRuntime.batch(() => {
      const validatedValue = SchemaValidator.validateValue(target, prop, value);
      result = Reflect.set(target, prop, validatedValue, receiver);
      this._signal.notifyWrite();
    });
    return result;
  }

  defineProperty(target: any, property: string | symbol, attributes: PropertyDescriptor): boolean {
    const validatedValue = SchemaValidator.validateValue(target, property, attributes.value);
    const result = Reflect.defineProperty(target, property, {
      ...attributes,
      value: validatedValue,
    });
    this._signal.notifyWrite();
    return result;
  }
}
