//
// Copyright 2024 DXOS.org
//

import * as A from '@automerge/automerge';
import * as Schema from 'effect/Schema';
import { type InspectOptionsStylized } from 'node:util';

import { Event } from '@dxos/async';
import { devtoolsFormatter, inspectCustom } from '@dxos/debug';
import { Entity, Obj, Type } from '@dxos/echo';
import {
  DATA_NAMESPACE,
  EncodedReference,
  type EntityStructure,
  PROPERTY_ID,
  isEncodedReference,
} from '@dxos/echo-protocol';
import {
  type AnyProperties,
  EntityKind,
  type EntityMeta,
  EventId,
  MetaId,
  ParentId,
  type ReactiveHandler,
  Ref,
  RelationSourceId,
  RelationTargetId,
  SchemaId,
  SchemaValidator,
  SelfURIId,
  TypeEntityId,
  assertObjectModel,
  createProxy,
  defineHiddenProperty,
  getEntityKind,
  getProxyHandler,
  getProxySlot,
  getProxyTarget,
  getRefSavedTarget,
  getSchemaURI,
  getTypeAnnotation,
  isInChangeContext,
  isProxy,
  isReactiveRecord,
  normalizeSpliceRange,
  queueNotification,
  symbolIsProxy,
} from '@dxos/echo/internal';
import { assertArgument, invariant } from '@dxos/invariant';
import { EID, EntityId, type URI } from '@dxos/keys';
import { log } from '@dxos/log';
import { deepMapValues, defaultMap, getDeep, setDeep } from '@dxos/util';

import * as Doc from '../automerge/Doc';
import { type DecodedAutomergePrimaryValue, META_NAMESPACE, ObjectCore } from '../core-db';
import { type EchoDatabase } from '../proxy-db';
import { EchoArray } from './echo-array';
import { getObjectCore, isEchoObject, isRootDataObject } from './echo-object-utils';
import {
  adoptInstanceState,
  createInstanceState,
  createRecordTarget,
  getDecodedValueAtPath,
  getDevtoolsFormatter,
  getReified,
  getSchema,
  getTypeEntity,
  getTypename,
  handleStoredSchema,
  lookupRef,
  stripShadowingProperties,
} from './echo-prototypes';
import {
  type ProxyTarget,
  TargetKey,
  getEchoDatabase,
  symbolHandler,
  symbolInternals,
  symbolNamespace,
  symbolPath,
} from './echo-proxy-target';
import {
  createArrayMethodError,
  createPropertyDeleteError,
  createPropertySetError,
  createTextMethodError,
} from './errors';

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

    if (!(EventId in target)) {
      defineHiddenProperty(target, EventId, new Event());
    }

    // Maybe have been set by `create`.
    Object.defineProperty(target, inspectCustom, {
      enumerable: false,
      configurable: true,
      value: this._inspect.bind(target),
    });
  }

  ownKeys(target: ProxyTarget): ArrayLike<string | symbol> {
    const { value } = getDecodedValueAtPath(target);
    const keys = typeof value === 'object' ? Reflect.ownKeys(value) : [];
    if (isRootDataObject(target)) {
      keys.push(PROPERTY_ID);
    }

    return keys;
  }

  getOwnPropertyDescriptor(target: ProxyTarget, p: string | symbol): PropertyDescriptor | undefined {
    const { value } = getDecodedValueAtPath(target);
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

    // The ECHO system surface (id, type, meta, relation refs, ...) is carried on
    // the prototype chain, so `Reflect.has` answers for it structurally — root
    // objects report it, nested/meta records do not.
    if (Reflect.has(target, p)) {
      return true;
    }

    const { value } = getDecodedValueAtPath(target);
    return typeof value === 'object' ? Reflect.has(value, p) : false;
  }

  get(target: ProxyTarget, prop: string | symbol, receiver: any): any {
    invariant(Array.isArray(target[symbolPath]));

    // Cross-cutting internal accessors that apply to records and arrays alike.
    switch (prop) {
      case symbolInternals:
        return target[symbolInternals];
      case SchemaId:
        return getSchema(target);
      case TypeEntityId:
        return getTypeEntity(target);
      case devtoolsFormatter:
        return getDevtoolsFormatter(target);
    }

    if (target instanceof EchoArray) {
      if (typeof prop === 'symbol') {
        return Reflect.get(target, prop);
      }
      return this._arrayGet(target, prop);
    }

    // The ECHO system surface (id, [Type], [Meta], [Parent], toJSON, ...) is defined as
    // accessors/methods on the prototype chain (instanceState → EchoRoot/EchoRecord.prototype →
    // Object.prototype); root objects expose the full set, nested/meta records the empty base.
    // `Reflect.has` reports that surface (plus Object.prototype members, which resolve normally,
    // as on a plain object); everything else is absent here and is virtual user data backed by
    // the document. See the layering diagram in echo-prototypes.ts.
    if (Reflect.has(target, prop)) {
      return Reflect.get(target, prop, receiver);
    }
    if (typeof prop === 'symbol') {
      return undefined;
    }

    // Virtual read-only properties on the root meta proxy — sourced from the system
    // section and the automerge change graph, not from the stored meta section.
    if (target[symbolNamespace] === META_NAMESPACE && target[symbolPath].length === 0) {
      if (prop === 'createdAt') {
        return target[symbolInternals].getCreatedAt();
      }
      if (prop === 'updatedAt') {
        return target[symbolInternals].getUpdatedAt();
      }
    }

    const decodedValueAtPath = getDecodedValueAtPath(target, prop);
    return this._wrapInProxyIfRequired(target, decodedValueAtPath);
  }

  set(target: ProxyTarget, prop: string | symbol, value: any, receiver: any): boolean {
    invariant(Array.isArray(target[symbolPath]));

    // System setters (currently only [ParentId]) are defined on the prototype
    // chain and, like before, are allowed regardless of change context.
    if (typeof prop === 'symbol' && hasPrototypeSetter(target, prop)) {
      return Reflect.set(target, prop, value, receiver);
    }
    invariant(typeof prop === 'string');

    // createdAt / updatedAt are virtual read-only properties on the meta proxy.
    if (target[symbolNamespace] === META_NAMESPACE && (prop === 'createdAt' || prop === 'updatedAt')) {
      throw new TypeError(`'${prop}' is a read-only system property.`);
    }

    // Check readonly enforcement for ECHO objects.
    const core = target[symbolInternals];
    if (!isInChangeContext(core)) {
      throw createPropertySetError(prop);
    }

    if (target instanceof EchoArray && prop === 'length') {
      this._arraySetLength(target, target[symbolPath], value);
      return true;
    }

    const fullPath = [getNamespace(target), ...target[symbolPath], prop];
    const validatedValue = this._validateValue(target, [...target[symbolPath], prop], value);
    if (validatedValue === undefined) {
      target[symbolInternals].delete(fullPath);
    } else {
      const withLinks = this._handleLinksAssignment(target, validatedValue);
      target[symbolInternals].setDecoded(fullPath, withLinks);
    }

    // Note: EventId.emit() is called centrally in core.updates.on() to handle both local and remote changes.
    return true;
  }

  /**
   * Hide the internal `instanceState`/behaviour prototypes from consumers so that
   * `Object.getPrototypeOf(obj)` and `instanceof Object`/`Array` behave as for a
   * plain object/array.
   */
  getPrototypeOf(target: ProxyTarget): object | null {
    return target instanceof EchoArray ? Array.prototype : Object.prototype;
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
    if (decoded instanceof Uint8Array) {
      return decoded;
    }
    if (decoded[symbolIsProxy]) {
      return handleStoredSchema(target, decoded);
    }
    if (isEncodedReference(decoded)) {
      return lookupRef(target, decoded);
    }
    if (Array.isArray(decoded)) {
      const targetKey = TargetKey.new(dataPath, namespace, 'array');
      const newTarget = defaultMap(target[symbolInternals].targetsMap, targetKey, (): ProxyTarget => {
        const array = new EchoArray();
        array[symbolInternals] = target[symbolInternals];
        array[symbolPath] = dataPath;
        array[symbolNamespace] = namespace;
        array[symbolHandler] = this;
        defineHiddenProperty(array, EventId, target[EventId]);
        return array as any as ProxyTarget;
      });

      return createProxy(newTarget, this);
    }
    if (typeof decoded === 'object') {
      const targetKey = TargetKey.new(dataPath, namespace, 'record');
      // TODO(dmaretskyi): Materialize properties for easier debugging.
      const newTarget = defaultMap(
        target[symbolInternals].targetsMap,
        targetKey,
        // Reuse the root target's event: the central `core.updates` subscription emits on the root's
        // event only, so a derived record proxy with its own event would never notify its subscribers
        // (arrays preserve `target[EventId]` for the same reason).
        (): ProxyTarget =>
          createRecordTarget(
            createInstanceState(target[symbolInternals], namespace, dataPath, { event: target[EventId] }),
          ),
      );

      return createProxy(newTarget, this);
    }

    return decoded;
  }

  private _arrayGet(target: ProxyTarget, prop: string) {
    invariant(target instanceof EchoArray);
    if (prop === 'constructor') {
      return Array.prototype.constructor;
    }
    if (prop !== 'length' && isNaN(parseInt(prop))) {
      return Reflect.get(target, prop);
    }

    const decodedValueAtPath = getDecodedValueAtPath(target, prop);
    return this._wrapInProxyIfRequired(target, decodedValueAtPath);
  }

  private _arrayHas(target: ProxyTarget, prop: string | symbol): boolean {
    invariant(target instanceof EchoArray);
    if (typeof prop === 'string') {
      const parsedIndex = parseInt(prop);
      const { value: length } = getDecodedValueAtPath(target, 'length');
      invariant(typeof length === 'number');
      if (!isNaN(parsedIndex)) {
        return parsedIndex < length;
      }
    }

    return Reflect.has(target, prop);
  }

  private _validateValue(target: ProxyTarget, path: Doc.KeyPath, value: any): any {
    invariant(path.length > 0);
    if (typeof path.at(-1) === 'symbol') {
      throw new Error('Invalid path');
    }
    if (path.length === 1 && path[0] === 'id') {
      throw new Error('Object Id is readonly');
    }
    throwIfCustomClass(path[path.length - 1], value);
    const rootObjectSchema = getSchema(target);
    if (rootObjectSchema == null) {
      const typeRef = target[symbolInternals].getType();
      if (typeRef) {
        // The object has schema, but we can't access it to validate the value being set.
        throw new Error(`Schema not found in schema registry: ${EncodedReference.toURI(typeRef)}`);
      }

      return value;
    }

    const propertySchema = SchemaValidator.getPropertySchema(rootObjectSchema, path, (path) => {
      return target[symbolInternals].getDecoded([getNamespace(target), ...path]);
    });

    const _ = Schema.asserts(propertySchema)(value);
    SchemaValidator.assertExactProperties(propertySchema, value, (path) => getDeep(value, path));
    return value;
  }

  private _handleLinksAssignment(target: ProxyTarget, value: any): any {
    return deepMapValues(value, (value, recurse) => {
      if (isEchoObjectField(value)) {
        // The value is a value-object field of another echo-object. We don't want to create a reference
        // to it or have shared mutability, we need to copy by value.
        return recurse({ ...value });
      } else if (isProxy(value)) {
        throw new Error('Object references must be wrapped with `Ref.make`');
      } else if (Ref.isRef(value)) {
        const savedTarget = getRefSavedTarget(value);
        if (savedTarget) {
          return EncodedReference.fromURI(this.createRef(target, savedTarget));
        } else {
          return EncodedReference.fromURI(value.uri);
        }
      } else if (value instanceof Uint8Array) {
        return value;
      } else {
        return recurse(value);
      }
    });
  }

  deleteProperty(target: ProxyTarget, property: string | symbol): boolean {
    // Check readonly enforcement for ECHO objects.
    const core = target[symbolInternals];
    if (!isInChangeContext(core)) {
      throw createPropertyDeleteError(property);
    }

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
      target[symbolInternals].delete(fullPath);
      return true;
    }
    return false;
  }

  arrayPush(target: ProxyTarget, path: Doc.KeyPath, ...items: any[]): number {
    this._checkArrayMutationAllowed(target, 'push');
    const validatedItems = this._validateForArray(target, path, items, target.length);

    const encodedItems = this._encodeForArray(target, validatedItems);
    const result = target[symbolInternals].arrayPush([getNamespace(target), ...path], encodedItems);
    return result;
  }

  arrayPop(target: ProxyTarget, path: Doc.KeyPath): any {
    this._checkArrayMutationAllowed(target, 'pop');
    const fullPath = this._getPropertyMountPath(target, path);

    let returnValue: any | undefined;
    target[symbolInternals].change((doc: any) => {
      const array = getDeep(doc, fullPath);
      invariant(Array.isArray(array));
      returnValue = array.pop();
    });

    return returnValue;
  }

  arrayShift(target: ProxyTarget, path: Doc.KeyPath): any {
    this._checkArrayMutationAllowed(target, 'shift');
    const fullPath = this._getPropertyMountPath(target, path);

    let returnValue: any | undefined;
    target[symbolInternals].change((doc: any) => {
      const array = getDeep(doc, fullPath);
      invariant(Array.isArray(array));
      returnValue = array.shift();
    });

    return returnValue;
  }

  arrayUnshift(target: ProxyTarget, path: Doc.KeyPath, ...items: any[]): number {
    this._checkArrayMutationAllowed(target, 'unshift');
    const validatedItems = this._validateForArray(target, path, items, 0);
    const fullPath = this._getPropertyMountPath(target, path);
    const encodedItems = this._encodeForArray(target, validatedItems);

    let newLength: number = -1;
    target[symbolInternals].change((doc: any) => {
      const array = getDeep(doc, fullPath);
      invariant(Array.isArray(array));
      newLength = array.unshift(...encodedItems);
    });

    invariant(newLength !== -1);
    return newLength;
  }

  arraySplice(target: ProxyTarget, path: Doc.KeyPath, start: number, deleteCount?: number, ...items: any[]): any[] {
    this._checkArrayMutationAllowed(target, 'splice');
    const validatedItems = this._validateForArray(target, path, items, start);

    const fullPath = this._getPropertyMountPath(target, path);
    const encodedItems = this._encodeForArray(target, validatedItems);

    let deletedElements: any[] | undefined;
    target[symbolInternals].change((doc: any) => {
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

  arraySort(target: ProxyTarget, path: Doc.KeyPath, compareFn?: (v1: any, v2: any) => number): any[] {
    this._checkArrayMutationAllowed(target, 'sort');
    const fullPath = this._getPropertyMountPath(target, path);

    target[symbolInternals].change((doc: any) => {
      const array = getDeep(doc, fullPath);
      invariant(Array.isArray(array));
      const sortedArray = [...array].sort(compareFn);
      setDeep(doc, fullPath, sortedArray);
    });

    return target as EchoArray<any>;
  }

  arrayReverse(target: ProxyTarget, path: Doc.KeyPath): any[] {
    this._checkArrayMutationAllowed(target, 'reverse');
    const fullPath = this._getPropertyMountPath(target, path);

    target[symbolInternals].change((doc: any) => {
      const array = getDeep(doc, fullPath);
      invariant(Array.isArray(array));
      const reversedArray = [...array].reverse();
      setDeep(doc, fullPath, reversedArray);
    });

    return target as EchoArray<any>;
  }

  textUpdate(target: ProxyTarget, path: Doc.KeyPath, newText: string): void {
    this._checkTextMutationAllowed(target, 'update');
    const fullPath = this._getPropertyMountPath(target, path);
    target[symbolInternals].change((doc: any) => {
      // `A.updateText` computes a minimal diff so cursors/anchors survive and concurrent edits merge.
      // `.slice()` materializes a mutable copy since Automerge mutates the path array.
      A.updateText(doc, fullPath.slice(), newText);
    });
  }

  textSplice(target: ProxyTarget, path: Doc.KeyPath, start: number, deleteCount: number, insert: string): string {
    this._checkTextMutationAllowed(target, 'splice');
    const fullPath = this._getPropertyMountPath(target, path);

    let removed = '';
    target[symbolInternals].change((doc: any) => {
      const current = getDeep(doc, fullPath);
      invariant(typeof current === 'string', 'Text mutation target is not a string');
      const range = normalizeSpliceRange(current.length, start, deleteCount);
      removed = current.slice(range.start, range.start + range.deleteCount);
      A.splice(doc, fullPath.slice(), range.start, range.deleteCount, insert);
    });

    return removed;
  }

  /**
   * Check if array mutation is allowed (inside a change context).
   */
  private _checkArrayMutationAllowed(target: ProxyTarget, method: string): void {
    const core = target[symbolInternals];
    if (!isInChangeContext(core)) {
      throw createArrayMethodError(method);
    }
  }

  /**
   * Check if text mutation is allowed (inside a change context).
   */
  private _checkTextMutationAllowed(target: ProxyTarget, method: string): void {
    const core = target[symbolInternals];
    if (!isInChangeContext(core)) {
      throw createTextMethodError(method);
    }
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
  createRef(target: ProxyTarget, proxy: any): URI.URI {
    let otherEchoObj = proxy;

    // Honour a Queue URI carried by the source. Queue-decoded objects (returned by
    // `Feed.query(...).run` / `queue.queryObjects`) have a `SelfURIId` annotation set directly
    // on the plain object (not via proxy) and do not live in `space.db`. Without this
    // short-circuit, the path below would wrap the queue object as a fresh ECHO proxy
    // and call `database.add()`, leaking the object into `space.db`.
    if (typeof otherEchoObj === 'object' && otherEchoObj !== null && !isEchoObject(otherEchoObj)) {
      const selfUri = (otherEchoObj as any)[SelfURIId];
      if (typeof selfUri === 'string' && EID.isEID(selfUri)) {
        return selfUri;
      }
    }

    otherEchoObj = !isEchoObject(otherEchoObj) ? createObject(otherEchoObj) : otherEchoObj;
    const otherObjId = otherEchoObj.id;
    invariant(typeof otherObjId === 'string' && otherObjId.length > 0);

    // Note: Save proxy in `.linkCache` if the object is not yet saved in the database.
    const database = getEchoDatabase(target[symbolInternals]);
    if (!database) {
      invariant(target[symbolInternals].linkCache);

      // Can be caused not using `object(Expando, { ... })` constructor.
      // TODO(dmaretskyi): Add better validation.
      invariant(otherObjId != null);
      target[symbolInternals].linkCache.set(otherObjId, otherEchoObj as Entity.Unknown);
      return EID.make({ entityId: otherObjId });
    }

    // TODO(burdon): Remote?
    const foreignDatabase = getEchoDatabase((getProxyTarget(otherEchoObj) as ProxyTarget)[symbolInternals]);
    if (!foreignDatabase) {
      database.add(otherEchoObj);
      // TODO(dmaretskyi): Is this right.
      return EID.make({ entityId: otherObjId });
    }

    // Note: If the object is in a different database, return a reference to a foreign database.
    if (foreignDatabase !== database) {
      return EID.make({ spaceId: foreignDatabase.spaceId, entityId: otherObjId });
    }

    return EID.make({ entityId: otherObjId });
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

  /**
   * Re-stamps a relation's source/target references once it joins a database. `setRelationSourceAndTarget`
   * runs at construction time, before the relation has a database, so it can only emit space-less refs.
   * With the database known, each endpoint is bound here: a same-space endpoint stays relative, a
   * cross-space endpoint becomes absolute, and an unpersisted endpoint is added to this database (then
   * relative) — keeping the relation's strong-dependency endpoints resolvable from the persisted ref alone.
   */
  rebindRelationEndpoints(target: ProxyTarget): void {
    const core = target[symbolInternals];
    if (core.getKind() !== EntityKind.Relation) {
      return;
    }
    // Read the raw endpoint proxies off the target (not via the resolving get-trap on the proxy).
    const sourceRef = Reflect.get(target, RelationSourceId);
    const targetRef = Reflect.get(target, RelationTargetId);
    if (isProxy(sourceRef)) {
      core.setSource(EncodedReference.fromURI(this.createRef(target, sourceRef)));
    }
    if (isProxy(targetRef)) {
      core.setTarget(EncodedReference.fromURI(this.createRef(target, targetRef)));
    }
  }

  private _arraySetLength(target: ProxyTarget, path: Doc.KeyPath, newLength: number): void {
    if (newLength < 0) {
      throw new RangeError('Invalid array length');
    }
    const fullPath = this._getPropertyMountPath(target, path);

    target[symbolInternals].change((doc: any) => {
      const array = getDeep(doc, fullPath);
      invariant(Array.isArray(array));
      const trimmedArray = [...array];
      trimmedArray.length = newLength;
      setDeep(doc, fullPath, trimmedArray);
    });
  }

  private _validateForArray(target: ProxyTarget, path: Doc.KeyPath, items: any[], start: number) {
    return items.map((item, index) => {
      return this._validateValue(target, [...path, String(start + index)], item);
    });
  }

  // TODO(dmaretskyi): Change to not rely on object-core doing linking.
  private _encodeForArray(target: ProxyTarget, items: any[] | undefined): any[] {
    const linksEncoded = this._handleLinksAssignment(target, items);
    return target[symbolInternals].encode(linksEncoded);
  }

  private _getPropertyMountPath(target: ProxyTarget, path: Doc.KeyPath): Doc.KeyPath {
    return [...target[symbolInternals].mountPath, getNamespace(target), ...path];
  }

  // Will be bound to the proxy target.
  _inspect = function (
    this: ProxyTarget,
    _: number,
    options: InspectOptionsStylized,
    inspectFn: (value: any, options?: InspectOptionsStylized) => string,
  ) {
    const typename = getTypename(this);
    const isRelation = this[symbolInternals].getKind() === EntityKind.Relation;

    const isTyped = !!this[symbolInternals].getType();
    const reified = getReified(this);
    reified.id = this[symbolInternals].id;
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
}

export const throwIfCustomClass = (prop: Doc.KeyPath[number], value: any) => {
  if (value == null || Array.isArray(value) || Ref.isRef(value) || value instanceof Uint8Array) {
    return;
  }

  // A reactive record is either rooted at `Object.prototype` or carries a reactive behaviour
  // prototype (the typed handler relocates per-object metadata onto an intermediate prototype),
  // so test for that rather than a bare `Object.prototype` identity check.
  if (typeof value === 'object' && !isReactiveRecord(value)) {
    throw new Error(`class instances are not supported: setting ${value} on ${String(prop)}`);
  }
};

// Re-export from echo-object-utils for backward compatibility.
export { getObjectCore };

/**
 * @returns Automerge document (or a part of it) that backs the object.
 * Mostly used for debugging.
 */
export const getObjectDocument = (obj: Obj.Any): A.Doc<EntityStructure> => {
  const core = getObjectCore(obj);
  return getDeep(core.getDoc(), core.mountPath)!;
};

// Re-export from echo-object-utils for backward compatibility.
export { isRootDataObject };

/**
 * @returns True if `value` is part of another EchoObjectSchema but not the root data object.
 */
const isEchoObjectField = (value: any) => {
  return (
    isProxy(value) && getProxyHandler(value) instanceof EchoReactiveHandler && !isRootDataObject(getProxyTarget(value))
  );
};

const getNamespace = (target: ProxyTarget): string => target[symbolNamespace];


/**
 * Walk the prototype chain looking for an accessor with a setter for `prop`.
 * Used by the `set` trap to route writes to system setters (e.g. `[ParentId]`).
 */
const hasPrototypeSetter = (target: object, prop: string | symbol): boolean => {
  let obj: object | null = target;
  while (obj) {
    const descriptor = Object.getOwnPropertyDescriptor(obj, prop);
    if (descriptor) {
      return typeof descriptor.set === 'function';
    }
    obj = Object.getPrototypeOf(obj);
  }
  return false;
};

interface DecodedValueAtPath {
  value: any;
  namespace: string;
  dataPath: Doc.KeyPath;
}

/**
 * Used to determine if the value should be placed at the root of a separate ECHO object.
 *
 * @returns True if `value` is a reactive object with an EchoHandler backend or a schema that has an `Object` annotation.
 */
// TODO(dmaretskyi): Reconcile with `isEchoObject`.
export const isTypedObjectProxy = (value: any): value is any => {
  if (isEchoObject(value)) {
    return true;
  }

  const type = Obj.getType(value);
  if (type != null) {
    return !!getTypeAnnotation(Type.getSchema(type));
  }

  return false;
};

/**
 * Helper type to preserve Obj<Props> types, otherwise return Entity.Entity<T>.
 */
type CreateObjectReturn<T> = T extends Obj.Unknown ? T : Entity.Entity<T>;

/**
 * Creates a reactive ECHO object backed by a CRDT.
 * @internal
 */
export const createObject = <T extends AnyProperties>(obj: T): CreateObjectReturn<T> => {
  assertArgument(!isEchoObject(obj), 'obj', 'Object is already an ECHO object');
  const type = Obj.getType(obj as unknown as Obj.Unknown);
  const schema = type != null ? Type.getSchema(type) : undefined;
  if (schema != null) {
    validateSchema(schema);
  }
  // Validate initial props on the raw target to avoid change context restrictions.
  const rawTarget = isProxy(obj) ? getProxyTarget(obj) : obj;
  validateInitialProps(rawTarget);

  const core = new ObjectCore();
  if (isProxy(obj)) {
    // Already an echo-schema reactive object.
    const meta = getProxyTarget<EntityMeta>(Entity.getMeta(obj as unknown as Entity.Unknown));

    // TODO(burdon): Requires comment.
    const slot = getProxySlot(obj);
    slot.setHandler(EchoReactiveHandler.instance);

    const target = slot.target as ProxyTarget;
    core.rootSchema = type;
    // Preserve the object's existing Event so reactive subscriptions established while it was an
    // in-memory typed object keep firing once it becomes database-backed.
    const existingEvent = target[EventId];
    // The previous (typed) handler keeps this object's metadata on its instance-state prototype.
    // Re-pointing the prototype below would detach it, but the migration that follows
    // (`initCore`, `setRelationSourceAndTarget`, `rebindRelationEndpoints`) reads parent/relation
    // endpoints off the target — so flatten that metadata onto the target as own properties first.
    // Shadowing copies are removed by `stripShadowingProperties` once migrated into the document.
    const previousState = Object.getPrototypeOf(target);
    if (previousState != null) {
      for (const symbol of Object.getOwnPropertySymbols(previousState)) {
        if (!Object.prototype.hasOwnProperty.call(target, symbol)) {
          Object.defineProperty(target, symbol, Object.getOwnPropertyDescriptor(previousState, symbol)!);
        }
      }
    }
    adoptInstanceState(target, createInstanceState(core, DATA_NAMESPACE, [], { event: existingEvent }));
    slot.handler._proxyMap.set(target, obj);

    core.subscriptions.push(
      core.updates.on(() => {
        // Invalidate the lazily-rebuilt `[StaticTypeSchemaSlot]` cache so it
        // gets recomputed from the (possibly new) `jsonSchema` on next read.
        target[symbolInternals].cachedStaticSlot = undefined;
        if (isInChangeContext(core)) {
          // Defer notification until the change context exits.
          queueNotification(core);
        } else {
          // Immediate notification for external changes (sync from peers).
          target[EventId]?.emit();
        }
      }),
    );

    // NOTE: This call is recursively linking all nested objects
    //  which can cause recursive loops of `createObject` if `EchoReactiveHandler` is not set prior to this call.
    //  Do not change order.
    initCore(core, target);
    slot.handler.init(target);

    setSchemaPropertiesOnObjectCore(core, schema);
    setRelationSourceAndTarget(target, core, schema);

    if (meta && metaNotEmpty(meta)) {
      target[symbolInternals].setMeta(linkMetaRefs(target, meta));
    }

    // Now that the previous handler's metadata (parent, relation source/target,
    // type, ...) has been migrated into the document, remove the own properties it
    // left on the shared target so they don't shadow the ECHO system accessors.
    stripShadowingProperties(target);

    return obj as CreateObjectReturn<T>;
  } else {
    // The clean target carries no own data; `obj`'s properties are seeded onto it
    // only so `initCore` can migrate them into the document (then `init` clears them).
    const target = createRecordTarget(createInstanceState(core, DATA_NAMESPACE, []), obj as any);
    core.rootSchema = type;
    core.subscriptions.push(
      core.updates.on(() => {
        // Invalidate the lazily-rebuilt `[StaticTypeSchemaSlot]` cache so it
        // gets recomputed from the (possibly new) `jsonSchema` on next read.
        target[symbolInternals].cachedStaticSlot = undefined;
        if (isInChangeContext(core)) {
          // Defer notification until the change context exits.
          queueNotification(core);
        } else {
          // Immediate notification for external changes (sync from peers).
          target[EventId]?.emit();
        }
      }),
    );

    initCore(core, target);
    const proxy = createProxy<ProxyTarget>(target, EchoReactiveHandler.instance);
    setSchemaPropertiesOnObjectCore(core, schema);
    setRelationSourceAndTarget(target, core, schema);

    // Carry over `[MetaId]` from a non-reactive source (e.g. `Obj.makeStatic` /
    // internal `createObject`) which stamps it as a non-enumerable hidden
    // property, so `...(obj as any)` above doesn't pick it up. The reactive
    // proxy branch above does the equivalent via `Entity.getMeta`.
    const seededMeta = (obj as any)[MetaId] as EntityMeta | undefined;
    if (seededMeta && metaNotEmpty(seededMeta)) {
      core.setMeta(linkMetaRefs(target, seededMeta));
    }

    return proxy as unknown as CreateObjectReturn<T>;
  }
};

const metaNotEmpty = (meta: EntityMeta) =>
  meta.keys.length > 0 ||
  meta.tags.length > 0 ||
  (meta.annotations != null && Object.keys(meta.annotations).length > 0) ||
  meta.key !== undefined ||
  meta.version !== undefined;

/**
 * @internal
 */
// TODO(burdon): Call and remove subscriptions.
export const destroyObject = <T extends Obj.Unknown>(proxy: T) => {
  assertArgument(isEchoObject(proxy), 'proxy');
  const core = (getProxyTarget(proxy) as ProxyTarget)[symbolInternals];
  for (const unsubscribe of core.subscriptions) {
    unsubscribe();
  }
};

const initCore = (core: ObjectCore, target: ProxyTarget) => {
  // Handle ID pre-generated by `create`.
  if (PROPERTY_ID in target) {
    target[symbolInternals].id = target[PROPERTY_ID];
    delete target[PROPERTY_ID];
  }

  core.initNewObject(linkAllNestedProperties(target));

  // Handle parent reference set via [Obj.Parent] in Obj.make.
  const parentValue = (target as any)[ParentId];
  if (parentValue !== undefined) {
    const parentId = parentValue.id ?? parentValue;
    if (EntityId.isValid(parentId)) {
      core.setParent(EncodedReference.fromURI(EID.make({ entityId: parentId })));
    }
    delete (target as any)[ParentId];
  }
};

/**
 * @internal
 */
export const initEchoReactiveObjectRootProxy = (core: ObjectCore, database?: EchoDatabase): Entity.Unknown => {
  // Each core owns exactly one root proxy; callers must not call this twice on the same core.
  invariant(!core.rootProxy, 'ObjectCore already has a root proxy; bind to a fresh core instead.');
  core.database = database;
  const target = createRecordTarget(createInstanceState(core, DATA_NAMESPACE, []));

  // TODO(dmaretskyi): Does this need to be disposed?
  core.updates.on(() => {
    if (isInChangeContext(core)) {
      // Defer notification until the change context exits.
      queueNotification(core);
    } else {
      // Immediate notification for external changes (sync from peers).
      target[EventId]?.emit();
    }
  });

  const obj = createProxy<ProxyTarget>(target, EchoReactiveHandler.instance) as any;
  assertObjectModel(obj);
  core.rootProxy = obj;
  return obj;
};

const validateSchema = (schema: Schema.Schema.AnyNoContext) => {
  const dxn = getSchemaURI(schema);
  invariant(dxn, 'Schema must be defined via TypedObject.');
  const entityKind = getEntityKind(schema);
  invariant(entityKind === 'object' || entityKind === 'relation' || entityKind === 'type');
  SchemaValidator.validateSchema(schema);
};

const setSchemaPropertiesOnObjectCore = (core: ObjectCore, schema: Schema.Schema.AnyNoContext | undefined) => {
  if (schema != null) {
    const uri = getSchemaURI(schema);
    invariant(uri, 'Schema must be defined via TypedObject.');
    core.setType(EncodedReference.fromURI(uri));

    const kind = getEntityKind(schema);
    invariant(kind);
    core.setKind(kind);
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
    if (!isProxy(sourceRef)) {
      throw new TypeError('source must be an ECHO object');
    }
    if (!isProxy(targetRef)) {
      throw new TypeError('target must be an ECHO object');
    }

    core.setSource(EncodedReference.fromURI(EchoReactiveHandler.instance.createRef(target, sourceRef)));
    core.setTarget(EncodedReference.fromURI(EchoReactiveHandler.instance.createRef(target, targetRef)));
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
      } else if (isTypedObjectProxy(value)) {
        throw new Error('Object references must be wrapped with `Ref.make`');
      } else if ((value as any) instanceof Uint8Array) {
        // Pass binary buffers as is; Automerge stores them natively.
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
      return refToEncodedReference(target, value);
    }

    if (value instanceof Uint8Array) {
      return value;
    }

    return recurse(value);
  });
};

/**
 * Encodes any `Ref`s held in meta (e.g. `meta.tags`) to encoded references before persisting, since
 * `core.setMeta` (unlike the reactive `set` trap) does not run link assignment.
 */
const linkMetaRefs = (target: ProxyTarget, meta: EntityMeta): EntityMeta =>
  deepMapValues(meta, (value, recurse) => {
    if (Ref.isRef(value)) {
      return refToEncodedReference(target, value);
    }
    if (value instanceof Uint8Array) {
      return value;
    }
    return recurse(value);
  }) as EntityMeta;

const refToEncodedReference = (target: ProxyTarget, ref: Ref<any>): EncodedReference => {
  const savedTarget = getRefSavedTarget(ref);
  if (savedTarget) {
    return EncodedReference.fromURI(EchoReactiveHandler.instance.createRef(target, savedTarget));
  } else {
    return EncodedReference.fromURI(ref.uri);
  }
};
