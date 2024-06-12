//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';
import { inspect, type InspectOptionsStylized } from 'node:util';

import { devtoolsFormatter, type DevtoolsFormatter } from '@dxos/debug';
import { Reference, encodeReference } from '@dxos/echo-protocol';
import {
  createReactiveProxy,
  defineHiddenProperty,
  getProxyHandlerSlot,
  isReactiveObject,
  symbolIsProxy,
  DynamicSchema,
  type EchoReactiveObject,
  ObjectMetaSchema,
  SchemaValidator,
  StoredSchema,
  type ObjectMeta,
  type ReactiveHandler,
  getTypename,
} from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { assignDeep, deepMapValues, defaultMap, getDeep } from '@dxos/util';

import { createEchoObject, isEchoObject } from './create';
import { getBody, getHeader } from './devtools-formatter';
import { EchoArray } from './echo-array';
import {
  TargetKey,
  symbolHandler,
  symbolInternals,
  symbolNamespace,
  symbolPath,
  type ObjectInternals,
  type ProxyTarget,
} from './echo-proxy-target';
import { META_NAMESPACE, type ObjectCore, type KeyPath } from '../core-db';
import { type EchoDatabase } from '../proxy-db';

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

    target[symbolInternals].signal.notifyRead();

    if (prop === devtoolsFormatter) {
      return this._getDevtoolsFormatter(target);
    }

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
    // TODO(dmaretskyi): toJSON should be available for nested objects too.
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
      return this._handleStoredSchema(target, this.lookupLink(target, decoded));
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
    // Object instanceof StoredEchoSchema requires database to lookup schema.
    const database = target[symbolInternals].database;
    if (object != null && database && object instanceof StoredSchema) {
      return database.schema.registerSchema(object);
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
    let value = target[symbolInternals].core.getDecoded(fullPath);

    if (value instanceof Reference) {
      value = this.lookupLink(target, value);
    }

    return { namespace: getNamespace(target), value, dataPath };
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
    } else {
      const withLinks = deepMapValues(validatedValue, (value, recurse) => {
        if (isReactiveObject(value) as boolean) {
          return this._linkReactiveHandler(target, value);
        } else {
          return recurse(value);
        }
      });
      target[symbolInternals].core.setDecoded(fullPath, withLinks);
    }

    return true;
  }

  /**
   * Used when `set` and other mutating methods are called with a proxy.
   * @param target - self
   * @param proxy - the proxy that was passed to the method
   * @param internals - internals of the proxy
   */
  private _linkReactiveHandler(target: ProxyTarget, proxy: any): Reference {
    const echoObject = !isEchoObject(proxy) ? createEchoObject(proxy) : proxy;
    const otherInternals = (echoObject as any)[symbolInternals] as ObjectInternals;

    const objectId = echoObject.id;
    invariant(typeof objectId === 'string' && objectId.length > 0);

    if (target[symbolInternals].core.database) {
      const anotherDb = otherInternals?.core.database;
      if (!anotherDb) {
        target[symbolInternals].core.database.add(echoObject);
        return new Reference(objectId);
      } else {
        if (anotherDb !== target[symbolInternals].core.database) {
          return new Reference(objectId, undefined, anotherDb.spaceKey.toHex());
        } else {
          return new Reference(objectId);
        }
      }
    } else {
      invariant(target[symbolInternals].linkCache);
      target[symbolInternals].linkCache.set(objectId, echoObject);
      return new Reference(objectId);
    }
  }

  private validateValue(target: ProxyTarget, path: KeyPath, value: any): any {
    // TODO(burdon): Remove.
    try {
      console.log(getTypename(target));
      if (getTypename(target) === 'braneframe.Folder') {
        debugger;
      }

      throw new Error();
    } catch (err) {
      log.catch(err);
    }

    invariant(path.length > 0);
    throwIfCustomClass(path[path.length - 1], value);
    const rootObjectSchema = this.getSchema(target);
    if (rootObjectSchema == null) {
      const typeReference = target[symbolInternals].core.getType();
      if (typeReference) {
        // TODO(burdon): Why throw if exists?
        throw new Error(`Schema not found in schema registry: ${typeReference.itemId}`);
      }

      return value;
    }

    // DynamicEchoSchema is a utility-wrapper around the object we actually store in automerge, unwrap it
    const unwrappedValue = value instanceof DynamicSchema ? value.serializedSchema : value;
    const propertySchema = SchemaValidator.getPropertySchema(rootObjectSchema, path, (path) => {
      target[symbolInternals].core.getDecoded([getNamespace(target), ...path]);
    });
    if (propertySchema == null) {
      return unwrappedValue;
    }

    const _ = S.asserts(propertySchema)(unwrappedValue);
    return unwrappedValue;
  }

  getSchema(target: ProxyTarget): S.Schema<any> | undefined {
    if (target[symbolNamespace] === META_NAMESPACE) {
      return ObjectMetaSchema;
    }

    // TODO(y): Make reactive.
    // TODO(burdon): May not be attached to database yet.
    if (!target[symbolInternals].database) {
      return undefined;
    }

    const typeReference = target[symbolInternals].core.getType();
    if (typeReference == null) {
      return undefined;
    }

    const staticSchema = target[symbolInternals].database.graph.schemaRegistry.getSchema(typeReference.itemId);
    if (staticSchema != null) {
      return staticSchema;
    }

    if (typeReference.protocol === 'protobuf') {
      return undefined;
    }

    return target[symbolInternals].database.schema.getSchemaById(typeReference.itemId);
  }

  getTypeReference(target: ProxyTarget): Reference | undefined {
    return target[symbolNamespace] === DATA_NAMESPACE ? target[symbolInternals].core.getType() : undefined;
  }

  isDeleted(target: any): boolean {
    return target[symbolInternals].core.isDeleted();
  }

  arrayPush(target: ProxyTarget, path: KeyPath, ...items: any[]): number {
    this._validateForArray(target, path, items, target.length);

    const encodedItems = this._encodeForArray(target, items);
    return target[symbolInternals].core.arrayPush([getNamespace(target), ...path], encodedItems);
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
    // TODO(dmaretskyi): Reuse meta target.
    const metaTarget: ProxyTarget = {
      [symbolInternals]: target[symbolInternals],
      [symbolPath]: [],
      [symbolNamespace]: META_NAMESPACE,
    };

    return createReactiveProxy(metaTarget, this) as any;
  }

  setDatabase(target: ProxyTarget, database: EchoDatabase): void {
    target[symbolInternals].database = database;
  }

  /**
   * Store referenced object.
   */
  linkObject(target: ProxyTarget, obj: EchoReactiveObject<any>): Reference {
    const database = target[symbolInternals].database;
    if (database) {
      // TODO(dmaretskyi): Fix this.
      if (isReactiveObject(obj) && !isEchoObject(obj)) {
        database.add(obj);
      }

      const foreignDatabase = (getProxyHandlerSlot(obj).target as ProxyTarget)[symbolInternals].database;
      if (!foreignDatabase) {
        database.add(obj);
        return new Reference(obj.id);
      } else {
        if (foreignDatabase !== database) {
          return new Reference(obj.id, undefined, foreignDatabase.spaceKey.toHex());
        } else {
          return new Reference(obj.id);
        }
      }
    } else {
      invariant(target[symbolInternals].linkCache);

      // Can be caused not using `object(Expando, { ... })` constructor.
      // TODO(dmaretskyi): Add better validation.
      invariant(obj.id != null);

      target[symbolInternals].linkCache.set(obj.id, obj as EchoReactiveObject<any>);
      return new Reference(obj.id);
    }
  }

  /**
   * Lookup referenced object.
   */
  lookupLink(target: ProxyTarget, ref: Reference): EchoReactiveObject<any> | undefined {
    const database = target[symbolInternals].database;
    if (database) {
      // This doesn't clean-up properly if the ref at key gets changed, but it doesn't matter since `_onLinkResolved` is idempotent.
      return database.graph._lookupLink(ref, database, () => target[symbolInternals].core.notifyUpdate());
    } else {
      invariant(target[symbolInternals].linkCache);
      return target[symbolInternals].linkCache.get(ref.itemId);
    }
  }

  saveLinkedObjects(target: ProxyTarget): void {
    if (!target[symbolInternals].linkCache) {
      return;
    }
    if (target[symbolInternals].linkCache) {
      for (const obj of target[symbolInternals].linkCache.values()) {
        this.linkObject(target, obj);
      }

      target[symbolInternals].linkCache = undefined;
    }
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
    const linksEncoded = deepMapValues(items, (value, recurse) => {
      if (isReactiveObject(value) as boolean) {
        return this.linkObject(target, value);
      } else {
        return recurse(value);
      }
    });

    return target[symbolInternals].core.encode(linksEncoded);
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
    const reified = handler._getReified(this);
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
    const reified = this._getReified(target);
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

  private _getReified(target: ProxyTarget): any {
    const dataPath = [...target[symbolPath]];
    const fullPath = [getNamespace(target), ...dataPath];
    return target[symbolInternals].core.getDecoded(fullPath);
  }

  private _getDevtoolsFormatter(target: ProxyTarget): DevtoolsFormatter {
    return {
      header: (config?: any) =>
        getHeader(this.getTypeReference(target)?.itemId ?? 'EchoObject', target[symbolInternals].core.id, config),
      hasBody: () => true,
      body: () => {
        let data = deepMapValues(this._getReified(target), (value, recurse) => {
          if (value instanceof Reference) {
            return this.lookupLink(target, value);
          }
          return recurse(value);
        });
        if (isRootDataObject(target)) {
          // TODO(dmaretskyi): Extract & reuse.
          const metaTarget: ProxyTarget = {
            [symbolInternals]: target[symbolInternals],
            [symbolPath]: [],
            [symbolNamespace]: META_NAMESPACE,
          };
          const metaReified = this._getReified(metaTarget);

          data = {
            id: target[symbolInternals].core.id,
            '@type': this.getTypeReference(target)?.itemId,
            '@meta': metaReified,
            ...data,
            '[[Schema]]': this.getSchema(target),
            '[[Core]]': target[symbolInternals].core,
          };
        }

        return getBody(data);
      },
    };
  }
}

export const throwIfCustomClass = (prop: KeyPath[number], value: any) => {
  if (value == null || Array.isArray(value)) {
    return;
  }
  if (value instanceof DynamicSchema) {
    return;
  }
  const proto = Object.getPrototypeOf(value);
  if (typeof value === 'object' && proto !== Object.prototype) {
    throw new Error(`class instances are not supported: setting ${proto} on ${String(prop)}`);
  }
};

export const getObjectCoreFromEchoTarget = (target: ProxyTarget): ObjectCore => target[symbolInternals].core;

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
