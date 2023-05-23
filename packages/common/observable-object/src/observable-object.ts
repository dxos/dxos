//
// Copyright 2023 DXOS.org
//

import { UnsubscribeCallback } from '@dxos/async';
import { PublicKey } from '@dxos/keys';

import { logObjectAccess } from './access-observer';

export const subscribe = Symbol.for('dxos.observable-object.subscribe');

export interface ObservableObject {
  [subscribe]: (callback: (value: any) => void) => UnsubscribeCallback;
  _id: string;
}

class ObservableObjectImpl<T> implements ObservableObject {
  /**
   * @internal
   */
  _id = PublicKey.random().toHex();

  private _callbacks = new Set<(value: any) => void>();

  constructor(initialData?: T) {
    if (initialData) {
      Object.entries(initialData).forEach(([key, value]) => {
        (this as any)[key] = value;
      });
    }

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
    this._callbacks.add(callback);
    return () => this._callbacks.delete(callback);
  }

  _emitUpdate() {
    for (const callback of this._callbacks) {
      callback(this);
    }
  }
}

export type TypedObservableObject<T extends Record<string, any> = Record<string, any>> = ObservableObjectImpl<T> & T;

export const createStore = <T extends object | any[]>(data?: T): TypedObservableObject<T> => {
  if (Array.isArray(data)) {
    // TODO(wittjosiah): Implement array as well.
    throw new Error('Not implemented');
  } else {
    return new ObservableObjectImpl(data) as TypedObservableObject<T>;
  }
};
