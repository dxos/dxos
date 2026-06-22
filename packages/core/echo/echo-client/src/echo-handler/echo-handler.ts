//
// Copyright 2024 DXOS.org
//

import * as A from '@automerge/automerge';
import * as Schema from 'effect/Schema';
import { type InspectOptionsStylized } from 'node:util';

import { Event } from '@dxos/async';
import { type DevtoolsFormatter, devtoolsFormatter, inspectCustom } from '@dxos/debug';
import { Entity, Obj, Type } from '@dxos/echo';
import {
  DATA_NAMESPACE,
  EncodedReference,
  type EntityStructure,
  PROPERTY_ID,
  isEncodedReference,
} from '@dxos/echo-protocol';
import {
  ATTR_DELETED,
  ATTR_META,
  ATTR_RELATION_SOURCE,
  ATTR_RELATION_TARGET,
  ATTR_TYPE,
  type AnyProperties,
  ChangeId,
  EntityKind,
  EventId,
  MetaId,
  ObjectDatabaseId,
  ObjectDeletedId,
  type ObjectJSON,
  type EntityMeta,
  type EntityMetaJSON,
  EntityMetaSchema,
  ObjectVersionId,
  ParentId,
  TypeSchema,
  type ReactiveHandler,
  Ref,
  RefImpl,
  RelationSourceDXNId,
  RelationSourceId,
  RelationTargetDXNId,
  RelationTargetId,
  SchemaId,
  SchemaKindId,
  StaticTypeSchemaSlot,
  TypeEntityId,
  SchemaMetaSymbol,
  SchemaValidator,
  SelfURIId,
  TypeId,
  TypeIdentifierAnnotationId,
  assertObjectModel,
  createProxy,
  defineHiddenProperty,
  executeChange,
  type JsonSchemaType,
  getEntityKind,
  getProxyHandler,
  getProxySlot,
  getProxyTarget,
  getRefSavedTarget,
  getSchemaURI,
  getTypeAnnotation,
  isInChangeContext,
  isInstanceOf,
  isProxy,
  queueNotification,
  setRefResolver,
  symbolIsProxy,
  toEffectSchema,
} from '@dxos/echo/internal';
import { assertArgument, invariant } from '@dxos/invariant';
import { EID, EntityId, type URI } from '@dxos/keys';
import { log } from '@dxos/log';
import { deepMapValues, defaultMap, getDeep, setDeep } from '@dxos/util';

import * as Doc from '../automerge/Doc';
import { type DecodedAutomergePrimaryValue, META_NAMESPACE, ObjectCore } from '../core-db';
import { type EchoDatabase } from '../proxy-db';
import { getBody, getHeader } from './devtools-formatter';
import { EchoArray } from './echo-array';
import { getObjectCore, isEchoObject, isRootDataObject } from './echo-object-utils';
import {
  type ProxyTarget,
  TargetKey,
  getEchoDatabase,
  symbolHandler,
  symbolInternals,
  symbolNamespace,
  symbolPath,
} from './echo-proxy-target';
import { createArrayMethodError, createPropertyDeleteError, createPropertySetError } from './errors';

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

    if (isRootDataObject(target)) {
      switch (p) {
        case 'id':
        case SelfURIId:
        case Entity.KindId:
        case ParentId:
        case ChangeId:
        case RelationSourceDXNId:
        case RelationTargetDXNId:
        case RelationSourceId:
        case RelationTargetId:
        case TypeId:
        case MetaId:
        case ObjectDeletedId:
        case ObjectVersionId:
        case ObjectDatabaseId:
          return true;
      }
    }

    const { value } = this._getDecodedValueAtPath(target);
    return typeof value === 'object' ? Reflect.has(value, p) : false;
  }

  get(target: ProxyTarget, prop: string | symbol, receiver: any): any {
    invariant(Array.isArray(target[symbolPath]));

    // TODO(dmaretskyi): Move those as property descriptors on target.
    // Non reactive properties on root and nested records.
    switch (prop) {
      case symbolInternals:
        return target[symbolInternals];
      case SchemaId:
        return this.getSchema(target);
      case TypeEntityId:
        return this.getTypeEntity(target);
    }

    // Non-reactive root properties.
    if (isRootDataObject(target)) {
      switch (prop) {
        case 'id': {
          return target[symbolInternals].id;
        }
        case SelfURIId: {
          const db = getEchoDatabase(target[symbolInternals]);
          if (db) {
            return EID.make({
              spaceId: db.spaceId,
              entityId: target[symbolInternals].id,
            });
          } else {
            return EID.make({ entityId: target[symbolInternals].id });
          }
        }
        case Entity.KindId: {
          return target[symbolInternals].getKind();
        }
        case ParentId:
          return this._getParent(target);
        case ChangeId: {
          // Return a function that allows mutations within a controlled context.
          // Uses ObjectCore as context key (what mutation checks use), target for events.
          const core = target[symbolInternals];
          return (callback: (mutableObj: any) => void) => executeChange(core, target, receiver, callback);
        }
        case RelationSourceDXNId: {
          const sourceRef = target[symbolInternals].getSource();
          return sourceRef ? EncodedReference.toURI(sourceRef) : undefined;
        }
        case RelationTargetDXNId: {
          const targetRef = target[symbolInternals].getTarget();
          return targetRef ? EncodedReference.toURI(targetRef) : undefined;
        }
        case RelationSourceId: {
          return this._getRelationSource(target);
        }
        case RelationTargetId: {
          return this._getRelationTarget(target);
        }
        case TypeId:
          return this.getTypeURI(target);
        case MetaId:
          return this.getMeta(target);
        case ObjectDeletedId:
          return this.isDeleted(target);
        case ObjectVersionId:
          return this._getVersion(target);
        case ObjectDatabaseId:
          return getEchoDatabase(target[symbolInternals]);
        case SchemaKindId: {
          // Persisted Type entities are always branded `Type`; the kind they describe lives in `jsonSchema.entityKind`.
          const kind = target[symbolInternals].getKind();
          if (kind === EntityKind.Type) {
            const jsonSchemaEntityKind = (receiver as any).jsonSchema?.entityKind;
            if (jsonSchemaEntityKind != null) {
              return jsonSchemaEntityKind;
            }
          }
          return kind;
        }
        case StaticTypeSchemaSlot:
          return this._getStaticTypeSchemaSlot(target, receiver);
      }
    } else {
      switch (prop) {
        case Entity.KindId:
        case RelationSourceDXNId:
        case RelationTargetDXNId:
        case RelationSourceId:
        case RelationTargetId:
        case TypeId:
        case MetaId:
        case ObjectDeletedId:
        case ObjectDatabaseId:
        case ChangeId:
        case SchemaKindId:
        case StaticTypeSchemaSlot:
          return undefined;
      }
    }

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
          return target[symbolInternals].id;
      }
    }

    if (typeof prop === 'symbol') {
      return Reflect.get(target, prop);
    }

    if (target instanceof EchoArray) {
      return this._arrayGet(target, prop);
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

    const decodedValueAtPath = this._getDecodedValueAtPath(target, prop);
    return this._wrapInProxyIfRequired(target, decodedValueAtPath);
  }

  // TODO(burdon): arg `receiver` not used.
  set(target: ProxyTarget, prop: string | symbol, value: any, receiver: any): boolean {
    invariant(Array.isArray(target[symbolPath]));
    if (prop === ParentId) {
      if (value === undefined) {
        target[symbolInternals].setParent(undefined);
      } else {
        const objectId = value.id ?? value;
        // TODO(dmaretskyi): Validate object is from the same space.
        invariant(EntityId.isValid(objectId));
        target[symbolInternals].setParent(EncodedReference.fromURI(EID.make({ entityId: objectId })));
      }
      return true;
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
   * @returns The typename without version for static schema or object id for dynamic schema.
   */
  private _getTypename(target: ProxyTarget): URI.URI | undefined {
    const schema = this.getSchema(target);
    if (schema && typeof schema === 'object' && SchemaMetaSymbol in schema) {
      return (schema as any)[SchemaMetaSymbol].typename;
    }
    return this.getTypeURI(target);
  }

  private _getParent(target: ProxyTarget): any {
    const parentRef = target[symbolInternals].getParent();
    if (parentRef === undefined) {
      return undefined;
    }
    const parentDXN = EncodedReference.toURI(parentRef);
    const database = getEchoDatabase(target[symbolInternals]);
    if (database) {
      // TODO(dmaretskyi): Put refs into proxy cache.
      return this._resolveStrongDepFromWorkingSet(database, parentDXN);
    } else {
      invariant(target[symbolInternals].linkCache);
      const parentEchoUri = EID.tryParse(parentDXN);
      const echoUri = parentEchoUri ? EID.getEntityId(parentEchoUri) : undefined;
      invariant(echoUri);
      return target[symbolInternals].linkCache.get(echoUri);
    }
  }

  /**
   * Resolve a strong-dependency endpoint (relation source/target, parent) from the working set. The
   * endpoint is a strong dep preloaded to `ready` before its holder surfaces, so the synchronous
   * working-set probe succeeds — including for feed-queue and cross-space endpoints.
   */
  private _resolveStrongDepFromWorkingSet(database: EchoDatabase, uri: URI.URI): any {
    const request = database.graph
      .createRefResolver({ context: { space: database.spaceId } })
      .resolve(uri, { source: 'working-set' });
    const result = request.getResult();
    request.abort();
    return result;
  }

  private _getRelationSource(target: ProxyTarget): any {
    const sourceRef = target[symbolInternals].getSource();
    invariant(sourceRef);
    const sourceDXN = EncodedReference.toURI(sourceRef);
    const database = getEchoDatabase(target[symbolInternals]);
    if (database) {
      // TODO(dmaretskyi): Put refs into proxy cache.
      return this._resolveStrongDepFromWorkingSet(database, sourceDXN);
    } else {
      invariant(target[symbolInternals].linkCache);
      const sourceEchoId = EID.tryParse(sourceDXN);
      const echoUri = sourceEchoId ? EID.getEntityId(sourceEchoId) : undefined;
      invariant(echoUri);
      return target[symbolInternals].linkCache.get(echoUri);
    }
  }

  private _getRelationTarget(target: ProxyTarget): any {
    const targetRef = target[symbolInternals].getTarget();
    invariant(targetRef);
    const targetDXN = EncodedReference.toURI(targetRef);
    const database = getEchoDatabase(target[symbolInternals]);
    if (database) {
      return this._resolveStrongDepFromWorkingSet(database, targetDXN);
    } else {
      invariant(target[symbolInternals].linkCache);
      const targetEchoId = EID.tryParse(targetDXN);
      const echoUri = targetEchoId ? EID.getEntityId(targetEchoId) : undefined;
      invariant(echoUri);
      return target[symbolInternals].linkCache.get(echoUri);
    }
  }

  /**
   * Lazily rebuilds the Effect Schema from the entity's `jsonSchema` and caches it on internals.
   * Lets persisted Type entities structurally satisfy `Type<A>` via the proxy `get` trap.
   */
  private _getStaticTypeSchemaSlot(target: ProxyTarget, receiver: any): Schema.Schema.AnyNoContext | undefined {
    if (target[symbolInternals].getKind() !== EntityKind.Type) {
      return undefined;
    }
    const cached = target[symbolInternals].cachedStaticSlot;
    if (cached != null) {
      return cached;
    }
    const jsonSchema = (receiver as { jsonSchema?: JsonSchemaType }).jsonSchema;
    if (jsonSchema == null) {
      return undefined;
    }
    // Attach the `echo:/<id>` identifier so the cached schema matches the
    // uncached fallback in `Type.getSchema` (which annotates the rebuilt schema
    // with the same `TypeIdentifierAnnotation`); otherwise the cached path would
    // silently drop the URI annotation.
    const rebuilt = toEffectSchema(jsonSchema).annotations({
      [TypeIdentifierAnnotationId]: EID.make({ entityId: target[symbolInternals].id }),
    });
    target[symbolInternals].cachedStaticSlot = rebuilt;
    return rebuilt;
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
      return this._handleStoredSchema(target, decoded);
    }
    if (isEncodedReference(decoded)) {
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
        (): ProxyTarget => ({
          [symbolInternals]: target[symbolInternals],
          [symbolPath]: dataPath,
          [symbolNamespace]: namespace,
          [EventId]: new Event(),
        }),
      );

      return createProxy(newTarget, this);
    }

    return decoded;
  }

  private _handleStoredSchema(target: ProxyTarget, object: any): any {
    // Stored schemas surface through the database schema registry so consumers
    // see the registered Type.Type entity rather than the raw persisted object.
    // Only *persisted* (db-backed) stored schemas need registration; a type
    // entity resolved directly from the registry (e.g. a DXN ref to an in-memory
    // declaration) is already canonical and passes through unchanged.
    const database = getEchoDatabase(target[symbolInternals]);
    if (database && isInstanceOf(TypeSchema, object) && Type.getDatabase(object) != null) {
      return database._getOrRegisterPersistentSchema(object);
    }

    return object;
  }

  private _getDecodedValueAtPath(target: ProxyTarget, prop?: string): DecodedValueAtPath {
    const dataPath = [...target[symbolPath]];
    if (prop != null) {
      dataPath.push(prop);
    }
    const fullPath = [getNamespace(target), ...dataPath];
    const value: any = target[symbolInternals].getDecoded(fullPath);
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

  private _validateValue(target: ProxyTarget, path: Doc.KeyPath, value: any): any {
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
    if (propertySchema == null) {
      return value;
    }

    const _ = Schema.asserts(propertySchema)(value);
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

  /**
   * Resolve the source `Type.Type` entity (Obj/Relation/Type-kind) for an
   * instance. Returns the actual entity (not just its schema) so callers using
   * `Obj.getType` / `Entity.getType` see a stable entity-shaped value.
   */
  getTypeEntity(target: ProxyTarget): Type.AnyEntity | undefined {
    if (target[symbolNamespace] === META_NAMESPACE) {
      return undefined;
    }
    const database = getEchoDatabase(target[symbolInternals]);
    if (!target[symbolInternals] || !database) {
      return target[symbolInternals]?.rootSchema;
    }
    const typeRef = target[symbolInternals].getType();
    if (typeRef == null) {
      return undefined;
    }
    const typeURI = EncodedReference.toURI(typeRef);
    const registry = database.graph.registry;
    // Look up by the raw typeURI string — the registry normalises DXN forms.
    const fromRegistry = registry.getByURI(typeURI);
    if (fromRegistry != null && Type.isType(fromRegistry)) {
      return fromRegistry;
    }

    // Echo identifier (echo://spaceId/objectId or echo:/<objectId>) — load the
    // PersistentSchema on demand (handles preloadSchemaOnOpen=false or schema added after open).
    const echoUri = EID.tryParse(typeURI);
    if (echoUri) {
      const echoId = EID.getEntityId(echoUri);
      if (echoId != null) {
        const schemaObject = database.getObjectById(echoId);
        if (schemaObject != null && isInstanceOf(TypeSchema, schemaObject)) {
          return database._getOrRegisterPersistentSchema(schemaObject);
        }
      }
    }

    return undefined;
  }

  getSchema(target: ProxyTarget): Schema.Schema.AnyNoContext | undefined {
    if (target[symbolNamespace] === META_NAMESPACE) {
      // TODO(dmaretskyi): Breaks tests.
      // if (target[symbolPath].length !== 0) {
      //   // TODO(dmaretskyi): pluck from EntityMetaSchema.
      //   return undefined;
      // }
      return EntityMetaSchema;
    }

    // TODO(y): Make reactive.
    // TODO(burdon): May not be attached to database yet.
    const database = getEchoDatabase(target[symbolInternals]);
    if (!database) {
      // For objects created by `createObject` outside of the database.
      const root = target[symbolInternals].rootSchema;
      return root != null ? Type.getSchema(root) : undefined;
    }

    const typeRef = target[symbolInternals].getType();
    if (typeRef == null) {
      return undefined;
    }

    const typeURI = EncodedReference.toURI(typeRef);

    // Skip protobuf types as they are runtime registered types.
    if (typeURI.startsWith('dxn:protobuf')) {
      return undefined;
    }

    const fromRegistry = database.graph.registry.getByURI(typeURI);
    if (fromRegistry != null && Type.isType(fromRegistry)) {
      return Type.getSchema(fromRegistry);
    }

    // Echo identifier (echo://spaceId/objectId or echo:/<objectId>) — load the
    // PersistentSchema on demand (handles preloadSchemaOnOpen=false or schema added after open).
    const echoUri = EID.tryParse(typeURI);
    if (echoUri != null) {
      const echoId = EID.getEntityId(echoUri);
      if (echoId != null) {
        const schemaObject = database.getObjectById(echoId);
        if (schemaObject != null && isInstanceOf(TypeSchema, schemaObject)) {
          const typeEntity = database._getOrRegisterPersistentSchema(schemaObject);
          return Type.getSchema(typeEntity);
        }
      }
    }

    return undefined;
  }

  getTypeURI(target: ProxyTarget): URI.URI | undefined {
    if (target[symbolNamespace] !== DATA_NAMESPACE) {
      return undefined;
    }
    const typeRef = target[symbolInternals].getType();
    return typeRef ? EncodedReference.toURI(typeRef) : undefined;
  }

  isDeleted(target: any): boolean {
    return target[symbolInternals].isDeleted();
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

  /**
   * Check if array mutation is allowed (inside a change context).
   */
  private _checkArrayMutationAllowed(target: ProxyTarget, method: string): void {
    const core = target[symbolInternals];
    if (!isInChangeContext(core)) {
      throw createArrayMethodError(method);
    }
  }

  getMeta(target: ProxyTarget): EntityMeta {
    // TODO(dmaretskyi): Reuse meta target.
    const metaTarget: ProxyTarget = {
      [symbolInternals]: target[symbolInternals],
      [symbolPath]: [],
      [symbolNamespace]: META_NAMESPACE,
      [EventId]: new Event(),
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
  createRef(target: ProxyTarget, proxy: any): URI.URI {
    let otherEchoObj = proxy;

    // Honour a Queue URI carried by the source. Queue-decoded objects (returned by
    // `Feed.runQuery` / `queue.queryObjects`) have a `SelfURIId` annotation set directly
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
   * Lookup referenced object.
   */
  lookupRef(target: ProxyTarget, encodedRef: EncodedReference): Ref<any> | undefined {
    const dxn = EncodedReference.toURI(encodedRef);
    const database = getEchoDatabase(target[symbolInternals]);
    if (database) {
      // TODO(dmaretskyi): Put refs into proxy cache.
      const refImpl = new RefImpl(dxn);
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
      const parsedEchoUri = EID.tryParse(dxn);
      const objectId = parsedEchoUri ? EID.getEntityId(parsedEchoUri) : undefined;
      invariant(objectId, 'Invalid DXN');
      return new RefImpl(dxn, this._handleStoredSchema(target, target[symbolInternals].linkCache.get(objectId)));
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
    const handler = this[symbolHandler] as EchoReactiveHandler;
    const typename = handler._getTypename(this);
    const isRelation = this[symbolInternals].getKind() === EntityKind.Relation;

    const isTyped = !!this[symbolInternals].getType();
    const reified = handler._getReified(this);
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

  private _getVersion(target: ProxyTarget): Obj.Version {
    const accessor = target[symbolInternals].getDocAccessor();
    const doc = accessor.handle.doc();
    invariant(doc);
    const heads = A.getHeads(doc);
    return {
      [Obj.VersionTypeId]: Obj.VersionTypeId,
      versioned: true,
      automergeHeads: heads,
    };
  }

  // TODO(dmaretskyi): Re-use existing json serializer.
  private _toJSON(target: ProxyTarget): ObjectJSON {
    const typeRef = target[symbolInternals].getType();
    const reified = this._getReified(target);

    const obj: Partial<ObjectJSON> = {
      id: target[symbolInternals].id,
      [ATTR_TYPE]: typeRef ? EncodedReference.toURI(typeRef) : undefined,
      // Codec boundary: meta holds live refs in `tags`; they serialize to encoded references via
      // each ref's `toJSON`. Typed as the JSON meta shape.
      [ATTR_META]: compactMeta(this.getMeta(target)) as unknown as EntityMetaJSON,
    };

    if (target[symbolInternals].isDeleted()) {
      obj[ATTR_DELETED] = true;
    }

    const sourceRef = target[symbolInternals].getSource();
    if (sourceRef) {
      obj[ATTR_RELATION_SOURCE] = EID.tryParse(EncodedReference.toURI(sourceRef));
    }
    const targetRef = target[symbolInternals].getTarget();
    if (targetRef) {
      obj[ATTR_RELATION_TARGET] = EID.tryParse(EncodedReference.toURI(targetRef));
    }

    Object.assign(
      obj,
      deepMapValues(reified, (value, recurse) => {
        // EncodedReference values are already in the correct format for JSON serialization.
        if (isEncodedReference(value)) {
          return value;
        }
        if (value instanceof Uint8Array) {
          return value;
        }
        return recurse(value);
      }),
    );

    return obj as ObjectJSON;
  }

  private _getReified(target: ProxyTarget): any {
    const dataPath = [...target[symbolPath]];
    const fullPath = [getNamespace(target), ...dataPath];
    return target[symbolInternals].getDecoded(fullPath);
  }

  private _getDevtoolsFormatter(target: ProxyTarget): DevtoolsFormatter {
    const schema = this.getSchema(target);
    const typename = schema ? getTypeAnnotation(schema)?.typename : undefined;

    return {
      header: (config?: any) => getHeader(typename ?? 'EchoObjectSchema', target[symbolInternals].id, config),
      hasBody: () => true,
      body: () => {
        let data = deepMapValues(this._getReified(target), (value, recurse) => {
          if (isEncodedReference(value)) {
            return this.lookupRef(target, value);
          }
          if (value instanceof Uint8Array) {
            return value;
          }

          return recurse(value);
        });
        if (isRootDataObject(target)) {
          // TODO(dmaretskyi): Extract & reuse.
          const metaTarget: ProxyTarget = {
            [symbolInternals]: target[symbolInternals],
            [symbolPath]: [],
            [symbolNamespace]: META_NAMESPACE,
            [EventId]: new Event(),
          };
          const metaReified = this._getReified(metaTarget);
          const typeURI = this.getTypeURI(target);

          data = {
            id: target[symbolInternals].id,
            '@type': typeURI,
            '@meta': metaReified,
            ...data,
            '[[Schema]]': this.getSchema(target),
            '[[Core]]': target[symbolInternals],
          };
        }

        return getBody(data);
      },
    };
  }
}

export const throwIfCustomClass = (prop: Doc.KeyPath[number], value: any) => {
  if (value == null || Array.isArray(value) || Ref.isRef(value) || value instanceof Uint8Array) {
    return;
  }

  const proto = Object.getPrototypeOf(value);
  if (typeof value === 'object' && proto !== Object.prototype) {
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
    target[symbolInternals] = core;
    target[symbolInternals].rootSchema = type;
    target[symbolPath] = [];
    target[symbolNamespace] = DATA_NAMESPACE;
    slot.handler._proxyMap.set(target, obj);

    target[symbolInternals].subscriptions.push(
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

    return obj as CreateObjectReturn<T>;
  } else {
    const target: ProxyTarget = {
      [symbolInternals]: core,
      [symbolPath]: [],
      [symbolNamespace]: DATA_NAMESPACE,
      [EventId]: new Event(),
      ...(obj as any),
    };
    target[symbolInternals].rootSchema = type;
    target[symbolInternals].subscriptions.push(
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

/**
 * Drops empty `tags`/`annotations` from serialized meta to keep JSON output minimal (matching the
 * typed-handler serializer); `objectFromJSON` backfills the defaults on read.
 */
const compactMeta = (meta: EntityMeta): Partial<EntityMeta> => {
  const { tags, annotations, ...rest } = meta;
  return {
    ...rest,
    ...(tags != null && tags.length > 0 ? { tags } : {}),
    ...(annotations != null && Object.keys(annotations).length > 0 ? { annotations } : {}),
  };
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
  const target: ProxyTarget = {
    [symbolInternals]: core,
    [symbolPath]: [],
    [symbolNamespace]: DATA_NAMESPACE,
    [EventId]: new Event(),
  };

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
