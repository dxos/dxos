//
// Copyright 2024 DXOS.org
//

import * as AST from '@effect/schema/AST';
import { isTypeLiteral } from '@effect/schema/AST';
import * as S from '@effect/schema/Schema';
import { inspect, type InspectOptionsStylized } from 'node:util';

import { Reference } from '@dxos/document-model';
import { compositeRuntime } from '@dxos/echo-signals/runtime';
import { invariant } from '@dxos/invariant';
import { assignDeep, ComplexMap, defaultMap, getDeep } from '@dxos/util';

import {
  createReactiveProxy,
  getProxyHandlerSlot,
  isReactiveProxy,
  symbolIsProxy,
  type ReactiveHandler,
} from './proxy';
import { type EchoReactiveObject, getSchema, getTypeReference } from './reactive';
import { SchemaValidator } from './schema-validator';
import { AutomergeObjectCore, encodeReference } from '../automerge';
import { type ObjectMeta } from '../object';
import { defineHiddenProperty } from '../util/property';

const symbolPath = Symbol('path');
const symbolNamespace = Symbol('namespace');
const symbolHandler = Symbol('handler');

type PropPath = string[];

type ProxyTarget = {
  [symbolPath]: PropPath;
  [symbolNamespace]: string;
  [symbolHandler]?: EchoReactiveHandler;
} & ({ [key: keyof any]: any } | any[]);

const DATA_NAMESPACE = 'data';
const META_NAMESPACE = 'meta';

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

    if (target[symbolPath].length === 0) {
      this.validateInitialProps(target);
      if (this._objectCore.database == null) {
        this._objectCore.initNewObject(target);
      }
    }

    // Clear extra keys from objects
    if (!Array.isArray(target)) {
      for (const key in target) {
        if (typeof key !== 'symbol') {
          delete (target as any)[key];
        }
      }
    }

    defineHiddenProperty(target, symbolHandler, this);
    if (inspect.custom) {
      defineHiddenProperty(target, inspect.custom, this._inspect.bind(target));
    }
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

    if (prop === 'id' && target[symbolPath].length === 0) {
      return this._objectCore.id;
    }

    const decodedValueAtPath = this.getDecodedValueAtPath(target, prop);
    return this._wrapInProxyIfRequired(decodedValueAtPath);
  }

  private _wrapInProxyIfRequired(decodedValueAtPath: DecodedValueAtPath) {
    const { value: decoded, dataPath, namespace } = decodedValueAtPath;
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
        array[symbolNamespace] = namespace;
        array[symbolHandler] = this;
        return array;
      });
      return createReactiveProxy(target, this);
    }
    if (typeof decoded === 'object') {
      // TODO(dmaretskyi): Materialize properties for easier debugging.
      const target = defaultMap(
        this._targetsMap,
        dataPath,
        (): ProxyTarget => ({ [symbolPath]: dataPath, [symbolNamespace]: namespace }),
      );
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
    const fullPath = [getNamespace(target), ...dataPath];
    const value = this._objectCore.get(fullPath);
    return { namespace: getNamespace(target), value: this._objectCore.decode(value), dataPath };
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
      this._arraySetLength(target, target[symbolPath], value);
      return true;
    }

    this.validateValue(target, [...target[symbolPath], prop], value);
    const fullPath = [getNamespace(target), ...target[symbolPath], prop];

    if (value === undefined) {
      this._objectCore.delete(fullPath);
    } else if (value !== null && value[symbolHandler] instanceof EchoReactiveHandler) {
      const link = this._linkReactiveHandler(value, value[symbolHandler]);
      this._objectCore.set(fullPath, encodeReference(link));
    } else {
      const encoded = this._objectCore.encode(value);
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

  private validateValue(target: any, path: string[], value: any) {
    invariant(path.length > 0);
    throwIfCustomClass(path[path.length - 1], value);
    const rootObjectSchema = this.getSchema();
    if (rootObjectSchema == null) {
      const typeReference = this._objectCore.getType();
      if (typeReference) {
        throw new Error(`Schema not found in schema registry: ${typeReference.itemId}`);
      }
      return;
    }
    const propertySchema: S.Schema<any> = SchemaValidator.getPropertySchema(rootObjectSchema, path, (path) =>
      this._objectCore.getDecoded([getNamespace(target), ...path]),
    );
    const _ = S.asserts(propertySchema)(value);
  }

  getSchema(): S.Schema<any> | undefined {
    // TODO: make reactive
    invariant(this._objectCore.database, 'EchoHandler used without database');
    const typeReference = this._objectCore.getType();
    if (typeReference == null) {
      return undefined;
    }
    const effectSchema = this._objectCore.database.graph.types.getEffectSchema(typeReference.itemId);
    if (effectSchema == null) {
      return undefined;
    }
    return effectSchema;
  }

  arrayPush(target: any, path: PropPath, ...items: any[]): number {
    this._validateForArray(target, path, items, target.length);

    const fullPath = this._getPropertyMountPath(target, path);

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

  arrayPop(target: any, path: PropPath): any {
    const fullPath = this._getPropertyMountPath(target, path);

    let returnValue: any | undefined;
    this._objectCore.change((doc) => {
      const array = getDeep(doc, fullPath);
      invariant(Array.isArray(array));
      returnValue = array.pop();
    });

    this._signal.notifyWrite();

    return returnValue;
  }

  arrayShift(target: any, path: PropPath): any {
    const fullPath = this._getPropertyMountPath(target, path);

    let returnValue: any | undefined;
    this._objectCore.change((doc) => {
      const array = getDeep(doc, fullPath);
      invariant(Array.isArray(array));
      returnValue = array.shift();
    });

    this._signal.notifyWrite();

    return returnValue;
  }

  arrayUnshift(target: any, path: PropPath, ...items: any[]): number {
    this._validateForArray(target, path, items, 0);

    const fullPath = this._getPropertyMountPath(target, path);

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

  arraySplice(target: any, path: PropPath, start: number, deleteCount?: number, ...items: any[]): any[] {
    this._validateForArray(target, path, items, start);

    const fullPath = this._getPropertyMountPath(target, path);

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
    const fullPath = this._getPropertyMountPath(target, path);

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
    const fullPath = this._getPropertyMountPath(target, path);

    this._objectCore.change((doc) => {
      const array = getDeep(doc, fullPath);
      invariant(Array.isArray(array));
      const reversedArray = [...array].reverse();
      assignDeep(doc, fullPath, reversedArray);
    });

    this._signal.notifyWrite();

    return target;
  }

  getMeta(): ObjectMeta {
    const target: any = { [symbolPath]: [], [symbolNamespace]: META_NAMESPACE };
    return createReactiveProxy(target, this) as ObjectMeta;
  }

  private _arraySetLength(target: any, path: PropPath, newLength: number) {
    if (newLength < 0) {
      throw new RangeError('Invalid array length');
    }
    const fullPath = this._getPropertyMountPath(target, path);

    this._objectCore.change((doc) => {
      const array = getDeep(doc, fullPath);
      invariant(Array.isArray(array));
      const trimmedArray = [...array];
      trimmedArray.length = newLength;
      assignDeep(doc, fullPath, trimmedArray);
    });

    this._signal.notifyWrite();
  }

  private _validateForArray(target: any, path: PropPath, items: any[], start: number) {
    let index = start;
    for (const item of items) {
      this.validateValue(target, [...path, String(index++)], item);
    }
  }

  private _getPropertyMountPath(target: any, path: PropPath): string[] {
    return [...this._objectCore.mountPath, getNamespace(target), ...path];
  }

  // Will be bound to the proxy target.
  _inspect = function (
    this: ProxyTarget,
    _: number,
    options: InspectOptionsStylized,
    inspectFn: (value: any, options?: InspectOptionsStylized) => string,
  ) {
    const handler = this[symbolHandler] as EchoReactiveHandler;
    const isTyped = !!handler._objectCore.getType();
    const proxy = handler._proxyMap.get(this);
    invariant(proxy, '_proxyMap corrupted');
    const reified = { ...proxy }; // Will call proxy methods and construct a plain JS object.
    return `${isTyped ? 'Typed' : ''}EchoObject ${inspectFn(reified, {
      ...options,
      compact: true,
      showHidden: false,
      customInspect: false,
    })}`;
  };
}

/**
 * Extends the native array with methods overrides for automerge.
 */
// TODO(dmaretskyi): Rename once the original AutomergeArray gets deleted.
class EchoArrayTwoPointO<T> extends Array<T> {
  static get [Symbol.species]() {
    return Array;
  }

  [symbolPath]: PropPath = null as any;
  [symbolNamespace]: string = null as any;
  [symbolHandler]: EchoReactiveHandler = null as any;

  static {
    /**
     * These methods will trigger proxy traps like `set` and `defineProperty` and emit signal notifications.
     * We wrap them in a batch to avoid unnecessary signal notifications.
     */
    const BATCHED_METHODS = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'] as const;

    for (const method of BATCHED_METHODS) {
      const handlerMethodName = `array${method.slice(0, 1).toUpperCase()}${method.slice(1)}`;

      Object.defineProperty(this.prototype, method, {
        enumerable: false,
        value: function (this: EchoArrayTwoPointO<any>, ...args: any[]) {
          let result!: any;
          compositeRuntime.batch(() => {
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

// TODO(dmaretskyi): Read schema from typed in-memory objects.
export const createEchoReactiveObject = <T extends {}>(init: T): EchoReactiveObject<T> => {
  const schema = getSchema(init);
  if (schema != null) {
    validateSchema(schema);
  }

  if (isReactiveProxy(init)) {
    const proxy = init as any;

    const slot = getProxyHandlerSlot(proxy);

    const echoHandler = new EchoReactiveHandler();
    echoHandler._objectCore.rootProxy = proxy;

    slot.handler = echoHandler;
    const target = slot.target as ProxyTarget;
    target[symbolPath] = [];
    target[symbolNamespace] = DATA_NAMESPACE;
    slot.handler._proxyMap.set(target, proxy);
    slot.handler._init(target);
    saveTypeInAutomerge(echoHandler, schema);
    return proxy;
  } else {
    const target = { [symbolPath]: [], [symbolNamespace]: DATA_NAMESPACE, ...(init as any) };
    const handler = new EchoReactiveHandler();
    const proxy = createReactiveProxy<ProxyTarget>(target, handler) as any;
    handler._objectCore.rootProxy = proxy;
    saveTypeInAutomerge(handler, schema);
    return proxy;
  }
};

export const initEchoReactiveObjectRootProxy = (core: AutomergeObjectCore) => {
  const target = { [symbolPath]: [], [symbolNamespace]: DATA_NAMESPACE };
  const handler = new EchoReactiveHandler();
  handler._objectCore = core;
  handler._objectCore.rootProxy = createReactiveProxy<ProxyTarget>(target, handler) as any;
};

const validateSchema = (schema: S.Schema<any>) => {
  invariant(isTypeLiteral(schema.ast));
  const idProperty = AST.getPropertySignatures(schema.ast).find((prop) => prop.name === 'id');
  if (idProperty != null) {
    throw new Error('"id" property name is reserved');
  }
  getSchemaTypeRefOrThrow(schema);
  SchemaValidator.validateSchema(schema);
};

const saveTypeInAutomerge = (handler: EchoReactiveHandler, schema: S.Schema<any> | undefined) => {
  if (schema != null) {
    handler._objectCore.setType(getSchemaTypeRefOrThrow(schema));
  }
};

export const getSchemaTypeRefOrThrow = (schema: S.Schema<any>): Reference => {
  const typeReference = getTypeReference(schema);
  if (typeReference == null) {
    throw new Error(
      'EchoObject schema must have a valid annotation: MyTypeSchema.pipe(R.echoObject("MyType", "1.0.0"))',
    );
  }
  return typeReference;
};

const getNamespace = (target: any): string => target[symbolNamespace];

interface DecodedValueAtPath {
  value: any;
  namespace: string;
  dataPath: string[];
}
