//
// Copyright 2023 DXOS.org
//

import { UnsubscribeCallback } from '@dxos/async';

import { logObjectAccess } from './access-observer';

export const subscribe = Symbol.for('dxos.observable-object.subscribe');

export interface ObservableObject {
  [subscribe]: (callback: (value: any) => void) => UnsubscribeCallback;
}

class ObservableObjectImpl<T> implements ObservableObject {
  private _subscriptions = new Set<(value: ObservableObjectImpl<T>) => void>();

  constructor(initialData?: T) {
    if (initialData) {
      Object.entries(initialData).forEach(([key, value]) => {
        (this as any)[key] = value;
      });
    }

    // TODO(wittjosiah): Implement other proxy methods here: enuming properties, instanceof, etc.
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
    return new Proxy(this, {
      get: (_target, property, receiver) => {
        logObjectAccess(this);
        return Reflect.get(this, property, receiver);
      },
      set: (_target, property, value, receiver) => {
        logObjectAccess(this);
        this._emitUpdate();
        return Reflect.set(this, property, value, receiver);
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

class ObservableArray<T> extends Array<T> implements ObservableObject {
  private _subscriptions = new Set<(value: ObservableArray<T>) => void>();

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
        this._emitUpdate();
        return Reflect.set(this, property, value, receiver);
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

export const createStore = <T extends object | any[]>(data?: T): T => {
  if (Array.isArray(data)) {
    return new ObservableArray(...data) as T;
  } else {
    return new ObservableObjectImpl(data) as T;
  }
};
