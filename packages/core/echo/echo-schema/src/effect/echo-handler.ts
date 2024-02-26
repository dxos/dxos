//
// Copyright 2024 DXOS.org
//

import { createReactiveProxy, symbolIsProxy, type ReactiveHandler } from './proxy';
import { AutomergeObjectCore, getAutomergeObjectCore } from '../automerge';
import { ReactiveObject } from './reactive';
import { EchoDatabase } from '../database';
import { TypedObject } from '../object';
import { invariant } from '@dxos/invariant';
import { assignDeep } from '@dxos/util';
import { compositeRuntime } from '@dxos/echo-signals/runtime';

const symbolPath = Symbol('path');

type PropPath = string[];

type ProxyTarget = {
  [symbolPath]: PropPath;
} & (object | any[]);

const DATA_NAMESPACE = 'data';

// TODO(dmaretskyi): Unfinished code.

/**
 * Shared for all targets within one ECHO object.
 */
export class EchoReactiveHandler implements ReactiveHandler<ProxyTarget> {
  _proxyMap = new WeakMap<object, any>();

  _objectCore = new AutomergeObjectCore();

  private _signal = compositeRuntime.createSignal();

  _init(target: ProxyTarget): void {
    invariant(!(target as any)[symbolIsProxy]);
    this._objectCore.initNewObject(target);
    for (const key in target) {
      if (typeof key !== 'symbol') {
        delete (target as any)[key];
      }
    }
  }

  get(target: ProxyTarget, prop: string | symbol, receiver: any): any {
    invariant(Array.isArray(target[symbolPath]));
    invariant(typeof prop === 'string');
    const fullPath = [DATA_NAMESPACE, ...target[symbolPath], prop];

    const value = this._objectCore.get(fullPath);
    const decoded = this._objectCore.decode(value);

    this._signal.notifyRead();

    return decoded;
  }

  set(target: ProxyTarget, prop: string | symbol, value: any, receiver: any): boolean {
    invariant(Array.isArray(target[symbolPath]));
    invariant(typeof prop === 'string');
    const fullPath = [DATA_NAMESPACE, ...target[symbolPath], prop];

    const encoded = this._objectCore.encode(value);
    this._objectCore.set(fullPath, encoded);

    this._signal.notifyWrite();

    return true;
  }
}

/**
 * Extends the native array to make sure that arrays methods are correctly reactive.
 */
class EchoArrayTwoPointO<T> extends Array<T> {
  static [Symbol.species] = Array;
}

export const createEchoReactiveObject = <T extends {}>(init: T): ReactiveObject<T> => {
  const handler = new EchoReactiveHandler();
  const proxy = createReactiveProxy<ProxyTarget>(
    {
      [symbolPath]: [],
      ...init,
    },
    handler,
  ) as any;

  return proxy;
};
