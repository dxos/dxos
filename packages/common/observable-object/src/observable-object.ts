//
// Copyright 2023 DXOS.org
//

import { UnsubscribeCallback } from '@dxos/async';
import { PublicKey } from '@dxos/keys';

import { logObjectAccess } from './access-observer';

export const subscribe = Symbol.for('dxos.observable-object.subscribe');

export type ObservableObject = {
  [subscribe]: (callback: (value: any) => void) => UnsubscribeCallback;
  _id: string;
};

// TODO(wittjosiah): Generic type?
export class ObservableObjectImpl implements ObservableObject {
  /**
   * @internal
   */
  _id = PublicKey.random().toHex();

  private _callbacks = new Set<(value: any) => void>();

  constructor(initialData: object = {}) {
    return new Proxy(this, {
      get: (target, property, receiver) => {
        logObjectAccess(this);
        return Reflect.get(target, property, receiver);
      },
      set: (target, property, value, receiver) => {
        logObjectAccess(this);
        this._emitUpdate();
        return Reflect.set(target, property, value, receiver);
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

export const createStore = (data: object | any[]): ObservableObject => {
  if (Array.isArray(data)) {
    // TODO(wittjosiah): Implement array as well.
    throw new Error('Not implemented');
  } else {
    return new ObservableObjectImpl(data);
  }
};
