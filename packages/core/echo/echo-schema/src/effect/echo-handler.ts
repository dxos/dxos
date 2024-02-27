//
// Copyright 2024 DXOS.org
//

import type * as S from '@effect/schema/Schema';

import { compositeRuntime } from '@dxos/echo-signals/runtime';
import { invariant } from '@dxos/invariant';
import { ComplexMap, defaultMap, getDeep } from '@dxos/util';

import { createReactiveProxy, symbolIsProxy, type ReactiveHandler } from './proxy';
import { type ReactiveObject } from './reactive';
import { SchemaValidator, symbolSchema } from './schema-validator';
import { AutomergeObjectCore } from '../automerge';

const symbolPath = Symbol('path');
const symbolHandler = Symbol('handler');

type PropPath = string[];

type ProxyTarget = {
  [symbolPath]: PropPath;
} & ({ [key: keyof any]: any } | any[]);

const DATA_NAMESPACE = 'data';

// TODO(dmaretskyi): Unfinished code.

/**
 * Shared for all targets within one ECHO object.
 */
export class EchoReactiveHandler implements ReactiveHandler<ProxyTarget> {
  _proxyMap = new WeakMap<object, any>();

  _objectCore = new AutomergeObjectCore();

  private _signal = compositeRuntime.createSignal();

  private _targetsMap = new ComplexMap<PropPath, ProxyTarget>((key) => JSON.stringify(key));

  _init(target: ProxyTarget): void {
    invariant(!(target as any)[symbolIsProxy]);
    invariant(Array.isArray(target[symbolPath]));

    if ((target as any)[symbolSchema]) {
      SchemaValidator.initTypedTarget(target);
    } else {
      this.makeUntypedArraysReactive(target);
    }

    if (target[symbolPath].length === 0) {
      this._objectCore.initNewObject(target);
    }

    // Clear extra keys from objects
    if (!Array.isArray(target)) {
      for (const key in target) {
        if (typeof key !== 'symbol') {
          delete (target as any)[key];
        }
      }
    }
  }

  private makeUntypedArraysReactive(target: any) {
    for (const key in target) {
      if (Array.isArray(target[key]) && !(target[key] instanceof EchoArrayTwoPointO)) {
        target[key] = EchoArrayTwoPointO.from(target[key]);
      }
    }
  }

  get(target: ProxyTarget, prop: string | symbol, receiver: any): any {
    invariant(Array.isArray(target[symbolPath]));

    this._signal.notifyRead();

    // Short circuit for array methods and symbol.
    if (
      typeof prop === 'symbol' ||
      (target instanceof EchoArrayTwoPointO && isNaN(parseInt(prop)) && prop !== 'length')
    ) {
      return Reflect.get(target, prop);
    }

    const dataPath = [...target[symbolPath], prop];
    const fullPath = [DATA_NAMESPACE, ...dataPath];
    const value = this._objectCore.get(fullPath);
    const decoded = this._objectCore.decode(value);

    // TODO(dmaretskyi): Handle references.
    if (Array.isArray(decoded)) {
      const target = defaultMap(this._targetsMap, dataPath, (): ProxyTarget => {
        const array = new EchoArrayTwoPointO();
        array[symbolPath] = dataPath;
        array[symbolHandler] = this;
        return array;
      });
      return createReactiveProxy(target, this);
    } else if (typeof decoded === 'object' && decoded !== null) {
      // TODO(dmaretskyi): Materialize properties for easier debugging.
      const target = defaultMap(this._targetsMap, dataPath, (): ProxyTarget => ({ [symbolPath]: dataPath }));
      return createReactiveProxy(target, this);
    } else {
      return decoded;
    }
  }

  set(target: ProxyTarget, prop: string | symbol, value: any, receiver: any): boolean {
    invariant(Array.isArray(target[symbolPath]));
    invariant(typeof prop === 'string');
    const validatedValue = this.validateValue(target, prop, value);
    const fullPath = [DATA_NAMESPACE, ...target[symbolPath], prop];

    const encoded = this._objectCore.encode(validatedValue);
    if (encoded === undefined) {
      this._objectCore.delete(fullPath);
    } else {
      this._objectCore.set(fullPath, encoded);
    }

    this._signal.notifyWrite();

    return true;
  }

  private validateValue(target: ProxyTarget, prop: string | symbol, value: any): any {
    return (target as any)[symbolSchema] ? SchemaValidator.validateValue(target, prop, value) : value;
  }

  arrayPush(path: PropPath, items: any[]): number {
    const fullPath = [DATA_NAMESPACE, ...path];

    const encodedItems = items.map((value) => this._objectCore.encode(value));

    let newLength: number = -1;
    this._objectCore.change((doc) => {
      const array = getDeep(doc, fullPath);
      invariant(Array.isArray(array));
      newLength = array.push(...encodedItems);
    });
    invariant(newLength !== -1);

    this._signal.notifyWrite();

    return newLength;
  }
}

/**
 * Extends the native array with methods overrides for automerge.
 */
class EchoArrayTwoPointO<T> extends Array<T> {
  static [Symbol.species] = Array;

  [symbolPath]: PropPath = null as any;
  [symbolHandler]: EchoReactiveHandler = null as any;

  override push(...items: T[]): number {
    return this[symbolHandler].arrayPush(this[symbolPath], items);
  }
}

export const createEchoReactiveObject = <T extends {}>(init: T, schema?: S.Schema<T>): ReactiveObject<T> => {
  if (schema != null) {
    SchemaValidator.prepareTarget(init, schema);
  }
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
