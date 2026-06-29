//
// Copyright 2026 DXOS.org
//

//
// Object layering for a database-backed ECHO object (the `EchoReactiveHandler`).
//
// What the consumer holds is a Proxy; everything below is its target's prototype chain:
//
//   proxy ──Proxy(target, ProxyHandlerSlot → EchoReactiveHandler)
//     │         the handler's get/set/has/... traps run here
//     ▼
//   target            a CLEAN, empty object (`{}`). User data is NOT stored here — it is
//     │ [[Prototype]] virtual, decoded on demand from the Automerge document via `ObjectCore`.
//     ▼
//   instanceState     per-object, created by `createInstanceState`. Hidden (non-enumerable) data
//     │ [[Prototype]] properties: [symbolInternals]=ObjectCore, [symbolNamespace], [symbolPath],
//     │               [EventId]. Swapping the handler that backs an object = re-pointing the
//     │               target at a fresh instanceState (`adoptInstanceState`) — identity preserved.
//     ▼
//   EchoRoot.prototype | EchoRecord.prototype   shared behaviour (one per class, not per object).
//     │ [[Prototype]] Carries the ECHO system surface as accessors/methods: `id`, [SchemaId],
//     │               [TypeId], [MetaId], [ParentId], [ChangeId], toJSON, ... A root object's
//     │               prototype is EchoRoot (the larger surface, incl. EchoRecord's via `extends`);
//     │               nested/meta records get the EchoRecord base. This replaces the old
//     │               `isRootDataObject(target)` branching in the traps.
//     ▼
//   Object.prototype ──▶ null     ordinary class-prototype termination. The get/has traps use
//                     `Reflect.has(target, prop)` to split "system property" (present on the chain
//                     → delegate to the accessor) from "virtual user data" (absent → read from the
//                     document). Object.prototype members (`toString`, `hasOwnProperty`, ...) are
//                     therefore treated as system and resolve to their normal implementations,
//                     which is exactly how a plain object behaves — and a `getPrototypeOf` trap
//                     reports `Object.prototype` so consumers do observe a plain object. (Practical
//                     consequence: a user-data field literally named `toString` would be shadowed,
//                     same as on a plain `{}`.)
//
// `this` inside the accessors/methods below:
//   - Reached THROUGH the proxy (the common case): the get trap calls
//     `Reflect.get(target, prop, receiver)`, so `this` === the PROXY (the receiver).
//   - Reached on the RAW target directly (e.g. internal code holding the unwrapped target):
//     `this` === the raw target.
//   Both resolve `this[symbolInternals]` (and the other hidden props) the same way, through the
//   shared instanceState on the prototype chain, so accessors that only read `[symbolInternals]`
//   are agnostic. Accessors that need the underlying object *identity* — e.g. `[ChangeId]`
//   (which keys the change context by the raw target) or `set [ParentId]` — normalize with
//   `rawTarget(this)` and keep `this` as the receiver for any re-entrant reads.
//

import * as A from '@automerge/automerge';
import * as Schema from 'effect/Schema';

import { Event } from '@dxos/async';
import { type DevtoolsFormatter, devtoolsFormatter } from '@dxos/debug';
import { Entity, Obj, Type } from '@dxos/echo';
import { DATA_NAMESPACE, EncodedReference, isEncodedReference } from '@dxos/echo-protocol';
import {
  ATTR_DELETED,
  ATTR_META,
  ATTR_RELATION_SOURCE,
  ATTR_RELATION_TARGET,
  ATTR_TYPE,
  ChangeId,
  EntityKind,
  type EntityMeta,
  type EntityMetaJSON,
  EntityMetaSchema,
  EventId,
  type JsonSchemaType,
  MetaId,
  ObjectDatabaseId,
  ObjectDeletedId,
  type ObjectJSON,
  ObjectVersionId,
  ParentId,
  type Ref,
  RefImpl,
  RelationSourceDXNId,
  RelationSourceId,
  RelationTargetDXNId,
  RelationTargetId,
  SchemaId,
  SchemaKindId,
  SchemaMetaSymbol,
  SelfURIId,
  StaticTypeSchemaSlot,
  TypeEntityId,
  TypeId,
  TypeIdentifierAnnotationId,
  TypeSchema,
  createProxy,
  defineHiddenProperty,
  executeChange,
  getProxyHandler,
  getProxyTarget,
  getTypeAnnotation,
  isInstanceOf,
  isProxy,
  setRefResolver,
  toEffectSchema,
} from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';
import { EID, EntityId, type URI } from '@dxos/keys';
import { deepMapValues } from '@dxos/util';

import * as Doc from '../automerge/Doc';
import { type ObjectCore } from '../core-db';
import { type EchoDatabase } from '../proxy-db';
import { getBody, getHeader } from './devtools-formatter';
import { type ProxyTarget, getEchoDatabase, symbolInternals, symbolNamespace, symbolPath } from './echo-proxy-target';

const META_NAMESPACE = 'meta';

// The behaviour prototypes below carry the ECHO system surface as typed
// accessors/methods. `this` is the proxy target (or the proxy receiver, when
// reached through a trap); both resolve `[symbolInternals]` to the backing
// `ObjectCore` via the prototype chain. Methods read state off `this` and
// delegate the larger read paths to the free functions below — which are shared
// with the handler's data-path traps, so the implementation has a single home.

//
// Free functions (the implementation, operating on a proxy target).
//

const getNamespace = (target: ProxyTarget): string => target[symbolNamespace];

/** Recover the raw target from a receiver (the proxy when reached through a trap). */
const rawTarget = (self: ProxyTarget): ProxyTarget => (isProxy(self) ? getProxyTarget(self) : self);

export const getDecodedValueAtPath = (target: ProxyTarget, prop?: string): DecodedValueAtPath => {
  const dataPath = [...target[symbolPath]];
  if (prop != null) {
    dataPath.push(prop);
  }
  const fullPath = [getNamespace(target), ...dataPath];
  const value: any = target[symbolInternals].getDecoded(fullPath);
  return { namespace: getNamespace(target), value, dataPath };
};

export const getReified = (target: ProxyTarget): any => {
  const fullPath = [getNamespace(target), ...target[symbolPath]];
  return target[symbolInternals].getDecoded(fullPath);
};

export const getSchema = (target: ProxyTarget): Schema.Schema.AnyNoContext | undefined => {
  if (target[symbolNamespace] === META_NAMESPACE) {
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
};

/**
 * Resolve the source `Type.Type` entity (Obj/Relation/Type-kind) for an instance.
 * Returns the actual entity (not just its schema) so callers using `Obj.getType` /
 * `Entity.getType` see a stable entity-shaped value.
 */
export const getTypeEntity = (target: ProxyTarget): Type.AnyEntity | undefined => {
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
  const fromRegistry = registry.getByURI(typeURI);
  if (fromRegistry != null && Type.isType(fromRegistry)) {
    return fromRegistry;
  }

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
};

export const getTypeURI = (target: ProxyTarget): URI.URI | undefined => {
  if (target[symbolNamespace] !== DATA_NAMESPACE) {
    return undefined;
  }
  const typeRef = target[symbolInternals].getType();
  return typeRef ? EncodedReference.toURI(typeRef) : undefined;
};

/** Typename without version for static schema, or object id for dynamic schema. */
export const getTypename = (target: ProxyTarget): URI.URI | undefined => {
  const schema = getSchema(target);
  if (schema && typeof schema === 'object' && SchemaMetaSymbol in schema) {
    return (schema as any)[SchemaMetaSymbol].typename;
  }
  return getTypeURI(target);
};

/**
 * Resolve a strong-dependency endpoint (relation source/target, parent) from the working set. The
 * endpoint is a strong dep preloaded to `ready` before its holder surfaces, so the synchronous
 * working-set probe succeeds — including for feed-queue and cross-space endpoints.
 */
const resolveStrongDepFromWorkingSet = (database: EchoDatabase, uri: URI.URI): any => {
  const request = database.graph.createRefResolver({ context: { space: database.spaceId } }).resolve(uri, {
    source: 'working-set',
  });
  const result = request.getResult();
  request.abort();
  return result;
};

/**
 * Resolve a strong-dependency endpoint (relation source/target, parent) referenced by `ref`:
 * via the database working set once bound, or the object's local link cache beforehand.
 */
const resolveEndpoint = (core: ObjectCore, ref: EncodedReference): any => {
  const database = getEchoDatabase(core);
  return database ? resolveStrongDepFromWorkingSet(database, EncodedReference.toURI(ref)) : core.lookupInLinkCache(ref);
};

export const getParent = (target: ProxyTarget): any => {
  const parentRef = target[symbolInternals].getParent();
  return parentRef === undefined ? undefined : resolveEndpoint(target[symbolInternals], parentRef);
};

export const setParent = (target: ProxyTarget, value: any): void => {
  if (value === undefined) {
    target[symbolInternals].setParent(undefined);
  } else {
    const objectId = value.id ?? value;
    // TODO(dmaretskyi): Validate object is from the same space.
    invariant(EntityId.isValid(objectId));
    target[symbolInternals].setParent(EncodedReference.fromURI(EID.make({ entityId: objectId })));
  }
};

export const getRelationSource = (target: ProxyTarget): any => {
  const sourceRef = target[symbolInternals].getSource();
  invariant(sourceRef);
  return resolveEndpoint(target[symbolInternals], sourceRef);
};

export const getRelationTarget = (target: ProxyTarget): any => {
  const targetRef = target[symbolInternals].getTarget();
  invariant(targetRef);
  return resolveEndpoint(target[symbolInternals], targetRef);
};

/**
 * Entity kind exposed via `[SchemaKindId]`. Persisted Type entities are always
 * branded `Type`; the kind they describe lives in `jsonSchema.entityKind`.
 */
const getSchemaKind = (target: ProxyTarget, receiver: any): EntityKind | undefined => {
  const kind = target[symbolInternals].getKind();
  if (kind === EntityKind.Type) {
    const jsonSchemaEntityKind = (receiver as any).jsonSchema?.entityKind;
    if (jsonSchemaEntityKind != null) {
      return jsonSchemaEntityKind;
    }
  }
  return kind;
};

/**
 * Lazily rebuilds the Effect Schema from the entity's `jsonSchema` and caches it on internals.
 * Lets persisted Type entities structurally satisfy `Type<A>` via the proxy `get` trap.
 */
const getStaticTypeSchemaSlot = (target: ProxyTarget, receiver: any): Schema.Schema.AnyNoContext | undefined => {
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
  const rebuilt = toEffectSchema(jsonSchema).annotations({
    [TypeIdentifierAnnotationId]: EID.make({ entityId: target[symbolInternals].id }),
  });
  target[symbolInternals].cachedStaticSlot = rebuilt;
  return rebuilt;
};

export const getVersion = (target: ProxyTarget): Obj.Version => {
  const accessor = target[symbolInternals].getDocAccessor();
  const doc = accessor.handle.doc();
  invariant(doc);
  const heads = A.getHeads(doc);
  return {
    [Obj.VersionTypeId]: Obj.VersionTypeId,
    versioned: true,
    automergeHeads: heads,
  };
};

/** The meta sub-proxy for the object. `self` is the proxy (its handler backs the meta proxy). */
const getMeta = (self: ProxyTarget): EntityMeta => {
  const target = rawTarget(self);
  // Reuse the root target's event so subscribers of the meta proxy are notified: the central
  // `core.updates` subscription emits on the root's event only (see the nested-record path).
  const metaTarget = createRecordTarget(
    createInstanceState(target[symbolInternals], META_NAMESPACE, [], { event: target[EventId] }),
  );
  return createProxy(metaTarget, getProxyHandler(self)) as any;
};

/**
 * Stored schemas surface through the database schema registry so consumers see the registered
 * `Type.Type` entity rather than the raw persisted object. Only *persisted* (db-backed) stored
 * schemas need registration; an entity resolved directly from the registry passes through unchanged.
 */
export const handleStoredSchema = (target: ProxyTarget, object: any): any => {
  const database = getEchoDatabase(target[symbolInternals]);
  if (database && isInstanceOf(TypeSchema, object) && Type.getDatabase(object) != null) {
    return database._getOrRegisterPersistentSchema(object);
  }
  return object;
};

export const lookupRef = (target: ProxyTarget, encodedRef: EncodedReference): Ref<any> | undefined => {
  const dxn = EncodedReference.toURI(encodedRef);
  const database = getEchoDatabase(target[symbolInternals]);
  if (database) {
    const refImpl = new RefImpl(dxn);
    // The resolver materializes persisted schema objects into their registered `Type.Type` entity.
    setRefResolver(refImpl, database.graph.createRefResolver({ context: { space: database.spaceId } }));
    return refImpl;
  } else {
    invariant(target[symbolInternals].linkCache);
    const parsedEchoUri = EID.tryParse(dxn);
    const objectId = parsedEchoUri ? EID.getEntityId(parsedEchoUri) : undefined;
    invariant(objectId, 'Invalid DXN');
    return new RefImpl(dxn, handleStoredSchema(target, target[symbolInternals].linkCache.get(objectId)));
  }
};

const compactMeta = (meta: EntityMeta): Partial<EntityMeta> => {
  const { tags, annotations, ...rest } = meta;
  return {
    ...rest,
    ...(tags != null && tags.length > 0 ? { tags } : {}),
    ...(annotations != null && Object.keys(annotations).length > 0 ? { annotations } : {}),
  };
};

// TODO(dmaretskyi): Re-use existing json serializer.
const toJSON = (self: ProxyTarget): ObjectJSON => {
  const target = rawTarget(self);
  const typeRef = target[symbolInternals].getType();
  const reified = getReified(target);

  const obj: Partial<ObjectJSON> = {
    id: target[symbolInternals].id,
    [ATTR_TYPE]: typeRef ? EncodedReference.toURI(typeRef) : undefined,
    // Codec boundary: meta holds live refs in `tags`; they serialize to encoded references via
    // each ref's `toJSON`. Typed as the JSON meta shape.
    [ATTR_META]: compactMeta(getMeta(self)) as unknown as EntityMetaJSON,
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
};

export const getDevtoolsFormatter = (target: ProxyTarget): DevtoolsFormatter => {
  const schema = getSchema(target);
  const typename = schema ? getTypeAnnotation(schema)?.typename : undefined;

  return {
    header: (config?: any) => getHeader(typename ?? 'EchoObjectSchema', target[symbolInternals].id, config),
    hasBody: () => true,
    body: () => {
      let data = deepMapValues(getReified(target), (value, recurse) => {
        if (isEncodedReference(value)) {
          return lookupRef(target, value);
        }
        if (value instanceof Uint8Array) {
          return value;
        }
        return recurse(value);
      });
      if (isRootDataObject(target)) {
        const metaTarget = createRecordTarget(createInstanceState(target[symbolInternals], META_NAMESPACE, []));
        const metaReified = getReified(metaTarget);
        const typeURI = getTypeURI(target);

        data = {
          id: target[symbolInternals].id,
          '@type': typeURI,
          '@meta': metaReified,
          ...data,
          '[[Schema]]': getSchema(target),
          '[[Core]]': target[symbolInternals],
        };
      }

      return getBody(data);
    },
  };
};

const isRootDataObject = (target: ProxyTarget): boolean =>
  target[symbolNamespace] === DATA_NAMESPACE && target[symbolPath].length === 0;

//
// Behaviour prototypes (typed classes whose `.prototype` is shared by every proxy target).
//

/**
 * Behaviour prototype shared by every ECHO data record (root, nested and meta).
 *
 * The fields below are `declare`d (type-only, not materialized): they describe the hidden
 * properties that live on each object's `instanceState` (one prototype hop down), so that `this`
 * inside the accessors is typed with `[symbolInternals]` etc. At runtime `this` is the PROXY when
 * an accessor is reached through the get trap (`Reflect.get(target, prop, receiver)` → `this` ===
 * receiver), or the raw target when read directly; either way `this[symbolInternals]` resolves to
 * the same `ObjectCore` via the chain. See the layering diagram at the top of this file.
 */
export class EchoRecord {
  declare readonly [symbolInternals]: ObjectCore;
  declare readonly [symbolNamespace]: string;
  declare readonly [symbolPath]: Doc.KeyPath;
  declare readonly [EventId]: Event<void>;

  // This class is never instantiated: it exists only so its `.prototype` can back proxy
  // targets via `setPrototypeOf`. `protected` (rather than `private`) so {@link EchoRoot}
  // can still extend it.
  protected constructor() {
    throw new Error('EchoRecord is a behaviour prototype and must not be instantiated.');
  }

  get [SchemaId](): Schema.Schema.AnyNoContext | undefined {
    return getSchema(this);
  }

  get [TypeEntityId](): Type.AnyEntity | undefined {
    return getTypeEntity(this);
  }

  get [devtoolsFormatter](): DevtoolsFormatter {
    return getDevtoolsFormatter(this);
  }
}

/**
 * Behaviour prototype for root ECHO data objects. The extra members here are the
 * reason a root object structurally differs from a nested record — replacing the
 * former `isRootDataObject(target)` branching in the `get`/`has` traps.
 */
export class EchoRoot extends EchoRecord {
  // Never instantiated; see {@link EchoRecord}. The `super()` call reaches the base's
  // throwing constructor, so any `new EchoRoot()` fails.
  private constructor() {
    super();
  }

  get id(): string {
    return this[symbolInternals].id;
  }

  get [SelfURIId](): URI.URI {
    const core = this[symbolInternals];
    const database = getEchoDatabase(core);
    return database ? EID.make({ spaceId: database.spaceId, entityId: core.id }) : EID.make({ entityId: core.id });
  }

  get [Entity.KindId](): EntityKind {
    return this[symbolInternals].getKind();
  }

  get [ParentId](): any {
    return getParent(this);
  }

  set [ParentId](value: any) {
    // `this` is the proxy when set through the trap; `setParent` writes the parent ref onto the
    // raw target's core, so normalize to the raw target first.
    setParent(rawTarget(this), value);
  }

  get [ChangeId](): (callback: (mutableObj: any) => void) => void {
    // `executeChange` keys the change context by the raw target (object identity) and emits on it,
    // but re-applies mutations through the proxy `receiver`. So capture both: the raw target
    // (`rawTarget(this)`) as the context key, and `this` (the proxy, when reached via the trap) as
    // the receiver.
    const core = this[symbolInternals];
    const target = rawTarget(this);
    const receiver = this;
    return (callback: (mutableObj: any) => void) => executeChange(core, target, receiver, callback);
  }

  get [RelationSourceDXNId](): URI.URI | undefined {
    const sourceRef = this[symbolInternals].getSource();
    return sourceRef ? EncodedReference.toURI(sourceRef) : undefined;
  }

  get [RelationTargetDXNId](): URI.URI | undefined {
    const targetRef = this[symbolInternals].getTarget();
    return targetRef ? EncodedReference.toURI(targetRef) : undefined;
  }

  get [RelationSourceId](): any {
    return getRelationSource(this);
  }

  get [RelationTargetId](): any {
    return getRelationTarget(this);
  }

  get [TypeId](): URI.URI | undefined {
    return getTypeURI(this);
  }

  get [MetaId](): EntityMeta {
    return getMeta(this);
  }

  get [ObjectDeletedId](): boolean {
    return this[symbolInternals].isDeleted();
  }

  get [ObjectVersionId](): Obj.Version {
    return getVersion(this);
  }

  get [ObjectDatabaseId](): EchoDatabase | undefined {
    return getEchoDatabase(this[symbolInternals]);
  }

  get [SchemaKindId](): EntityKind | undefined {
    return getSchemaKind(this, this);
  }

  get [StaticTypeSchemaSlot](): Schema.Schema.AnyNoContext | undefined {
    return getStaticTypeSchemaSlot(this, this);
  }

  toJSON(): ObjectJSON {
    return toJSON(this);
  }
}

const EchoRecordPrototype: object = EchoRecord.prototype;
const EchoRootPrototype: object = EchoRoot.prototype;

//
// Instance state and target construction.
//

/**
 * Build the per-object `instanceState` object that sits between the (clean) proxy
 * target and the shared behaviour prototype. It holds the handler's per-object
 * state as hidden data properties; swapping the handler that backs an object is a
 * matter of pointing the target's prototype at a fresh `instanceState`.
 */
export const createInstanceState = (
  core: ObjectCore,
  namespace: string,
  path: Doc.KeyPath,
  options?: { event?: Event<void> },
): ProxyTarget => {
  const root = namespace === DATA_NAMESPACE && path.length === 0;
  const state = Object.create(root ? EchoRootPrototype : EchoRecordPrototype) as ProxyTarget;
  defineHiddenProperty(state, symbolInternals, core);
  defineHiddenProperty(state, symbolNamespace, namespace);
  defineHiddenProperty(state, symbolPath, path);
  defineHiddenProperty(state, EventId, options?.event ?? new Event());
  return state;
};

/**
 * Build a clean proxy target whose prototype chain carries the ECHO system surface.
 * User data is virtual (Automerge-backed) and never lives on the target; `initialData`
 * is only used transiently by `createObject` to seed the new object before the data is
 * migrated into the document and the keys are cleared.
 */
export const createRecordTarget = (state: ProxyTarget, initialData?: object): ProxyTarget => {
  const target = (initialData ? { ...initialData } : {}) as ProxyTarget;
  Object.setPrototypeOf(target, state);
  return target;
};

/**
 * Re-point an existing target at a fresh `instanceState`, used when a proxy's handler is
 * swapped (e.g. an in-memory typed object becoming database-backed) without changing identity.
 */
export const adoptInstanceState = (target: ProxyTarget, state: ProxyTarget): void => {
  Object.setPrototypeOf(target, state);
};

/**
 * Keys that the ECHO behaviour prototypes answer via accessors. A target carrying any of
 * these as own properties would shadow the accessor, so they are stripped after a handler
 * swap once their values have been migrated into the document.
 *
 * `RelationSourceId`/`RelationTargetId` are excluded: they hold the raw endpoint proxies
 * passed to `Relation.make`, which `EchoDatabase.add` re-reads off the target (via
 * `rebindRelationEndpoints`) *after* `createObject` to re-stamp the stored refs once the
 * database (and thus space) is known. They are creation-handoff data, like `[ParentId]`.
 */
const SYSTEM_KEYS: ReadonlyArray<string | symbol> = [
  ...Reflect.ownKeys(EchoRootPrototype),
  ...Reflect.ownKeys(EchoRecordPrototype),
].filter((key) => key !== 'constructor' && key !== RelationSourceId && key !== RelationTargetId);

/**
 * Remove own properties left behind by a previous handler that would shadow the ECHO system
 * accessors. Internal infrastructure (`symbolInternals`, `EventId`, ...) and user data are preserved.
 */
export const stripShadowingProperties = (target: ProxyTarget): void => {
  for (const key of SYSTEM_KEYS) {
    if (Object.prototype.hasOwnProperty.call(target, key)) {
      delete (target as any)[key];
    }
  }
};

type DecodedValueAtPath = {
  namespace: string;
  value: any;
  dataPath: Doc.KeyPath;
};
