//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';
import { inspect, type InspectOptionsStylized } from 'node:util';

import { encodeReference, Reference } from '@dxos/echo-protocol';
import { SchemaValidator, DynamicEchoSchema, StoredEchoSchema, defineHiddenProperty } from '@dxos/echo-schema';
import { createReactiveProxy, symbolIsProxy, type ReactiveHandler, type ObjectMeta } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { assignDeep, defaultMap, getDeep, deepMapValues } from '@dxos/util';

import { EchoArray } from './echo-array';
import {
  type ProxyTarget,
  symbolInternals,
  symbolNamespace,
  symbolPath,
  symbolHandler,
  type ObjectInternals,
  TargetKey,
} from './echo-proxy-target';
import { type AutomergeObjectCore, META_NAMESPACE } from '../automerge/automerge-object-core';
import { type KeyPath } from '../automerge/key-path';

export const PROPERTY_ID = 'id';

export const DATA_NAMESPACE = 'data';

/**
 * Shared for all targets within one ECHO object.
 */
export class EchoReactiveHandler implements ReactiveHandler<ProxyTarget> {
  public static instance = new EchoReactiveHandler();

  _proxyMap = new WeakMap<object, any>();

  init(target: ProxyTarget): void {
    invariant(target[symbolInternals]);
    invariant(!(target as any)[symbolIsProxy]);
    invariant(Array.isArray(target[symbolPath]));

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

  ownKeys(target: ProxyTarget): ArrayLike<string | symbol> {
    const { value } = this.getDecodedValueAtPath(target);
    const keys = typeof value === 'object' ? Reflect.ownKeys(value) : [];
    if (isRootDataObject(target)) {
      keys.push(PROPERTY_ID);
    }
    return keys;
  }

  getOwnPropertyDescriptor(target: ProxyTarget, p: string | symbol): PropertyDescriptor | undefined {
    const { value } = this.getDecodedValueAtPath(target);
    if (isRootDataObject(target) && p === PROPERTY_ID) {
      return { enumerable: true, configurable: true, writable: false };
    }
    return typeof value === 'object' ? Reflect.getOwnPropertyDescriptor(value, p) : undefined;
  }

  get(target: ProxyTarget, prop: string | symbol, receiver: any): any {
    invariant(Array.isArray(target[symbolPath]));

    target[symbolInternals].core.signal.notifyRead();

    if (isRootDataObject(target)) {
      const handled = this._handleRootObjectProperty(target, prop);
      if (handled != null) {
        return handled;
      }
    }

    if (typeof prop === 'symbol') {
      return Reflect.get(target, prop);
    }

    if (target instanceof EchoArray) {
      return this._arrayGet(target, prop);
    }

    const decodedValueAtPath = this.getDecodedValueAtPath(target, prop);
    return this._wrapInProxyIfRequired(target, decodedValueAtPath);
  }

  private _handleRootObjectProperty(target: ProxyTarget, prop: string | symbol) {
    if (prop === 'toJSON') {
      return () => this._toJSON(target);
    }
    if (prop === PROPERTY_ID) {
      return target[symbolInternals].core.id;
    }
    return null;
  }

  /**
   * Takes a decoded value from the document, and wraps it in a proxy if required.
   * We use it to wrap records and arrays to provide deep mutability.
   * Wrapped targets are cached in the `targetsMap` to ensure that the same proxy is returned for the same path.
   */
  private _wrapInProxyIfRequired(target: ProxyTarget, decodedValueAtPath: DecodedValueAtPath) {
    const { value: decoded, dataPath, namespace } = decodedValueAtPath;
    if (decoded == null) {
      return decoded;
    }
    if (decoded[symbolIsProxy]) {
      return this._handleStoredSchema(target, decoded);
    }
    if (decoded instanceof Reference) {
      return this._handleStoredSchema(target, target[symbolInternals].core.lookupLink(decoded));
    }
    if (Array.isArray(decoded)) {
      const targetKey = TargetKey.new(dataPath, namespace, 'array');
      const newTarget = defaultMap(target[symbolInternals].targetsMap, targetKey, (): ProxyTarget => {
        const array = new EchoArray();
        array[symbolInternals] = target[symbolInternals];
        array[symbolPath] = dataPath;
        array[symbolNamespace] = namespace;
        array[symbolHandler] = this;
        return array;
      });
      return createReactiveProxy(newTarget, this);
    }
    if (typeof decoded === 'object') {
      const targetKey = TargetKey.new(dataPath, namespace, 'record');
      // TODO(dmaretskyi): Materialize properties for easier debugging.
      const newTarget = defaultMap(
        target[symbolInternals].targetsMap,
        targetKey,
        (): ProxyTarget => ({
          [symbolInternals]: target[symbolInternals],
          [symbolPath]: dataPath,
          [symbolNamespace]: namespace,
        }),
      );
      return createReactiveProxy(newTarget, this);
    }
    return decoded;
  }

  private _handleStoredSchema(target: ProxyTarget, object: any): any {
    // object instanceof StoredEchoSchema requires database to lookup schema
    const database = target[symbolInternals].core.database;
    if (object != null && database && object instanceof StoredEchoSchema) {
      return database._dbApi.schemaRegistry.register(object);
    }
    return object;
  }

  has(target: ProxyTarget, p: string | symbol): boolean {
    if (target instanceof EchoArray) {
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
    const value = target[symbolInternals].core.get(fullPath);
    return { namespace: getNamespace(target), value: target[symbolInternals].core.decode(value), dataPath };
  }

  private _arrayGet(target: ProxyTarget, prop: string) {
    invariant(target instanceof EchoArray);
    if (prop === 'constructor') {
      return Array.prototype.constructor;
    }
    if (prop !== 'length' && isNaN(parseInt(prop))) {
      return Reflect.get(target, prop);
    }
    const decodedValueAtPath = this.getDecodedValueAtPath(target, prop);
    return this._wrapInProxyIfRequired(target, decodedValueAtPath);
  }

  private _arrayHas(target: ProxyTarget, prop: string | symbol) {
    invariant(target instanceof EchoArray);
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

    if (target instanceof EchoArray && prop === 'length') {
      this._arraySetLength(target, target[symbolPath], value);
      return true;
    }

    const validatedValue = this.validateValue(target, [...target[symbolPath], prop], value);
    const fullPath = [getNamespace(target), ...target[symbolPath], prop];

    if (validatedValue === undefined) {
      target[symbolInternals].core.delete(fullPath);
    } else if (validatedValue !== null && validatedValue[symbolHandler] instanceof EchoReactiveHandler) {
      const link = this._linkReactiveHandler(target, validatedValue, validatedValue[symbolInternals]);
      target[symbolInternals].core.set(fullPath, encodeReference(link));
    } else {
      const encoded = target[symbolInternals].core.encode(validatedValue, { removeUndefined: true });
      target[symbolInternals].core.set(fullPath, encoded);
    }

    return true;
  }

  /**
   * Used when `set` and other mutating methods are called with a proxy.
   * @param target - self
   * @param proxy - the proxy that was passed to the method
   * @param internals - internals of the proxy
   */
  private _linkReactiveHandler(target: ProxyTarget, proxy: any, internals: ObjectInternals): Reference {
    const itemId = internals.core.id;
    if (target[symbolInternals].core.database) {
      const anotherDb = internals.core.database;
      if (!anotherDb) {
        target[symbolInternals].core.database.add(proxy);
        return new Reference(itemId);
      } else {
        if (anotherDb !== target[symbolInternals].core.database) {
          return new Reference(itemId, undefined, anotherDb.spaceKey.toHex());
        } else {
          return new Reference(itemId);
        }
      }
    } else {
      invariant(target[symbolInternals].core.linkCache);
      target[symbolInternals].core.linkCache.set(itemId, proxy);
      return new Reference(itemId);
    }
  }

  private validateValue(target: ProxyTarget, path: KeyPath, value: any): any {
    invariant(path.length > 0);
    throwIfCustomClass(path[path.length - 1], value);
    const rootObjectSchema = this.getSchema(target);
    if (rootObjectSchema == null) {
      const typeReference = target[symbolInternals].core.getType();
      if (typeReference) {
        throw new Error(`Schema not found in schema registry: ${typeReference.itemId}`);
      }
      return value;
    }
    // DynamicEchoSchema is a utility-wrapper around the object we actually store in automerge, unwrap it
    const unwrappedValue = value instanceof DynamicEchoSchema ? value.serializedSchema : value;
    const propertySchema = SchemaValidator.getPropertySchema(rootObjectSchema, path, (path) =>
      target[symbolInternals].core.getDecoded([getNamespace(target), ...path]),
    );
    if (propertySchema == null) {
      return unwrappedValue;
    }
    const _ = S.asserts(propertySchema)(unwrappedValue);
    return unwrappedValue;
  }

  getSchema(target: ProxyTarget): S.Schema<any> | undefined {
    // TODO: make reactive
    if (!target[symbolInternals].core.database) {
      return undefined;
    }
    const typeReference = target[symbolInternals].core.getType();
    if (typeReference == null) {
      return undefined;
    }
    const staticSchema = target[symbolInternals].core.database.graph.runtimeSchemaRegistry.getSchema(
      typeReference.itemId,
    );
    if (staticSchema != null) {
      return staticSchema;
    }
    if (typeReference.protocol === 'protobuf') {
      return undefined;
    }
    return target[symbolInternals].core.database._dbApi.schemaRegistry.getById(typeReference.itemId);
  }

  isDeleted(target: any): boolean {
    return target[symbolInternals].core.isDeleted();
  }

  arrayPush(target: ProxyTarget, path: KeyPath, ...items: any[]): number {
    this._validateForArray(target, path, items, target.length);

    const fullPath = this._getPropertyMountPath(target, path);

    const encodedItems = this._encodeForArray(target, items);

    let newLength: number = -1;
    target[symbolInternals].core.change((doc) => {
      const array = getDeep(doc, fullPath);
      invariant(Array.isArray(array));
      newLength = array.push(...encodedItems);
    });
    invariant(newLength !== -1);

    return newLength;
  }

  arrayPop(target: ProxyTarget, path: KeyPath): any {
    const fullPath = this._getPropertyMountPath(target, path);

    let returnValue: any | undefined;
    target[symbolInternals].core.change((doc) => {
      const array = getDeep(doc, fullPath);
      invariant(Array.isArray(array));
      returnValue = array.pop();
    });

    return returnValue;
  }

  arrayShift(target: ProxyTarget, path: KeyPath): any {
    const fullPath = this._getPropertyMountPath(target, path);

    let returnValue: any | undefined;
    target[symbolInternals].core.change((doc) => {
      const array = getDeep(doc, fullPath);
      invariant(Array.isArray(array));
      returnValue = array.shift();
    });

    return returnValue;
  }

  arrayUnshift(target: ProxyTarget, path: KeyPath, ...items: any[]): number {
    this._validateForArray(target, path, items, 0);

    const fullPath = this._getPropertyMountPath(target, path);

    const encodedItems = this._encodeForArray(target, items);

    let newLength: number = -1;
    target[symbolInternals].core.change((doc) => {
      const array = getDeep(doc, fullPath);
      invariant(Array.isArray(array));
      newLength = array.unshift(...encodedItems);
    });
    invariant(newLength !== -1);

    return newLength;
  }

  arraySplice(target: ProxyTarget, path: KeyPath, start: number, deleteCount?: number, ...items: any[]): any[] {
    this._validateForArray(target, path, items, start);

    const fullPath = this._getPropertyMountPath(target, path);

    const encodedItems = this._encodeForArray(target, items);

    let deletedElements: any[] | undefined;
    target[symbolInternals].core.change((doc) => {
      const array = getDeep(doc, fullPath);
      invariant(Array.isArray(array));
      if (deleteCount != null) {
        deletedElements = array.splice(start, deleteCount, ...encodedItems);
      } else {
        deletedElements = array.splice(start);
      }
    });
    invariant(deletedElements);

    return deletedElements;
  }

  arraySort(target: ProxyTarget, path: KeyPath, compareFn?: (v1: any, v2: any) => number): any[] {
    const fullPath = this._getPropertyMountPath(target, path);

    target[symbolInternals].core.change((doc) => {
      const array = getDeep(doc, fullPath);
      invariant(Array.isArray(array));
      const sortedArray = [...array].sort(compareFn);
      assignDeep(doc, fullPath, sortedArray);
    });

    return target as EchoArray<any>;
  }

  arrayReverse(target: ProxyTarget, path: KeyPath): any[] {
    const fullPath = this._getPropertyMountPath(target, path);

    target[symbolInternals].core.change((doc) => {
      const array = getDeep(doc, fullPath);
      invariant(Array.isArray(array));
      const reversedArray = [...array].reverse();
      assignDeep(doc, fullPath, reversedArray);
    });

    return target as EchoArray<any>;
  }

  getMeta(target: ProxyTarget): ObjectMeta {
    const metaTarget: ProxyTarget = {
      [symbolInternals]: target[symbolInternals],
      [symbolPath]: [],
      [symbolNamespace]: META_NAMESPACE,
    };
    return createReactiveProxy(metaTarget, this) as any;
  }

  private _arraySetLength(target: ProxyTarget, path: KeyPath, newLength: number) {
    if (newLength < 0) {
      throw new RangeError('Invalid array length');
    }
    const fullPath = this._getPropertyMountPath(target, path);

    target[symbolInternals].core.change((doc) => {
      const array = getDeep(doc, fullPath);
      invariant(Array.isArray(array));
      const trimmedArray = [...array];
      trimmedArray.length = newLength;
      assignDeep(doc, fullPath, trimmedArray);
    });
  }

  private _validateForArray(target: ProxyTarget, path: KeyPath, items: any[], start: number) {
    let index = start;
    for (const item of items) {
      this.validateValue(target, [...path, String(index++)], item);
    }
  }

  // TODO(dmaretskyi): Change to not rely on object-core doing linking.
  private _encodeForArray(target: ProxyTarget, items: any[] | undefined): any[] {
    return items?.map((value) => target[symbolInternals].core.encode(value, { removeUndefined: true })) ?? [];
  }

  private _getPropertyMountPath(target: ProxyTarget, path: KeyPath): KeyPath {
    return [...target[symbolInternals].core.mountPath, getNamespace(target), ...path];
  }

  // Will be bound to the proxy target.
  _inspect = function (
    this: ProxyTarget,
    _: number,
    options: InspectOptionsStylized,
    inspectFn: (value: any, options?: InspectOptionsStylized) => string,
  ) {
    const handler = this[symbolHandler] as EchoReactiveHandler;
    const isTyped = !!this[symbolInternals].core.getType();
    const reified = handler.getReified(this);
    reified.id = this[symbolInternals].core.id;
    return `${isTyped ? 'Typed' : ''}EchoObject ${inspectFn(reified, {
      ...options,
      compact: true,
      showHidden: false,
      customInspect: false,
    })}`;
  };

  private _toJSON(target: ProxyTarget): any {
    const typeRef = target[symbolInternals].core.getType();
    const reified = this.getReified(target);
    return {
      '@type': typeRef ? encodeReference(typeRef) : undefined,
      ...(target[symbolInternals].core.isDeleted() ? { '@deleted': true } : {}),
      '@meta': { ...this.getMeta(target) },
      '@id': target[symbolInternals].core.id,
      ...deepMapValues(reified, (value, recurse) => {
        if (value instanceof Reference) {
          return encodeReference(value);
        }
        return recurse(value);
      }),
    };
  }

  private getReified(target: ProxyTarget): any {
    const dataPath = [...target[symbolPath]];
    const fullPath = [getNamespace(target), ...dataPath];
    const value = target[symbolInternals].core.getDecoded(fullPath);
    return value;
  }
}

export const throwIfCustomClass = (prop: KeyPath[number], value: any) => {
  if (value == null || Array.isArray(value)) {
    return;
  }
  if (value instanceof DynamicEchoSchema) {
    return;
  }
  const proto = Object.getPrototypeOf(value);
  if (typeof value === 'object' && proto !== Object.prototype) {
    throw new Error(`class instances are not supported: setting ${proto} on ${String(prop)}`);
  }
};

export const getObjectCoreFromEchoTarget = (target: ProxyTarget): AutomergeObjectCore => target[symbolInternals].core;

const getNamespace = (target: ProxyTarget): string => target[symbolNamespace];

const isRootDataObject = (target: ProxyTarget) => {
  const path = target[symbolPath];
  if (!Array.isArray(path) || path.length > 0) {
    return false;
  }
  return getNamespace(target) === DATA_NAMESPACE;
};

interface DecodedValueAtPath {
  value: any;
  namespace: string;
  dataPath: KeyPath;
}
