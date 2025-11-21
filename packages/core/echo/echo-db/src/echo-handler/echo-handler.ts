//
// Copyright 2024 DXOS.org
//

import { type InspectOptionsStylized } from 'node:util';

import * as A from '@automerge/automerge';
import * as Schema from 'effect/Schema';

import { type DevtoolsFormatter, devtoolsFormatter, inspectCustom } from '@dxos/debug';
import { Obj } from '@dxos/echo';
import {
  ATTR_DELETED,
  ATTR_META,
  ATTR_RELATION_SOURCE,
  ATTR_RELATION_TARGET,
  ATTR_TYPE,
  type BaseObject,
  DeletedId,
  EchoSchema,
  EntityKind,
  EntityKindId,
  type HasId,
  MetaId,
  type ObjectJSON,
  type ObjectMeta,
  ObjectMetaSchema,
  ObjectVersionId,
  Ref,
  RefImpl,
  RelationSourceDXNId,
  RelationSourceId,
  RelationTargetDXNId,
  RelationTargetId,
  SchemaId,
  SchemaMetaSymbol,
  SchemaValidator,
  SelfDXNId,
  StoredSchema,
  TypeId,
  assertObjectModelShape,
  defineHiddenProperty,
  getEntityKind,
  getMeta,
  getRefSavedTarget,
  getSchema,
  getTypeAnnotation,
  isInstanceOf,
  requireTypeReference,
  setRefResolver,
} from '@dxos/echo/internal';
import { DATA_NAMESPACE, type ObjectStructure, PROPERTY_ID, Reference, encodeReference } from '@dxos/echo-protocol';
import { assertArgument, invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';
import {
  type Live,
  type ReactiveHandler,
  createProxy,
  getProxyHandler,
  getProxyTarget,
  isLiveObject,
  symbolIsProxy,
} from '@dxos/live-object';
import { getProxySlot } from '@dxos/live-object';
import { log } from '@dxos/log';
import { deepMapValues, defaultMap, getDeep, setDeep } from '@dxos/util';

import { type DecodedAutomergePrimaryValue, type KeyPath, META_NAMESPACE, ObjectCore } from '../core-db';
import { type EchoDatabase } from '../proxy-db';

import { getBody, getHeader } from './devtools-formatter';
import { EchoArray } from './echo-array';
import { ObjectInternals } from './echo-proxy-target';
import {
  type ProxyTarget,
  TargetKey,
  symbolHandler,
  symbolInternals,
  symbolNamespace,
  symbolPath,
} from './echo-proxy-target';

/**
 * Shared for all targets within one ECHO object.
 * @internal
 */
export class EchoReactiveHandler implements ReactiveHandler<ProxyTarget> {
  public static readonly instance = new EchoReactiveHandler();

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

    // Maybe have been set by `create`.
    Object.defineProperty(target, inspectCustom, {
      enumerable: false,
      configurable: true,
      value: this._inspect.bind(target),
    });
  }

  ownKeys(target: ProxyTarget): ArrayLike<string | symbol> {
    target[symbolInternals].signal.notifyRead();

    const { value } = this._getDecodedValueAtPath(target);
    const keys = typeof value === 'object' ? Reflect.ownKeys(value) : [];
    if (isRootDataObject(target)) {
      keys.push(PROPERTY_ID);
    }
    return keys;
  }

  getOwnPropertyDescriptor(target: ProxyTarget, p: string | symbol): PropertyDescriptor | undefined {
    const { value } = this._getDecodedValueAtPath(target);
    if (isRootDataObject(target) && p === PROPERTY_ID) {
      return { enumerable: true, configurable: true, writable: false };
    }
    return typeof value === 'object' ? Reflect.getOwnPropertyDescriptor(value, p) : undefined;
  }

  defineProperty(target: ProxyTarget, property: string | symbol, attributes: PropertyDescriptor): boolean {
    return this.set(target, property, attributes.value, target);
  }

  has(target: ProxyTarget, p: string | symbol): boolean {
    if (target instanceof EchoArray) {
      return this._arrayHas(target, p);
    }

    const { value } = this._getDecodedValueAtPath(target);
    return typeof value === 'object' ? Reflect.has(value, p) : false;
  }

  get(target: ProxyTarget, prop: string | symbol, receiver: any): any {
    invariant(Array.isArray(target[symbolPath]));

    // Non reactive properties on root and nested records.
    switch (prop) {
      case symbolInternals:
        return target[symbolInternals];
      case SchemaId:
        return this.getSchema(target);
    }

    // Non-reactive root properties.
    if (isRootDataObject(target)) {
      switch (prop) {
        case 'id': {
          return target[symbolInternals].core.id;
        }
        case SelfDXNId: {
          if (target[symbolInternals].database) {
            return new DXN(DXN.kind.ECHO, [target[symbolInternals].database.spaceId, target[symbolInternals].core.id]);
          } else {
            return DXN.fromLocalObjectId(target[symbolInternals].core.id);
          }
        }
        case EntityKindId: {
          return target[symbolInternals].core.getKind();
        }
        case RelationSourceDXNId: {
          return target[symbolInternals].core.getSource()?.toDXN();
        }
        case RelationTargetDXNId: {
          return target[symbolInternals].core.getTarget()?.toDXN();
        }
        case RelationSourceId: {
          return this._getRelationSource(target);
        }
        case RelationTargetId: {
          return this._getRelationTarget(target);
        }
        case TypeId:
          return this.getTypeReference(target)?.toDXN();
        case MetaId:
          return this.getMeta(target);
        case DeletedId:
          return this.isDeleted(target);
        case ObjectVersionId:
          return this._getVersion(target);
      }
    } else {
      switch (prop) {
        case EntityKindId:
        case RelationSourceDXNId:
        case RelationTargetDXNId:
        case RelationSourceId:
        case RelationTargetId:
        case TypeId:
        case MetaId:
        case DeletedId:
          return undefined;
      }
    }

    target[symbolInternals].signal.notifyRead();

    // Reactive properties on root and nested records.
    switch (prop) {
      case devtoolsFormatter:
        return this._getDevtoolsFormatter(target);
    }

    // Reactive root properties.
    if (isRootDataObject(target)) {
      switch (prop) {
        case 'toJSON':
          return () => this._toJSON(target);
        case PROPERTY_ID:
          return target[symbolInternals].core.id;
      }
    }

    if (typeof prop === 'symbol') {
      return Reflect.get(target, prop);
    }

    if (target instanceof EchoArray) {
      return this._arrayGet(target, prop);
    }

    const decodedValueAtPath = this._getDecodedValueAtPath(target, prop);
    return this._wrapInProxyIfRequired(target, decodedValueAtPath);
  }

  // TODO(burdon): arg `receiver` not used.
  set(target: ProxyTarget, prop: string | symbol, value: any, receiver: any): boolean {
    invariant(Array.isArray(target[symbolPath]));
    invariant(typeof prop === 'string');
    if (target instanceof EchoArray && prop === 'length') {
      this._arraySetLength(target, target[symbolPath], value);
      return true;
    }

    const fullPath = [getNamespace(target), ...target[symbolPath], prop];
    const validatedValue = this._validateValue(target, [...target[symbolPath], prop], value);
    if (validatedValue === undefined) {
      target[symbolInternals].core.delete(fullPath);
    } else {
      const withLinks = this._handleLinksAssignment(target, validatedValue);
      target[symbolInternals].core.setDecoded(fullPath, withLinks);
    }

    return true;
  }

  /**
   * @returns The typename without version for static schema or object id for dynamic schema.
   */
  private _getTypename(target: ProxyTarget): string | undefined {
    const schema = this.getSchema(target);
    // Special handling for EchoSchema. objectId is StoredSchema objectId, not a typename.
    if (schema && typeof schema === 'object' && SchemaMetaSymbol in schema) {
      return (schema as any)[SchemaMetaSymbol].typename;
    }
    return this.getTypeReference(target)?.objectId;
  }

  private _getRelationSource(target: ProxyTarget): any {
    const sourceRef = target[symbolInternals].core.getSource();
    invariant(sourceRef);
    const database = target[symbolInternals].database;
    if (database) {
      // TODO(dmaretskyi): Put refs into proxy cache.
      return database.graph
        .createRefResolver({
          context: {
            space: database.spaceId,
          },
        })
        .resolveSync(sourceRef.toDXN(), false);
    } else {
      invariant(target[symbolInternals].linkCache);
      return target[symbolInternals].linkCache.get(sourceRef.objectId);
    }
  }

  private _getRelationTarget(target: ProxyTarget): any {
    const targetRef = target[symbolInternals].core.getTarget();
    invariant(targetRef);
    const database = target[symbolInternals].database;
    if (database) {
      return database.graph
        .createRefResolver({
          context: {
            space: database.spaceId,
          },
        })
        .resolveSync(targetRef.toDXN(), false);
    } else {
      invariant(target[symbolInternals].linkCache);
      return target[symbolInternals].linkCache.get(targetRef.objectId);
    }
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
      return this.lookupRef(target, decoded);
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

      return createProxy(newTarget, this);
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

      return createProxy(newTarget, this);
    }

    return decoded;
  }

  private _handleStoredSchema(target: ProxyTarget, object: any): any {
    // Object instanceof StoredEchoSchema requires database to lookup schema.
    const database = target[symbolInternals].database;
    // TODO(dmaretskyi): isInstanceOf(StoredSchema, object)
    if (database && isInstanceOf(StoredSchema, object)) {
      return database.schemaRegistry._registerSchema(object);
    }

    return object;
  }

  private _getDecodedValueAtPath(target: ProxyTarget, prop?: string): DecodedValueAtPath {
    const dataPath = [...target[symbolPath]];
    if (prop != null) {
      dataPath.push(prop);
    }
    const fullPath = [getNamespace(target), ...dataPath];
    const value: any = target[symbolInternals].core.getDecoded(fullPath);
    // if (value instanceof Reference) {
    //   value = this.lookupRef(target, value);
    // }

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

    const decodedValueAtPath = this._getDecodedValueAtPath(target, prop);
    return this._wrapInProxyIfRequired(target, decodedValueAtPath);
  }

  private _arrayHas(target: ProxyTarget, prop: string | symbol): boolean {
    invariant(target instanceof EchoArray);
    if (typeof prop === 'string') {
      const parsedIndex = parseInt(prop);
      const { value: length } = this._getDecodedValueAtPath(target, 'length');
      invariant(typeof length === 'number');
      if (!isNaN(parsedIndex)) {
        return parsedIndex < length;
      }
    }

    return Reflect.has(target, prop);
  }

  private _validateValue(target: ProxyTarget, path: KeyPath, value: any): any {
    invariant(path.length > 0);
    if (typeof path.at(-1) === 'symbol') {
      throw new Error('Invalid path');
    }
    if (path.length === 1 && path[0] === 'id') {
      throw new Error('Object Id is readonly');
    }
    throwIfCustomClass(path[path.length - 1], value);
    const rootObjectSchema = this.getSchema(target);
    if (rootObjectSchema == null) {
      const typeReference = target[symbolInternals].core.getType();
      if (typeReference) {
        // The object has schema, but we can't access it to validate the value being set.
        throw new Error(`Schema not found in schema registry: ${typeReference.toDXN().toString()}`);
      }

      return value;
    }

    // DynamicEchoSchema is a utility-wrapper around the object we actually store in automerge, unwrap it
    const unwrappedValue = value instanceof EchoSchema ? value.storedSchema : value;
    const propertySchema = SchemaValidator.getPropertySchema(rootObjectSchema, path, (path) => {
      return target[symbolInternals].core.getDecoded([getNamespace(target), ...path]);
    });
    if (propertySchema == null) {
      return unwrappedValue;
    }

    const _ = Schema.asserts(propertySchema)(unwrappedValue);
    return unwrappedValue;
  }

  private _handleLinksAssignment(target: ProxyTarget, value: any): any {
    return deepMapValues(value, (value, recurse) => {
      if (isEchoObjectField(value)) {
        // The value is a value-object field of another echo-object. We don't want to create a reference
        // to it or have shared mutability, we need to copy by value.
        return recurse({ ...value });
      } else if (isLiveObject(value)) {
        throw new Error('Object references must be wrapped with `Ref.make`');
      } else if (Ref.isRef(value)) {
        const savedTarget = getRefSavedTarget(value);
        if (savedTarget) {
          return this.createRef(target, savedTarget);
        } else {
          return Reference.fromDXN(value.dxn);
        }
      } else {
        return recurse(value);
      }
    });
  }

  getSchema(target: ProxyTarget): Schema.Schema.AnyNoContext | undefined {
    if (target[symbolNamespace] === META_NAMESPACE) {
      // TODO(dmaretskyi): Breaks tests.
      // if (target[symbolPath].length !== 0) {
      //   // TODO(dmaretskyi): pluck from ObjectMetaSchema.
      //   return undefined;
      // }
      return ObjectMetaSchema;
    }

    // TODO(y): Make reactive.
    // TODO(burdon): May not be attached to database yet.
    if (!target[symbolInternals].database) {
      // For objects created by `createObject` outside of the database.
      if (target[symbolInternals].rootSchema != null) {
        return target[symbolInternals].rootSchema;
      }

      return undefined;
    }

    const typeReference = target[symbolInternals].core.getType();
    if (typeReference == null) {
      return undefined;
    }

    const staticSchema = target[symbolInternals].database.graph.schemaRegistry.getSchemaByDXN(typeReference.toDXN());
    if (staticSchema != null) {
      return staticSchema;
    }

    // TODO(dmaretskyi): Check using dxn
    if (typeReference.protocol === 'protobuf') {
      return undefined;
    }

    return target[symbolInternals].database.schemaRegistry.query({ id: typeReference.toDXN().toString() }).runSync()[0];
  }

  getTypeReference(target: ProxyTarget): Reference | undefined {
    return target[symbolNamespace] === DATA_NAMESPACE ? target[symbolInternals].core.getType() : undefined;
  }

  isDeleted(target: any): boolean {
    return target[symbolInternals].core.isDeleted();
  }

  deleteProperty(target: ProxyTarget, property: string | symbol): boolean {
    if (target instanceof EchoArray) {
      // Note: Automerge support delete array[index] but its behavior is not consistent with JS arrays.
      //       It works as splice but JS arrays substitute `undefined` for deleted elements.
      //       `Undefined` values are not supported in Automerge, so we can't override this behavior.
      log.warn('Deleting properties from EchoArray is not supported. Use `EchoArray.splice` instead.');
      return false;
    } else if (isRootDataObject(target) && property === PROPERTY_ID) {
      return false;
    } else if (typeof property === 'symbol') {
      return false;
    } else if (target instanceof EchoArray && isNaN(parseInt(property))) {
      return false;
    } else if (typeof property === 'string') {
      const fullPath = [getNamespace(target), ...target[symbolPath], property];
      target[symbolInternals].core.delete(fullPath);
      return true;
    }
    return false;
  }

  arrayPush(target: Live<ProxyTarget>, path: KeyPath, ...items: any[]): number {
    const validatedItems = this._validateForArray(target, path, items, target.length);

    const encodedItems = this._encodeForArray(target, validatedItems);
    return target[symbolInternals].core.arrayPush([getNamespace(target), ...path], encodedItems);
  }

  arrayPop(target: Live<ProxyTarget>, path: KeyPath): any {
    const fullPath = this._getPropertyMountPath(target, path);

    let returnValue: any | undefined;
    target[symbolInternals].core.change((doc) => {
      const array = getDeep(doc, fullPath);
      invariant(Array.isArray(array));
      returnValue = array.pop();
    });

    return returnValue;
  }

  arrayShift(target: Live<ProxyTarget>, path: KeyPath): any {
    const fullPath = this._getPropertyMountPath(target, path);

    let returnValue: any | undefined;
    target[symbolInternals].core.change((doc) => {
      const array = getDeep(doc, fullPath);
      invariant(Array.isArray(array));
      returnValue = array.shift();
    });

    return returnValue;
  }

  arrayUnshift(target: Live<ProxyTarget>, path: KeyPath, ...items: any[]): number {
    const validatedItems = this._validateForArray(target, path, items, 0);

    const fullPath = this._getPropertyMountPath(target, path);
    const encodedItems = this._encodeForArray(target, validatedItems);

    let newLength: number = -1;
    target[symbolInternals].core.change((doc) => {
      const array = getDeep(doc, fullPath);
      invariant(Array.isArray(array));
      newLength = array.unshift(...encodedItems);
    });
    invariant(newLength !== -1);

    return newLength;
  }

  arraySplice(target: Live<ProxyTarget>, path: KeyPath, start: number, deleteCount?: number, ...items: any[]): any[] {
    const validatedItems = this._validateForArray(target, path, items, start);

    const fullPath = this._getPropertyMountPath(target, path);
    const encodedItems = this._encodeForArray(target, validatedItems);

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

  arraySort(target: Live<ProxyTarget>, path: KeyPath, compareFn?: (v1: any, v2: any) => number): any[] {
    const fullPath = this._getPropertyMountPath(target, path);

    target[symbolInternals].core.change((doc) => {
      const array = getDeep(doc, fullPath);
      invariant(Array.isArray(array));
      const sortedArray = [...array].sort(compareFn);
      setDeep(doc, fullPath, sortedArray);
    });

    return target as EchoArray<any>;
  }

  arrayReverse(target: Live<ProxyTarget>, path: KeyPath): any[] {
    const fullPath = this._getPropertyMountPath(target, path);

    target[symbolInternals].core.change((doc) => {
      const array = getDeep(doc, fullPath);
      invariant(Array.isArray(array));
      const reversedArray = [...array].reverse();
      setDeep(doc, fullPath, reversedArray);
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

    return createProxy(metaTarget, this) as any;
  }

  setDatabase(target: ProxyTarget, database: EchoDatabase): void {
    target[symbolInternals].database = database;
  }

  /**
   * Store referenced object.
   * Used when `set` and other mutating methods are called with a proxy.
   * @param target - self
   * @param proxy - the proxy that was passed to the method
   */
  createRef(target: ProxyTarget, proxy: any): Reference {
    let otherEchoObj = proxy instanceof EchoSchema ? proxy.storedSchema : proxy;
    otherEchoObj = !isEchoObject(otherEchoObj) ? createObject(otherEchoObj) : otherEchoObj;
    const otherObjId = otherEchoObj.id;
    invariant(typeof otherObjId === 'string' && otherObjId.length > 0);

    // Note: Save proxy in `.linkCache` if the object is not yet saved in the database.
    const database = target[symbolInternals].database;
    if (!database) {
      invariant(target[symbolInternals].linkCache);

      // Can be caused not using `object(Expando, { ... })` constructor.
      // TODO(dmaretskyi): Add better validation.
      invariant(otherObjId != null);
      target[symbolInternals].linkCache.set(otherObjId, otherEchoObj as AnyLiveObject<any>);
      return Reference.localObjectReference(otherObjId);
    }

    // TODO(burdon): Remote?
    const foreignDatabase = (getProxyTarget(otherEchoObj) as ProxyTarget)[symbolInternals].database;
    if (!foreignDatabase) {
      database.add(otherEchoObj);
      // TODO(dmaretskyi): Is this right.
      return Reference.localObjectReference(otherObjId);
    }

    // Note: If the object is in a different database, return a reference to a foreign database.
    if (foreignDatabase !== database) {
      return Reference.fromDXN(new DXN(DXN.kind.ECHO, [foreignDatabase.spaceId, otherObjId]));
    }

    return Reference.localObjectReference(otherObjId);
  }

  /**
   * Lookup referenced object.
   */
  lookupRef(target: ProxyTarget, ref: Reference): Ref<any> | undefined {
    const database = target[symbolInternals].database;
    if (database) {
      // TODO(dmaretskyi): Put refs into proxy cache.
      const refImpl = new RefImpl(ref.toDXN());
      setRefResolver(
        refImpl,
        database.graph.createRefResolver({
          context: {
            space: database.spaceId,
          },
          middleware: (obj) => this._handleStoredSchema(target, obj),
        }),
      );
      return refImpl;
    } else {
      invariant(target[symbolInternals].linkCache);
      return new RefImpl(
        ref.toDXN(),
        this._handleStoredSchema(target, target[symbolInternals].linkCache.get(ref.objectId)),
      );
    }
  }

  /**
   *
   */
  saveRefs(target: ProxyTarget): void {
    if (!target[symbolInternals].linkCache) {
      return;
    }

    if (target[symbolInternals].linkCache) {
      for (const obj of target[symbolInternals].linkCache.values()) {
        this.createRef(target, obj);
      }

      target[symbolInternals].linkCache = undefined;
    }
  }

  private _arraySetLength(target: ProxyTarget, path: KeyPath, newLength: number): void {
    if (newLength < 0) {
      throw new RangeError('Invalid array length');
    }
    const fullPath = this._getPropertyMountPath(target, path);

    target[symbolInternals].core.change((doc) => {
      const array = getDeep(doc, fullPath);
      invariant(Array.isArray(array));
      const trimmedArray = [...array];
      trimmedArray.length = newLength;
      setDeep(doc, fullPath, trimmedArray);
    });
  }

  private _validateForArray(target: ProxyTarget, path: KeyPath, items: any[], start: number) {
    return items.map((item, index) => {
      return this._validateValue(target, [...path, String(start + index)], item);
    });
  }

  // TODO(dmaretskyi): Change to not rely on object-core doing linking.
  private _encodeForArray(target: ProxyTarget, items: any[] | undefined): any[] {
    const linksEncoded = this._handleLinksAssignment(target, items);
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
    const typename = handler._getTypename(this);
    const isRelation = this[symbolInternals].core.getKind() === EntityKind.Relation;

    const isTyped = !!this[symbolInternals].core.getType();
    const reified = handler._getReified(this);
    reified.id = this[symbolInternals].core.id;
    return `${isTyped ? 'Typed' : ''}Echo${isRelation ? 'Relation' : 'Object'}${typename ? `(${typename})` : ''} ${inspectFn(
      reified,
      {
        ...options,
        compact: true,
        showHidden: false,
        customInspect: false,
      },
    )}`;
  };

  private _getVersion(target: ProxyTarget): Obj.Version {
    const accessor = target[symbolInternals].core.getDocAccessor();
    const doc = accessor.handle.doc();
    invariant(doc);
    const heads = A.getHeads(doc);
    return {
      [Obj.VersionTypeId]: Obj.VersionTypeId,
      versioned: true,
      automergeHeads: heads,
    };
  }

  // TODO(dmaretskyi): Re-use existing json serializer
  private _toJSON(target: ProxyTarget): ObjectJSON {
    target[symbolInternals].signal.notifyRead();
    const typeRef = target[symbolInternals].core.getType();
    const reified = this._getReified(target);

    const obj: Partial<ObjectJSON> = {
      id: target[symbolInternals].core.id,
      [ATTR_TYPE]: typeRef ? typeRef.toDXN().toString() : undefined,
      [ATTR_META]: { ...this.getMeta(target) },
    };

    if (target[symbolInternals].core.isDeleted()) {
      obj[ATTR_DELETED] = true;
    }

    if (target[symbolInternals].core.getSource()) {
      obj[ATTR_RELATION_SOURCE] = target[symbolInternals].core.getSource()!.toDXN().toString();
    }
    if (target[symbolInternals].core.getTarget()) {
      obj[ATTR_RELATION_TARGET] = target[symbolInternals].core.getTarget()!.toDXN().toString();
    }

    Object.assign(
      obj,
      deepMapValues(reified, (value, recurse) => {
        if (value instanceof Reference) {
          return encodeReference(value);
        }
        return recurse(value);
      }),
    );

    return obj as ObjectJSON;
  }

  private _getReified(target: ProxyTarget): any {
    const dataPath = [...target[symbolPath]];
    const fullPath = [getNamespace(target), ...dataPath];
    return target[symbolInternals].core.getDecoded(fullPath);
  }

  private _getDevtoolsFormatter(target: ProxyTarget): DevtoolsFormatter {
    const schema = this.getSchema(target);
    const typename = schema ? getTypeAnnotation(schema)?.typename : undefined;

    return {
      header: (config?: any) => getHeader(typename ?? 'EchoObject', target[symbolInternals].core.id, config),
      hasBody: () => true,
      body: () => {
        let data = deepMapValues(this._getReified(target), (value, recurse) => {
          if (value instanceof Reference) {
            return this.lookupRef(target, value);
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
            '@type': this.getTypeReference(target)?.objectId,
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
  if (value == null || Array.isArray(value) || value instanceof EchoSchema || Ref.isRef(value)) {
    return;
  }

  const proto = Object.getPrototypeOf(value);
  if (typeof value === 'object' && proto !== Object.prototype) {
    throw new Error(`class instances are not supported: setting ${value} on ${String(prop)}`);
  }
};

// TODO(burdon): Move ProxyTarget def to echo-schema and make AnyLiveObject inherit?
export const getObjectCore = <T extends BaseObject>(obj: Live<T>): ObjectCore => {
  if (!(obj as any as ProxyTarget)[symbolInternals]) {
    throw new Error('object is not an EchoObject');
  }

  const { core } = (obj as any as ProxyTarget)[symbolInternals];
  return core;
};

/**
 * @returns Automerge document (or a part of it) that backs the object.
 * Mostly used for debugging.
 */
export const getObjectDocument = (obj: AnyLiveObject<any>): A.Doc<ObjectStructure> => {
  const core = getObjectCore(obj);
  return getDeep(core.getDoc(), core.mountPath)!;
};

export const isRootDataObject = (target: ProxyTarget) => {
  const path = target[symbolPath];
  if (!Array.isArray(path) || path.length > 0) {
    return false;
  }

  return getNamespace(target) === DATA_NAMESPACE;
};

/**
 * @returns True if `value` is part of another EchoObject but not the root data object.
 */
const isEchoObjectField = (value: any) => {
  return (
    isLiveObject(value) &&
    getProxyHandler(value) instanceof EchoReactiveHandler &&
    !isRootDataObject(getProxyTarget(value))
  );
};

const getNamespace = (target: ProxyTarget): string => target[symbolNamespace];

interface DecodedValueAtPath {
  value: any;
  namespace: string;
  dataPath: KeyPath;
}

/** @deprecated Use {@link @dxos/echo#AnyLiveObject} instead. */
// TODO(burdon): Any shouldn't be generic (use namespace).
export type AnyLiveObject<T extends BaseObject = any> = Live<T> & BaseObject & HasId;

/**
 * @returns True if `value` is a reactive object with an EchoHandler backend.
 */
// TODO(dmaretskyi): Reconcile with `isTypedObjectProxy`.
export const isEchoObject = (value: any): value is AnyLiveObject<any> => {
  if (!isLiveObject(value)) {
    return false;
  }

  const handler = getProxyHandler(value);
  if (!(handler instanceof EchoReactiveHandler)) {
    return false;
  }

  return isRootDataObject(getProxyTarget(value));
};

/**
 * Used to determine if the value should be placed at the root of a separate ECHO object.
 *
 * @returns True if `value` is a reactive object with an EchoHandler backend or a schema that has an `Object` annotation.
 */
// TODO(dmaretskyi): Reconcile with `isEchoObject`.
export const isTypedObjectProxy = (value: any): value is Live<any> => {
  if (isEchoObject(value)) {
    return true;
  }

  const schema = getSchema(value);
  if (schema != null) {
    return !!getTypeAnnotation(schema);
  }

  return false;
};

/**
 * Creates a reactive ECHO object backed by a CRDT.
 * @internal
 */
// TODO(burdon): Document lifecycle.
export const createObject = <T extends BaseObject>(obj: T): AnyLiveObject<T> => {
  assertArgument(!isEchoObject(obj), 'obj', 'Object is already an ECHO object');
  const schema = getSchema(obj);
  if (schema != null) {
    validateSchema(schema);
  }
  validateInitialProps(obj);

  const core = new ObjectCore();
  if (isLiveObject(obj)) {
    // Already an echo-schema reactive object.
    const meta = getProxyTarget<ObjectMeta>(getMeta(obj));

    // TODO(burdon): Requires comment.
    const slot = getProxySlot(obj);
    slot.setHandler(EchoReactiveHandler.instance);

    const target = slot.target as ProxyTarget;
    target[symbolInternals] = new ObjectInternals(core);
    target[symbolInternals].rootSchema = schema;
    target[symbolPath] = [];
    target[symbolNamespace] = DATA_NAMESPACE;
    slot.handler._proxyMap.set(target, obj);

    target[symbolInternals].subscriptions.push(core.updates.on(() => target[symbolInternals].signal.notifyWrite()));

    // NOTE: This call is recursively linking all nested objects
    //  which can cause recursive loops of `createObject` if `EchoReactiveHandler` is not set prior to this call.
    //  Do not change order.
    initCore(core, target);
    slot.handler.init(target);

    setSchemaPropertiesOnObjectCore(target[symbolInternals], schema);
    setRelationSourceAndTarget(target, core, schema);

    if (meta && metaNotEmpty(meta)) {
      target[symbolInternals].core.setMeta(meta);
    }

    return obj as any;
  } else {
    const target: ProxyTarget = {
      [symbolInternals]: new ObjectInternals(core),
      [symbolPath]: [],
      [symbolNamespace]: DATA_NAMESPACE,
      ...(obj as any),
    };
    target[symbolInternals].rootSchema = schema;
    target[symbolInternals].subscriptions.push(core.updates.on(() => target[symbolInternals].signal.notifyWrite()));

    initCore(core, target);
    const proxy = createProxy<ProxyTarget>(target, EchoReactiveHandler.instance) as any;
    setSchemaPropertiesOnObjectCore(target[symbolInternals], schema);
    setRelationSourceAndTarget(target, core, schema);

    return proxy;
  }
};

const metaNotEmpty = (meta: ObjectMeta) => meta.keys.length > 0 || (meta.tags && meta.tags.length > 0);

/**
 * @internal
 */
// TODO(burdon): Call and remove subscriptions.
export const destroyObject = <T extends BaseObject>(proxy: AnyLiveObject<T>) => {
  invariant(isEchoObject(proxy));
  const target: ProxyTarget = getProxyTarget(proxy);
  const internals: ObjectInternals = target[symbolInternals];
  for (const unsubscribe of internals.subscriptions) {
    unsubscribe();
  }
};

const initCore = (core: ObjectCore, target: ProxyTarget) => {
  // Handle ID pre-generated by `create`.
  if (PROPERTY_ID in target) {
    target[symbolInternals].core.id = target[PROPERTY_ID];
    delete target[PROPERTY_ID];
  }

  core.initNewObject(linkAllNestedProperties(target));
};

/**
 * @internal
 */
export const initEchoReactiveObjectRootProxy = (core: ObjectCore, database?: EchoDatabase): AnyLiveObject<any> => {
  const target: ProxyTarget = {
    [symbolInternals]: new ObjectInternals(core, database),
    [symbolPath]: [],
    [symbolNamespace]: DATA_NAMESPACE,
  };

  // TODO(dmaretskyi): Does this need to be disposed?
  core.updates.on(() => target[symbolInternals].signal.notifyWrite());

  const obj = createProxy<ProxyTarget>(target, EchoReactiveHandler.instance) as any;
  assertObjectModelShape(obj);
  return obj;
};

const validateSchema = (schema: Schema.Schema.AnyNoContext) => {
  requireTypeReference(schema);
  const entityKind = getEntityKind(schema);
  invariant(entityKind === 'object' || entityKind === 'relation');
  SchemaValidator.validateSchema(schema);
};

const setSchemaPropertiesOnObjectCore = (
  internals: ObjectInternals,
  schema: Schema.Schema.AnyNoContext | undefined,
) => {
  if (schema != null) {
    internals.core.setType(requireTypeReference(schema));

    const kind = getEntityKind(schema);
    invariant(kind);
    internals.core.setKind(kind);
  }
};

const setRelationSourceAndTarget = (
  target: ProxyTarget,
  core: ObjectCore,
  schema: Schema.Schema.AnyNoContext | undefined,
) => {
  const kind = schema && getEntityKind(schema);
  if (kind === EntityKind.Relation) {
    // `getSource` and `getTarget` don't work here since they assert entity kind.
    const sourceRef = (target as any)[RelationSourceId];
    const targetRef = (target as any)[RelationTargetId];
    if (!sourceRef || !targetRef) {
      throw new TypeError('Relation source and target must be specified');
    }
    if (!isLiveObject(sourceRef)) {
      throw new TypeError('source must be an ECHO object');
    }
    if (!isLiveObject(targetRef)) {
      throw new TypeError('target must be an ECHO object');
    }

    core.setSource(EchoReactiveHandler.instance.createRef(target, sourceRef));
    core.setTarget(EchoReactiveHandler.instance.createRef(target, targetRef));
  }
};

const validateInitialProps = (target: any, seen: Set<object> = new Set()) => {
  if (seen.has(target)) {
    return;
  }

  seen.add(target);
  for (const key in target) {
    const value = target[key];
    if (value === undefined) {
      delete target[key];
    } else if (typeof value === 'object') {
      if (Ref.isRef(value)) {
        // Pass refs as is.
      } else if (value instanceof EchoSchema || isTypedObjectProxy(value)) {
        throw new Error('Object references must be wrapped with `Ref.make`');
      } else {
        throwIfCustomClass(key, value);
        validateInitialProps(target[key], seen);
      }
    }
  }
};

const linkAllNestedProperties = (target: ProxyTarget): DecodedAutomergePrimaryValue => {
  return deepMapValues(target, (value, recurse) => {
    if (Ref.isRef(value)) {
      return refToEchoReference(target, value);
    }

    return recurse(value);
  });
};

const refToEchoReference = (target: ProxyTarget, ref: Ref<any>): Reference => {
  const savedTarget = getRefSavedTarget(ref);
  if (savedTarget) {
    return EchoReactiveHandler.instance.createRef(target, savedTarget);
  } else {
    return Reference.fromDXN(ref.dxn);
  }
};
