//
// Copyright 2023 DXOS.org
//

import { UnsubscribeCallback } from '@dxos/async';

import { logObjectAccess } from './access-observer';

export const subscribe = Symbol.for('dxos.observable-object.subscribe');

// TODO(burdon): Name clash with const below. Rename Observable? Or rename Impl => Dictionary.
export interface ObservableObject {
  [subscribe]: (callback: (value: any) => void) => UnsubscribeCallback;
}

export class ObservableObjectImpl<T> implements ObservableObject {
  private _subscriptions = new Set<(value: ObservableObjectImpl<T>) => void>();

  constructor(initialData?: T) {
    if (initialData) {
      Object.entries(initialData).forEach(([key, value]) => {
        (this as any)[key] = value;
      });
    }

    // TODO(wittjosiah): Implement other proxy methods here: enumerating properties, instanceof, etc.
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
    return new Proxy(this, {
      get: (_target, property, receiver) => {
        logObjectAccess(this);
        return Reflect.get(this, property, receiver);
      },
      set: (_target, property, value, receiver) => {
        logObjectAccess(this);
        const result = Reflect.set(this, property, value, receiver);
        this._emitUpdate();
        return result;
      },
    });
  }

  [subscribe](callback: (value: any) => void) {
    this._subscriptions.add(callback);
    return () => this._subscriptions.delete(callback);
  }

  private _emitUpdate() {
    for (const callback of this._subscriptions) {
      callback(this);
    }
  }
}

export class ObservableArray<T> extends Array<T> implements ObservableObject {
  private _subscriptions = new Set<(value: ObservableArray<T>) => void>();

  // TODO(burdon): Pass in array.
  constructor(...args: T[]) {
    super(...args);

    // TODO(wittjosiah): Implement other proxy methods here: enuming properties, instanceof, etc.
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
    return new Proxy(this, {
      get: (_target, property, receiver) => {
        logObjectAccess(this);
        return Reflect.get(this, property, receiver);
      },
      set: (_target, property, value, receiver) => {
        logObjectAccess(this);
        const result = Reflect.set(this, property, value, receiver);
        this._emitUpdate();
        return result;
      },
    });
  }

  [subscribe](callback: (value: any) => void) {
    this._subscriptions.add(callback);
    return () => this._subscriptions.delete(callback);
  }

  private _emitUpdate() {
    for (const callback of this._subscriptions) {
      callback(this);
    }
  }
}

// TODO(burdon): Rename createObservable? Does "store" imply some specialization?
export const createStore = <T extends object | any[]>(data?: T): T => {
  if (Array.isArray(data)) {
    return new ObservableArray(...data) as T;
  } else {
    return new ObservableObjectImpl(data) as T;
  }
};

export const ObservableObject: ObservableObjectConstructor = ObservableObjectImpl as any;

/**
 * Helper type to disable type inference for a generic parameter.
 * @see https://stackoverflow.com/a/56688073
 */
type NoInfer<T> = [T][T extends any ? 0 : never];

type ObservableObjectConstructor = {
  /**
   * Create a new document.
   * @param initialProps Initial properties.
   * @param _schemaType Schema type for generated types.
   */
  new <T extends Record<string, any> = Record<string, any>>(initialData?: NoInfer<Partial<T>>): ObservableObjectImpl<T>;
};
