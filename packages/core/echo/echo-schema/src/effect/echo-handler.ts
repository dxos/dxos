//
// Copyright 2024 DXOS.org
//

import type * as S from '@effect/schema/Schema';
import { inspect, type InspectOptionsStylized } from 'node:util';

import { Reference } from '@dxos/document-model';
import { compositeRuntime } from '@dxos/echo-signals/runtime';
import { invariant } from '@dxos/invariant';
import { assignDeep, ComplexMap, defaultMap, getDeep } from '@dxos/util';

import { createReactiveProxy, symbolIsProxy, type ReactiveHandler } from './proxy';
import { type ReactiveObject } from './reactive';
import { SchemaValidator, symbolSchema } from './schema-validator';
import { AutomergeObjectCore, encodeReference } from '../automerge';

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

  _init(target: any): void {
    invariant(!(target as any)[symbolIsProxy]);
    invariant(Array.isArray(target[symbolPath]));

    if ((target as any)[symbolSchema]) {
      SchemaValidator.initTypedTarget(target);
    } else {
      this.makeUntypedArraysReactive(target);
    }

    if (target[symbolPath].length === 0) {
      this.validateInitialProps(target);
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

    target[symbolHandler] = this;
    target[inspect.custom] = this._inspect.bind(target);
  }

  private validateInitialProps(target: any) {
    for (const key in target) {
      const value = target[key];
      if (value === undefined) {
        delete target[key];
      } else if (typeof target[key] === 'object') {
        throwIfCustomClass(key, value);
        this.validateInitialProps(target[key]);
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

  ownKeys(target: ProxyTarget): ArrayLike<string | symbol> {
    const { value } = this.getDecodedValueAtPath(target);
    return typeof value === 'object' ? Reflect.ownKeys(value) : [];
  }

  getOwnPropertyDescriptor(target: ProxyTarget, p: string | symbol): PropertyDescriptor | undefined {
    const { value } = this.getDecodedValueAtPath(target);
    return typeof value === 'object' ? Reflect.getOwnPropertyDescriptor(value, p) : undefined;
  }

  get(target: ProxyTarget, prop: string | symbol, receiver: any): any {
    invariant(Array.isArray(target[symbolPath]));

    this._signal.notifyRead();

    if (typeof prop === 'symbol') {
      return Reflect.get(target, prop);
    }

    if (target instanceof EchoArrayTwoPointO) {
      return this._arrayGet(target, prop);
    }

    const decodedValueAtPath = this.getDecodedValueAtPath(target, prop);
    return this._wrapInProxyIfRequired(decodedValueAtPath);
  }

  private _wrapInProxyIfRequired(decodedValueAtPath: DecodedValueAtPath) {
    const { value: decoded, dataPath } = decodedValueAtPath;
    if (decoded == null) {
      return decoded;
    }
    if (decoded[symbolIsProxy]) {
      return decoded;
    }
    if (decoded instanceof Reference) {
      return this._objectCore.lookupLink(decoded);
    }
    if (Array.isArray(decoded)) {
      const target = defaultMap(this._targetsMap, dataPath, (): ProxyTarget => {
        const array = new EchoArrayTwoPointO();
        array[symbolPath] = dataPath;
        array[symbolHandler] = this;
        return array;
      });
      return createReactiveProxy(target, this);
    }
    if (typeof decoded === 'object') {
      // TODO(dmaretskyi): Materialize properties for easier debugging.
      const target = defaultMap(this._targetsMap, dataPath, (): ProxyTarget => ({ [symbolPath]: dataPath }));
      return createReactiveProxy(target, this);
    }
    return decoded;
  }

  has(target: ProxyTarget, p: string | symbol): boolean {
    if (target instanceof EchoArrayTwoPointO) {
      return this._arrayHas(target, p);
    }
    const { value } = this.getDecodedValueAtPath(target);
    return typeof value === 'object' ? Reflect.has(value, p) : false;
  }

  defineProperty(target: ProxyTarget, property: string | symbol, attributes: PropertyDescriptor): boolean {
    return this.set(target, property, attributes.value, target);
  }

  private getDecodedValueAtPath(target: ProxyTarget, prop?: string): DecodedValueAtPath {
    const dataPath = [...target[symbolPath]];
    if (prop != null) {
      dataPath.push(prop);
    }
    const fullPath = [DATA_NAMESPACE, ...dataPath];
    const value = this._objectCore.get(fullPath);
    return { value: this._objectCore.decode(value), dataPath };
  }

  private _arrayGet(target: ProxyTarget, prop: string) {
    invariant(target instanceof EchoArrayTwoPointO);
    if (prop === 'constructor') {
      return Array.prototype.constructor;
    }
    if (prop !== 'length' && isNaN(parseInt(prop))) {
      return Reflect.get(target, prop);
    }
    const decodedValueAtPath = this.getDecodedValueAtPath(target, prop);
    return this._wrapInProxyIfRequired(decodedValueAtPath);
  }

  private _arrayHas(target: ProxyTarget, prop: string | symbol) {
    invariant(target instanceof EchoArrayTwoPointO);
    if (typeof prop === 'string') {
      const parsedIndex = parseInt(prop);
      const { value: length } = this.getDecodedValueAtPath(target, 'length');
      invariant(typeof length === 'number');
      if (!isNaN(parsedIndex)) {
        return parsedIndex < length;
      }
    }
    return Reflect.has(target, prop);
  }

  set(target: ProxyTarget, prop: string | symbol, value: any, receiver: any): boolean {
    invariant(Array.isArray(target[symbolPath]));
    invariant(typeof prop === 'string');

    if (target instanceof EchoArrayTwoPointO && prop === 'length') {
      this._arraySetLength(target[symbolPath], value);
      return true;
    }

    const validatedValue = this.validateValue(target, prop, value);
    const fullPath = [DATA_NAMESPACE, ...target[symbolPath], prop];

    if (validatedValue === undefined) {
      this._objectCore.delete(fullPath);
    } else if (value !== null && value[symbolHandler] instanceof EchoReactiveHandler) {
      const link = this._linkReactiveHandler(value, value[symbolHandler]);
      this._objectCore.set(fullPath, encodeReference(link));
    } else {
      const encoded = this._objectCore.encode(validatedValue);
      this._objectCore.set(fullPath, encoded);
    }

    this._signal.notifyWrite();

    return true;
  }

  private _linkReactiveHandler(proxy: any, handler: EchoReactiveHandler): Reference {
    const itemId = handler._objectCore.id;
    if (this._objectCore.database) {
      const anotherDb = handler._objectCore.database;
      if (!anotherDb) {
        this._objectCore.database.add(proxy);
        return new Reference(itemId);
      } else {
        if (anotherDb !== this._objectCore.database) {
          return new Reference(itemId, undefined, anotherDb.spaceKey.toHex());
        } else {
          return new Reference(itemId);
        }
      }
    } else {
      invariant(this._objectCore.linkCache);
      this._objectCore.linkCache.set(itemId, proxy);
      return new Reference(itemId);
    }
  }

  private validateValue(target: ProxyTarget, prop: string | symbol, value: any): any {
    throwIfCustomClass(prop, value);
    return (target as any)[symbolSchema] ? SchemaValidator.validateValue(target, prop, value) : value;
  }

  arrayPush(_: any, path: PropPath, ...items: any[]): number {
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

  arrayPop(_: any, path: PropPath): any {
    const fullPath = [DATA_NAMESPACE, ...path];

    let returnValue: any | undefined;
    this._objectCore.change((doc) => {
      const array = getDeep(doc, fullPath);
      invariant(Array.isArray(array));
      returnValue = array.pop();
    });

    this._signal.notifyWrite();

    return returnValue;
  }

  arrayShift(_: any, path: PropPath): any {
    const fullPath = [DATA_NAMESPACE, ...path];

    let returnValue: any | undefined;
    this._objectCore.change((doc) => {
      const array = getDeep(doc, fullPath);
      invariant(Array.isArray(array));
      returnValue = array.shift();
    });

    this._signal.notifyWrite();

    return returnValue;
  }

  arrayUnshift(_: any, path: PropPath, ...items: any[]): number {
    const fullPath = [DATA_NAMESPACE, ...path];

    const encodedItems = items?.map((value) => this._objectCore.encode(value)) ?? [];

    let newLength: number = -1;
    this._objectCore.change((doc) => {
      const array = getDeep(doc, fullPath);
      invariant(Array.isArray(array));
      newLength = array.unshift(...encodedItems);
    });
    invariant(newLength !== -1);

    this._signal.notifyWrite();

    return newLength;
  }

  arraySplice(_: any, path: PropPath, start: number, deleteCount?: number, ...items: any[]): any[] {
    const fullPath = [DATA_NAMESPACE, ...path];

    const encodedItems = items?.map((value) => this._objectCore.encode(value)) ?? [];

    let deletedElements: any[] | undefined;
    this._objectCore.change((doc) => {
      const array = getDeep(doc, fullPath);
      invariant(Array.isArray(array));
      if (deleteCount != null) {
        deletedElements = array.splice(start, deleteCount, ...encodedItems);
      } else {
        deletedElements = array.splice(start);
      }
    });
    invariant(deletedElements);

    this._signal.notifyWrite();

    return deletedElements;
  }

  arraySort(target: any, path: PropPath, compareFn?: (v1: any, v2: any) => number): any[] {
    const fullPath = [DATA_NAMESPACE, ...path];

    this._objectCore.change((doc) => {
      const array = getDeep(doc, fullPath);
      invariant(Array.isArray(array));
      const sortedArray = [...array].sort(compareFn);
      assignDeep(doc, fullPath, sortedArray);
    });

    this._signal.notifyWrite();

    return target;
  }

  arrayReverse(target: any, path: PropPath): any[] {
    const fullPath = [DATA_NAMESPACE, ...path];

    this._objectCore.change((doc) => {
      const array = getDeep(doc, fullPath);
      invariant(Array.isArray(array));
      const reversedArray = [...array].reverse();
      assignDeep(doc, fullPath, reversedArray);
    });

    this._signal.notifyWrite();

    return target;
  }

  private _arraySetLength(path: PropPath, newLength: number) {
    if (newLength < 0) {
      throw new RangeError('Invalid array length');
    }
    const fullPath = [DATA_NAMESPACE, ...path];

    this._objectCore.change((doc) => {
      const array = getDeep(doc, fullPath);
      invariant(Array.isArray(array));
      const trimmedArray = [...array];
      trimmedArray.length = newLength;
      assignDeep(doc, fullPath, trimmedArray);
    });

    this._signal.notifyWrite();
  }

  private _inspect(
    _: number,
    options: InspectOptionsStylized,
    inspectFn: (value: any, options?: InspectOptionsStylized) => string,
  ) {
    const handler = (this as any)[symbolHandler] as EchoReactiveHandler;
    const isTyped = Boolean((this as any)[symbolSchema]);
    const proxy = handler._proxyMap.get(this);
    return `${isTyped ? 'Typed' : ''}EchoObject ${inspectFn(
      { ...proxy },
      {
        ...options,
        compact: true,
        showHidden: false,
        customInspect: false,
      },
    )}`;
  }
}

/**
 * Extends the native array with methods overrides for automerge.
 */
class EchoArrayTwoPointO<T> extends Array<T> {
  static [Symbol.species] = Array;

  [symbolPath]: PropPath = null as any;
  [symbolHandler]: EchoReactiveHandler = null as any;

  static {
    /**
     * These methods will trigger proxy traps like `set` and `defineProperty` and emit signal notifications.
     * We wrap them in a batch to avoid unnecessary signal notifications.
     */
    const BATCHED_METHODS = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'] as const;

    for (const method of BATCHED_METHODS) {
      Object.defineProperty(this.prototype, method, {
        enumerable: false,
        value: function (this: EchoArrayTwoPointO<any>, ...args: any[]) {
          let result!: any;
          compositeRuntime.batch(() => {
            const handlerMethodName = `array${method.slice(0, 1).toUpperCase()}${method.slice(1)}`;
            const handler = this[symbolHandler] as any;
            result = (handler[handlerMethodName] as any).apply(handler, [this, this[symbolPath], ...args]);
          });
          return result;
        },
      });
    }
  }
}

const throwIfCustomClass = (prop: string | symbol, value: any) => {
  if (value != null) {
    const proto = Object.getPrototypeOf(value);
    if (typeof value === 'object' && !Array.isArray(value) && proto !== Object.prototype) {
      throw new Error(`class instances are not supported: setting ${proto} on ${String(prop)}`);
    }
  }
};

export const createEchoReactiveObject = <T extends {}>(init: T, schema?: S.Schema<T>): ReactiveObject<T> => {
  const target = { [symbolPath]: [], ...init };
  if (schema != null) {
    SchemaValidator.prepareTarget(target, schema);
  }
  const handler = new EchoReactiveHandler();
  const proxy = createReactiveProxy<ProxyTarget>(target, handler) as any;
  return proxy;
};

interface DecodedValueAtPath {
  value: any;
  dataPath: string[];
}
