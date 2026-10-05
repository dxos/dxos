//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { raise } from '@dxos/debug';
import type { ForeignKey } from '@dxos/echo-protocol';
import { SchemaEx } from '@dxos/effect';
import { assertArgument, invariant } from '@dxos/invariant';
import { DXN, EID, type EntityId, type URI } from '@dxos/keys';
import { assumeType } from '@dxos/util';

import type * as Database from './Database.ts';
import * as Entity from './Entity.ts';
import * as entityInternal from './internal/Entity/index.ts';
import * as internal from './internal/index.ts';
import * as objInternal from './internal/Obj/index.ts';
import * as Obj from './Obj.ts';
import type * as Ref from './Ref.ts';
import type * as Tag from './Tag.ts';
import * as Type from './Type.ts';

export type Endpoints<Source, Target> = {
  [Source]: Source;
  [Target]: Target;
};

/**
 * Base type for all ECHO relations.
 * @private
 */
interface BaseRelation<Source, Target>
  extends internal.AnyEntity, Endpoints<Source, Target>, Entity.OfKind<internal.EntityKind.Relation> {}

/**
 * Relation with no known properties beyond id, kind, source, and target.
 * Use this when the relation's schema/properties are not known.
 *
 * NOTE: This is a TypeScript type only, not a schema.
 * To validate that a value is an ECHO relation, use `Relation.isRelation`.
 */
export interface Unknown extends BaseRelation<Obj.Unknown, Obj.Unknown> {}

/**
 * Runtime Effect schema for any ECHO relation.
 * Use for validation, parsing, or as a reference target for collections.
 * A relation has `id`, source, and target fields plus any additional properties.
 *
 * NOTE: `Schema.is(Type.Relation)` does STRUCTURAL validation only (checks for `id` field).
 * Use `Relation.isRelation()` for proper ECHO instance type guards that check the KindId brand.
 *
 * @example
 * ```ts
 * // Structural type guard (accepts any object with id field)
 * if (Schema.is(Type.Relation)(unknownValue)) { ... }
 *
 * // ECHO instance type guard (checks KindId brand)
 * if (Relation.isRelation(unknownValue)) { ... }
 * ```
 */
// TODO(dmaretskyi): Change ObjModule.Any to ObjModule.Unknown to have stricter types.
export const Unknown: internal.UnknownTypeSchema<Unknown, typeof Entity.Kind.Relation> = Schema.StructWithRest(
  Schema.Struct({ id: Schema.String }),
  [Schema.Record(Schema.String, Schema.Unknown)],
).pipe(
  Schema.annotate({
    [internal.TypeAnnotationId]: {
      kind: Entity.Kind.Relation,
      typename: 'org.dxos.schema.anyRelation',
      version: '0.0.0',
      sourceSchema: DXN.make(internal.ANY_OBJECT_TYPENAME, internal.ANY_OBJECT_VERSION),
      targetSchema: DXN.make(internal.ANY_OBJECT_TYPENAME, internal.ANY_OBJECT_VERSION),
    },
  }),
) as unknown as internal.UnknownTypeSchema<Unknown, typeof Entity.Kind.Relation>;

/**
 * Relation type with specific source and target types.
 */
export type OfShape<Source extends Obj.Unknown, Target extends Obj.Unknown, Props> = BaseRelation<Source, Target> &
  Props;

/**
 * Base type for snapshot relations (has SnapshotKindId instead of KindId).
 */
interface BaseRelationSnapshot<Source, Target> extends internal.AnyEntity, Endpoints<Source, Target> {
  readonly [Entity.SnapshotKindId]: internal.EntityKind.Relation;
  readonly id: EntityId;
}

/**
 * JSON-encoded properties for relations.
 */
export interface BaseRelationJson {
  id: string;
  [internal.ATTR_RELATION_SOURCE]: string;
  [internal.ATTR_RELATION_TARGET]: string;
}

/**
 * Immutable snapshot of an ECHO relation.
 * Branded with SnapshotKindId (not KindId).
 * Property values are frozen at the time the snapshot was created.
 * Returned by getSnapshot() and hooks.
 */
export type Snapshot<T extends Unknown = Unknown> = Omit<T, Entity.KindId> &
  BaseRelationSnapshot<Obj.Unknown, Obj.Unknown>;

export const Source: unique symbol = entityInternal.RelationSourceId as any;
export type Source = typeof Source;

export const Target: unique symbol = entityInternal.RelationTargetId as any;
export type Target = typeof Target;

/**
 * Get relation source type.
 */
export type SourceOf<A> = A extends Endpoints<infer S, infer _T> ? S : never;

/**
 * Get relation target type.
 */
export type TargetOf<A> = A extends Endpoints<infer _S, infer T> ? T : never;

/**
 * Internal props type for relation instance creation.
 */
type MakePropsInternal<T extends Endpoints<any, any>> = {
  id?: EntityId;
  [Meta]?: Partial<internal.EntityMeta>;
  [Source]: T[Source];
  [Target]: T[Target];
} & Entity.Properties<T>;

/**
 * Props type for relation creation with a given schema. Accepts a `Type.AnyRelation`
 * entity (created with `Type.makeRelation`) and derives the props shape via
 * `Type.InstanceType`. Object-kind entities are rejected at the type level —
 * use `Obj.MakeProps` for those.
 */
export type MakeProps<S extends Type.AnyRelation> = MakePropsInternal<Type.InstanceType<S>>;

/**
 * Creates new relation.
 * @param schema - Relation schema.
 * @param props - Relation properties. Endpoints are passed as [Relation.Source] and [Relation.Target] keys.
 * @param meta - Relation metadata. (deprecated; use [Obj.Meta] instead)
 * @returns
 *
 * @performance O(n) in props size; validates props against the schema and allocates a reactive proxy, with no database
 * I/O.
 */
// NOTE: Writing the definition this way (with generic over schema) makes typescript perfer to infer the type from the first param (this schema) rather than the second param (the props).
// TODO(dmaretskyi): Move meta into props.
export const make = <T extends Type.AnyRelation>(
  type: T,
  props: NoInfer<MakeProps<T>>,
): Type.InstanceType<T> & Entity.OfKind<typeof Entity.Kind.Relation> => {
  const schema = Type.getSchema(type);
  assertArgument(
    internal.getTypeAnnotation(schema)?.kind === internal.EntityKind.Relation,
    'schema',
    'Expected a relation schema',
  );
  assertArgument(props[internal.ParentId] === undefined, 'props', 'Parent is not allowed for relations');

  let meta: internal.EntityMeta | undefined = undefined;

  if (props[internal.MetaId] != null) {
    meta = props[internal.MetaId] as any;
    delete props[internal.MetaId];
  }

  internal.assertNotEvent(props[Source], 'relation source');
  internal.assertNotEvent(props[Target], 'relation target');
  const sourceDXN = internal.getObjectEchoUri(props[Source]) ?? raise(new Error('Unresolved relation source'));
  const targetDXN = internal.getObjectEchoUri(props[Target]) ?? raise(new Error('Unresolved relation target'));

  (props as any)[internal.RelationSourceDXNId] = sourceDXN;
  (props as any)[internal.RelationTargetDXNId] = targetDXN;

  // Pass the type entity through as `typeSource` so the resulting instance
  // carries a back-reference resolvable via `Relation.getType` / `Entity.getType`.
  return internal.makeObject(schema as any, props as any, meta, type as any) as any;
};

/**
 * Test if a value is an instance of a given relation type.
 *
 * Mirrors `Obj.instanceOf` but only accepts `Type.AnyRelation` — use
 * `Obj.instanceOf` for objects and `Type.isType` for `Type.Type` entities.
 *
 * @example
 * ```ts
 * const isEmployedBy = Relation.instanceOf(EmployedBy);
 * if (isEmployedBy(relation)) {
 *   // relation is EmployedBy
 * }
 * ```
 *
 * @performance O(1) type-URI comparison with a typename fallback; no schema validation.
 */
export const instanceOf: {
  <S extends Type.AnyRelation>(schema: S): (value: unknown) => value is Type.InstanceType<S>;
  <S extends Type.AnyRelation>(schema: S, value: unknown): value is Type.InstanceType<S>;
} = ((...args: [schema: Type.AnyRelation, value?: unknown]) => {
  if (args.length === 1) {
    return (entity: unknown) => internal.isInstanceOf(args[0], entity);
  }
  return internal.isInstanceOf(args[0], args[1]);
}) as any;

/**
 * Type guard for relations.
 * Returns true for both reactive relations and relation snapshots.
 *
 * @performance O(1) brand check; no allocation.
 */
export const isRelation = (value: unknown): value is Unknown => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  if (internal.ATTR_RELATION_SOURCE in value || internal.ATTR_RELATION_TARGET in value) {
    return true;
  }

  // Check for reactive relation (KindId) or snapshot (SnapshotKindId).
  const kind = (value as any)[Entity.KindId] ?? (value as any)[Entity.SnapshotKindId];
  return kind === internal.EntityKind.Relation;
};

/**
 * Determine if a value is an ECHO relation snapshot.
 *
 * @performance O(1) brand check; no allocation.
 */
export const isSnapshot = (value: unknown): value is Snapshot => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  return (value as any)[Entity.SnapshotKindId] === internal.EntityKind.Relation;
};

/**
 * Sets a relation as the parent of an object: the object cascade-deletes with the relation and is
 * persisted transitively when the relation is added. The delete-cascade resolves the parent by id
 * regardless of kind. The object-parent counterpart is {@link Obj.setParent}.
 *
 * @performance O(1) slot write; unlike `Obj.setParent` it does not scan the parent.
 */
export const setParent = (entity: Obj.Unknown, parent: Unknown): Obj.Unknown => {
  internal.assertNotEvent(entity, 'parent');
  assertArgument(Obj.isObject(entity), 'Expected an object');
  assertArgument(isRelation(parent), 'Expected a relation');
  assumeType<internal.InternalObjectProps>(entity);
  assumeType<internal.InternalObjectProps>(parent);
  entity[internal.ParentId] = parent;
  return entity;
};

/**
 * @returns Relation source URI.
 * Accepts both reactive relations and snapshots.
 * @throws If the object is not a relation.
 *
 * @performance O(1) read of the stored endpoint URI.
 */
export const getSourceURI = (value: Unknown | Snapshot): EID.EID => {
  assertArgument(isRelation(value), 'Expected a relation');
  assumeType<internal.InternalObjectProps>(value);
  const uri = (value as internal.InternalObjectProps)[internal.RelationSourceDXNId];
  invariant(EID.isEID(uri));
  return uri;
};

/**
 * @returns Relation target URI.
 * Accepts both reactive relations and snapshots.
 * @throws If the object is not a relation.
 *
 * @performance O(1) read of the stored endpoint URI.
 */
export const getTargetURI = (value: Unknown | Snapshot): EID.EID => {
  assertArgument(isRelation(value), 'Expected a relation');
  assumeType<internal.InternalObjectProps>(value);
  const uri = (value as internal.InternalObjectProps)[internal.RelationTargetDXNId];
  invariant(EID.isEID(uri));
  return uri;
};

/**
 * @returns Relation source.
 * Accepts both reactive relations and snapshots.
 * @throws If the object is not a relation.
 *
 * @performance O(1); reads the endpoint slot (a working-set lookup for database relations, never a load).
 */
export const getSource = <T extends Unknown | Snapshot>(relation: T): SourceOf<T> => {
  assertArgument(isRelation(relation), 'Expected a relation');
  assumeType<internal.InternalObjectProps>(relation);
  const obj = (relation as internal.InternalObjectProps)[internal.RelationSourceId];
  if (obj === undefined) {
    throw new Error(`Relation source could not be resolved.`);
  }
  return obj as SourceOf<T>;
};

/**
 * @returns Relation target.
 * Accepts both reactive relations and snapshots.
 * @throws If the object is not a relation.
 *
 * @performance O(1); reads the endpoint slot (a working-set lookup for database relations, never a load).
 */
export const getTarget = <T extends Unknown | Snapshot>(relation: T): TargetOf<T> => {
  assertArgument(isRelation(relation), 'Expected a relation');
  assumeType<internal.InternalObjectProps>(relation);
  const obj = (relation as internal.InternalObjectProps)[internal.RelationTargetId];
  if (obj === undefined) {
    throw new Error(`Relation target could not be resolved.`);
  }
  return obj as TargetOf<T>;
};

//
// Change
//

/**
 * Makes all properties mutable recursively.
 * Used to provide a mutable view of a relation within `Relation.update`.
 */
export type Mutable<T> = internal.Mutable<T>;

/**
 * Perform mutations on an echo relation within a controlled context.
 *
 * All mutations within the callback are batched and trigger a single notification
 * when the callback completes. Direct mutations outside of `Relation.update` will throw
 * an error for echo relations.
 *
 * @param relation - The echo relation to mutate. Use `Obj.update` for objects.
 * @param callback - The callback that performs mutations on the relation.
 *
 * @example
 * ```ts
 * const worksFor = Relation.make(EmployedBy, {
 *   [Relation.Source]: person,
 *   [Relation.Target]: company,
 *   role: 'Engineer',
 * });
 *
 * // Mutate within Relation.update
 * Relation.update(worksFor, (obj) => {
 *   obj.role = 'Senior Engineer';
 * });
 * ```
 *
 * Note: Only accepts relations. Use `Obj.update` for objects.
 *
 * @performance Synchronous; costs the mutations made in the callback plus one batched notification.
 */
export const update = <T extends Unknown>(relation: T, callback: internal.ChangeCallback<T>): void => {
  internal.assertNotEvent(relation, 'update');
  internal.change(relation, callback);
};

//
// Snapshot
//

/**
 * Returns an immutable snapshot of a relation.
 * The snapshot is branded with SnapshotKindId instead of KindId,
 * making it distinguishable from the reactive relation at the type level.
 *
 * @performance O(n) in entity size; deep-copies plain data (refs are shared, not resolved) into a frozen object per
 * call.
 */
export const getSnapshot: <T extends Unknown>(rel: T) => Snapshot<T> = internal.getSnapshot as any;

//
// Subscribe
//

/**
 * Subscribe to relation updates.
 * The callback is called synchronously when the relation is modified.
 * Only accepts reactive relations (not snapshots).
 * @returns Unsubscribe function.
 *
 * @performance O(1) listener registration; the callback runs synchronously after every committed change.
 */
export const subscribe = (rel: Unknown, callback: () => void): (() => void) => {
  return internal.subscribe(rel, callback);
};

//
// Property Access
//

/**
 * Get a deeply nested property from a relation.
 * Accepts both reactive relations and snapshots.
 *
 * @performance O(path length) property walk; no schema lookup.
 */
export const getValue = (rel: Unknown | Snapshot, path: readonly (string | number)[]): any => {
  return SchemaEx.getValue(rel, SchemaEx.createJsonPath(path));
};

/**
 * Set a deeply nested property on a relation.
 * Must be called within a `Relation.update` callback.
 *
 * NOTE: TypeScript's structural typing allows readonly objects to be passed to `Mutable<T>`
 * parameters, so there is no compile-time error. Enforcement is runtime-only.
 *
 * @performance O(path length) schema-guided walk; each missing level scans its schema properties once.
 */
export const setValue: (rel: Mutable<Unknown>, path: readonly (string | number)[], value: any) => void =
  internal.setValue as any;

//
// Type
//

/**
 * Get the canonical URI of the relation. Returns `URI.URI` — today always an EID,
 * but future entity kinds may surface other URI schemes; narrow with `EID.parse(uri)`
 * or `DXN.tryMake(uri)` at the point of use. Accepts both reactive relations and snapshots.
 *
 * @param options.prefer - Controls the URI form (see {@link internal.GetURIOptions}).
 *
 * @performance O(1); returns the stored URI, constructing (and allocating) one only when `options.prefer` asks for
 * another form.
 */
export const getURI = (entity: Unknown | Snapshot, options?: internal.GetURIOptions): URI.URI =>
  internal.getUri(entity, options);

/**
 * @returns The DXN of the relation's type.
 *
 * @performance O(1) read of the stored type URI.
 */
export const getTypeURI: (obj: internal.AnyProperties) => URI.URI | undefined = internal.getTypeURI;

/**
 * Get the type entity (`Type.AnyRelation`) the relation was created from.
 *
 * Returns `undefined` when the relation's type isn't registered in this
 * runtime (e.g. a freshly deserialized snapshot whose type entity hasn't been
 * wired up yet, or a relation loaded from storage before its schema is known).
 * To get the Effect Schema from the returned entity, use `Type.getSchema(...)`.
 *
 * @performance O(1) read of the type back-reference.
 */
export const getType = (relation: Unknown | Snapshot): Type.AnyRelation | undefined =>
  internal.getType(relation) as Type.AnyRelation | undefined;

/**
 * @returns The typename of the relation's type.
 * Accepts both reactive relations and snapshots.
 *
 * @performance O(1); reads the schema type annotation (database objects resolve the schema by registry URI lookup).
 */
export const getTypename = (entity: Unknown | Snapshot): string | undefined => internal.getTypename(entity);

//
// Database
//

/**
 * Get the database the relation belongs to.
 * Accepts both reactive relations and snapshots.
 *
 * @performance O(1) slot read.
 */
export const getDatabase = (entity: Unknown | Snapshot): Database.Database | undefined => internal.getDatabase(entity);

//
// Meta
//

/**
 * Property that accesses metadata for an entity.
 *
 * Alias for `Entity.Meta`.
 */
export const Meta = internal.MetaId;

/**
 * Deeply read-only version of EntityMeta.
 */
export type ReadonlyMeta = internal.ReadonlyMeta;

/**
 * Mutable meta type returned by `Relation.getMeta` inside a `Relation.update` callback.
 */
export type Meta = internal.Meta;

/**
 * Get the metadata for a relation.
 * Returns mutable meta when passed a mutable relation (inside `Relation.update` callback).
 * Returns read-only meta when passed a regular relation or snapshot.
 *
 * @performance O(1); returns the live (memoized) meta proxy, not a copy.
 */
// TODO(wittjosiah): When passed a Snapshot, should return a snapshot of meta, not the live meta proxy.
export function getMeta(entity: Mutable<Unknown>): Meta;
export function getMeta(entity: Unknown | Snapshot): ReadonlyMeta;
export function getMeta(entity: Unknown | Snapshot | Mutable<Unknown>): Meta | ReadonlyMeta {
  return internal.getMetaChecked(entity);
}

/**
 * @returns Foreign keys for the relation from the specified source.
 * Accepts both reactive relations and snapshots.
 *
 * @performance O(k) in the foreign-key count; allocates a filtered array.
 */
export const getKeys = (entity: Unknown | Snapshot, source: string): ForeignKey[] => internal.getKeys(entity, source);

/**
 * Delete all keys from the relation for the specified source.
 * Must be called within a `Relation.update` callback.
 *
 * NOTE: TypeScript's structural typing allows readonly objects to be passed to `Mutable<T>`
 * parameters, so there is no compile-time error. Enforcement is runtime-only.
 *
 * @performance O(k) in the foreign-key count.
 */
export const deleteKeys = (entity: Mutable<Unknown>, source: string): void => internal.deleteKeys(entity, source);

/**
 * Add a tag to the relation.
 * Must be called within a `Relation.update` callback.
 *
 * NOTE: TypeScript's structural typing allows readonly objects to be passed to `Mutable<T>`
 * parameters, so there is no compile-time error. Enforcement is runtime-only.
 *
 * @performance O(t) in the tag count; dedupes by ref URI before appending.
 */
export const addTag = (entity: Mutable<Unknown>, tag: Ref.Ref<Tag.Tag>): void => internal.addTag(entity, tag);

/**
 * Remove a tag from the relation.
 * Must be called within a `Relation.update` callback.
 *
 * NOTE: TypeScript's structural typing allows readonly objects to be passed to `Mutable<T>`
 * parameters, so there is no compile-time error. Enforcement is runtime-only.
 *
 * @performance O(t) in the tag count.
 */
export const removeTag = (entity: Mutable<Unknown>, tag: Ref.Ref<Tag.Tag>): void => internal.removeTag(entity, tag);

/**
 * Check if the relation is deleted.
 * Accepts both reactive relations and snapshots.
 *
 * @performance O(1) slot read.
 */
export const isDeleted = (entity: Unknown | Snapshot): boolean => internal.isDeleted(entity);

//
// Annotations
//

/**
 * Get the label of the relation.
 * Accepts both reactive relations and snapshots.
 *
 * @param options.fallback `'typename'` returns the relation's typename when no
 *   label is set (e.g. `org.dxos.type.table`).
 *
 * @performance O(label accessors); reads the fields named by the schema `LabelAnnotation`.
 */
export const getLabel = (entity: Unknown | Snapshot, options?: internal.GetLabelOptions): string | undefined =>
  internal.getLabel(entity, options);

/**
 * Set the label of the relation.
 * Must be called within a `Relation.update` callback.
 *
 * NOTE: TypeScript's structural typing allows readonly objects to be passed to `Mutable<T>`
 * parameters, so there is no compile-time error. Enforcement is runtime-only.
 *
 * @performance O(1); writes the first `LabelAnnotation` accessor, a no-op without a schema.
 */
export const setLabel = (entity: Mutable<Unknown>, label: string): void => internal.setLabel(entity, label);

/**
 * Get the description of the relation.
 * Accepts both reactive relations and snapshots.
 *
 * @performance O(1); reads the field named by the schema `DescriptionAnnotation`.
 */
export const getDescription = (entity: Unknown | Snapshot): string | undefined => internal.getDescription(entity);

/**
 * Set the description of the relation.
 * Must be called within a `Relation.update` callback.
 *
 * NOTE: TypeScript's structural typing allows readonly objects to be passed to `Mutable<T>`
 * parameters, so there is no compile-time error. Enforcement is runtime-only.
 *
 * @performance O(1); writes the field named by the schema `DescriptionAnnotation`.
 */
export const setDescription = (entity: Mutable<Unknown>, description: string): void =>
  internal.setDescription(entity, description);

//
// JSON
//

/**
 * JSON representation of a relation.
 */
export type JSON = internal.ObjectJSON;

/**
 * Converts relation to its JSON representation.
 * Accepts both reactive relations and snapshots.
 *
 * @performance O(n) in entity size; serializes the whole entity on every call.
 */
export const toJSON = (entity: Unknown | Snapshot): JSON => internal.objectToJSON(entity);

//
// Sorting
//

/**
 * Comparator function type for sorting relations.
 * Accepts both reactive relations and snapshots.
 */
export type Comparator = internal.Comparator<Unknown | Snapshot>;

/**
 * Comparator that orders relations by label.
 *
 * @performance O(label accessors) per comparison; labels are recomputed, not cached, so a sort costs O(n log n) label
 * reads.
 */
export const sortByLabel: Comparator = internal.sortByLabel as Comparator;
/**
 * Comparator that orders relations by typename.
 *
 * @performance O(1) per comparison.
 */
export const sortByTypename: Comparator = internal.sortByTypename as Comparator;
/**
 * Compose comparators, applying each in order until one returns non-zero.
 *
 * @performance O(c) per comparison in the number of composed comparators.
 */
export const sort = (...comparators: Comparator[]): Comparator => internal.sort(...comparators) as Comparator;

//
// Version
//

export const VersionTypeId = internal.VersionTypeId;
/**
 * Checks that a value is a version object.
 *
 * @performance O(1) brand check.
 */
export const isVersion = internal.isVersion;

/**
 * Represent relation version.
 */
export type Version = internal.EntityVersion;

/**
 * Returns the version of the relation.
 * Accepts both reactive relations and snapshots.
 *
 * @performance O(h) in Automerge heads: database entities copy the current heads into a fresh array per call.
 */
export const version = (entity: Unknown | Snapshot): Version => internal.version(entity);

//
// Atoms
//

/**
 * Create a reactive snapshot atom for a relation.
 *
 * @performance O(1) memoized atom-family lookup; every emission takes an O(n) `getSnapshot` of the entity.
 */
export const atom = objInternal.makeRelation;
