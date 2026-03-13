//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { raise } from '@dxos/debug';
import type { ForeignKey } from '@dxos/echo-protocol';
import { createJsonPath } from '@dxos/effect';
import { assertArgument, invariant } from '@dxos/invariant';
import { DXN, type ObjectId } from '@dxos/keys';
import { assumeType } from '@dxos/util';

import type * as Database from './Database';
import * as Entity from './Entity';
import * as entityInternal from './internal/Entity';
import * as internal from './internal';
import * as Obj from './Obj';
import type * as Type from './Type';

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
export const Unknown: Type.Relation<Unknown, Obj.Any, Obj.Any> = Schema.Struct({
  id: Schema.String,
}).pipe(
  Schema.extend(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
  // TODO(dmaretskyi): Clean this up.
  // NOTE: The EchoRelationSchema annotation is required for Ref.Ref(Relation.Unknown) to work.
  //   The typename/version/source/target only satisfy ECHO schema machinery for reference targets.
  internal.EchoRelationSchema({
    typename: 'dxos.org/schema/AnyRelation',
    version: '0.0.0',
    source: Obj.Unknown,
    target: Obj.Unknown,
  }),
  (schema) =>
    Object.assign(schema, {
      [internal.SchemaKindId]: (schema as any)[internal.SchemaKindId],
    }) as unknown as Type.Relation<Unknown, Obj.Any, Obj.Any>,
);

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
  readonly id: ObjectId;
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
type MakePropsInternal<T extends Unknown> = {
  id?: ObjectId;
  [Meta]?: internal.ObjectMeta;
  [Source]: T[Source];
  [Target]: T[Target];
} & Entity.Properties<T>;

/**
 * Props type for relation creation with a given schema.
 * Takes a schema type (created with Type.Relation) and extracts the props type.
 */
export type MakeProps<S extends Type.AnyRelation> = MakePropsInternal<Schema.Schema.Type<S>>;

/**
 * Creates new relation.
 * @param schema - Relation schema.
 * @param props - Relation properties. Endpoints are passed as [Relation.Source] and [Relation.Target] keys.
 * @param meta - Relation metadata. (deprecated; use [Obj.Meta] instead)
 * @returns
 */
// NOTE: Writing the definition this way (with generic over schema) makes typescript perfer to infer the type from the first param (this schema) rather than the second param (the props).
// TODO(dmaretskyi): Move meta into props.
export const make = <S extends Type.AnyRelation>(
  schema: S,
  props: NoInfer<MakeProps<S>>,
): Schema.Schema.Type<S> & Entity.OfKind<typeof Entity.Kind.Relation> => {
  assertArgument(
    internal.getTypeAnnotation(schema)?.kind === internal.EntityKind.Relation,
    'schema',
    'Expected a relation schema',
  );
  assertArgument(props[internal.ParentId] === undefined, 'props', 'Parent is not allowed for relations');

  let meta: internal.ObjectMeta | undefined = undefined;

  if (props[internal.MetaId] != null) {
    meta = props[internal.MetaId] as any;
    delete props[internal.MetaId];
  }

  const sourceDXN = internal.getObjectDXN(props[Source]) ?? raise(new Error('Unresolved relation source'));
  const targetDXN = internal.getObjectDXN(props[Target]) ?? raise(new Error('Unresolved relation target'));

  (props as any)[internal.RelationSourceDXNId] = sourceDXN;
  (props as any)[internal.RelationTargetDXNId] = targetDXN;

  return internal.makeObject<Schema.Schema.Type<S>>(schema, props as any, meta);
};

/**
 * Type guard for relations.
 * Returns true for both reactive relations and relation snapshots.
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

export const isSnapshot = (value: unknown): value is Snapshot => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  return (value as any)[Entity.SnapshotKindId] === internal.EntityKind.Relation;
};

/**
 * @returns Relation source DXN.
 * Accepts both reactive relations and snapshots.
 * @throws If the object is not a relation.
 */
export const getSourceDXN = (value: Unknown | Snapshot): DXN => {
  assertArgument(isRelation(value), 'Expected a relation');
  assumeType<internal.InternalObjectProps>(value);
  const dxn = (value as internal.InternalObjectProps)[internal.RelationSourceDXNId];
  invariant(dxn instanceof DXN);
  return dxn;
};

/**
 * @returns Relation target DXN.
 * Accepts both reactive relations and snapshots.
 * @throws If the object is not a relation.
 */
export const getTargetDXN = (value: Unknown | Snapshot): DXN => {
  assertArgument(isRelation(value), 'Expected a relation');
  assumeType<internal.InternalObjectProps>(value);
  const dxn = (value as internal.InternalObjectProps)[internal.RelationTargetDXNId];
  invariant(dxn instanceof DXN);
  return dxn;
};

/**
 * @returns Relation source.
 * Accepts both reactive relations and snapshots.
 * @throws If the object is not a relation.
 */
export const getSource = <T extends Unknown | Snapshot>(relation: T): SourceOf<T> => {
  assertArgument(isRelation(relation), 'Expected a relation');
  assumeType<internal.InternalObjectProps>(relation);
  const obj = (relation as internal.InternalObjectProps)[internal.RelationSourceId];
  invariant(obj !== undefined, `Invalid source: ${relation.id}`);
  return obj as SourceOf<T>;
};

/**
 * @returns Relation target.
 * Accepts both reactive relations and snapshots.
 * @throws If the object is not a relation.
 */
export const getTarget = <T extends Unknown | Snapshot>(relation: T): TargetOf<T> => {
  assertArgument(isRelation(relation), 'Expected a relation');
  assumeType<internal.InternalObjectProps>(relation);
  const obj = (relation as internal.InternalObjectProps)[internal.RelationTargetId];
  invariant(obj !== undefined, `Invalid target: ${relation.id}`);
  return obj as TargetOf<T>;
};

//
// Change
//

/**
 * Makes all properties mutable recursively.
 * Used to provide a mutable view of a relation within `Relation.change`.
 */
export type Mutable<T> = internal.Mutable<T>;

/**
 * Perform mutations on an echo relation within a controlled context.
 *
 * All mutations within the callback are batched and trigger a single notification
 * when the callback completes. Direct mutations outside of `Relation.change` will throw
 * an error for echo relations.
 *
 * @param relation - The echo relation to mutate. Use `Obj.change` for objects.
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
 * // Mutate within Relation.change
 * Relation.change(worksFor, (r) => {
 *   r.role = 'Senior Engineer';
 * });
 * ```
 *
 * Note: Only accepts relations. Use `Obj.change` for objects.
 */
export const change = <T extends Unknown>(relation: T, callback: internal.ChangeCallback<T>): void => {
  internal.change(relation, callback);
};

//
// Snapshot
//

/**
 * Returns an immutable snapshot of a relation.
 * The snapshot is branded with SnapshotKindId instead of KindId,
 * making it distinguishable from the reactive relation at the type level.
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
 */
export const getValue = (rel: Unknown | Snapshot, path: readonly (string | number)[]): any => {
  return internal.getValue(rel, createJsonPath(path));
};

/**
 * Set a deeply nested property on a relation.
 * Must be called within a `Relation.change` callback.
 *
 * NOTE: TypeScript's structural typing allows readonly objects to be passed to `Mutable<T>`
 * parameters, so there is no compile-time error. Enforcement is runtime-only.
 */
export const setValue: (rel: Mutable<Unknown>, path: readonly (string | number)[], value: any) => void =
  internal.setValue as any;

//
// Type
//

/**
 * Get the DXN of the relation.
 * Accepts both reactive relations and snapshots.
 */
export const getDXN = (entity: Unknown | Snapshot): DXN => internal.getDXN(entity);

/**
 * @returns The DXN of the relation's type.
 */
export const getTypeDXN = internal.getTypeDXN;

/**
 * Get the schema of the relation.
 * Returns the branded ECHO schema used to create the relation.
 */
export const getSchema: (rel: unknown | undefined) => Type.AnyEntity | undefined = internal.getSchema as any;

/**
 * @returns The typename of the relation's type.
 * Accepts both reactive relations and snapshots.
 */
export const getTypename = (entity: Unknown | Snapshot): string | undefined => internal.getTypename(entity);

//
// Database
//

/**
 * Get the database the relation belongs to.
 * Accepts both reactive relations and snapshots.
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
 * Deeply read-only version of ObjectMeta.
 */
export type ReadonlyMeta = internal.ReadonlyMeta;

/**
 * Mutable meta type returned by `Relation.getMeta` inside a `Relation.change` callback.
 */
export type Meta = internal.Meta;

/**
 * Get the metadata for a relation.
 * Returns mutable meta when passed a mutable relation (inside `Relation.change` callback).
 * Returns read-only meta when passed a regular relation or snapshot.
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
 */
export const getKeys = (entity: Unknown | Snapshot, source: string): ForeignKey[] => internal.getKeys(entity, source);

/**
 * Delete all keys from the relation for the specified source.
 * Must be called within a `Relation.change` callback.
 *
 * NOTE: TypeScript's structural typing allows readonly objects to be passed to `Mutable<T>`
 * parameters, so there is no compile-time error. Enforcement is runtime-only.
 */
export const deleteKeys = (entity: Mutable<Unknown>, source: string): void => internal.deleteKeys(entity, source);

/**
 * Add a tag to the relation.
 * Must be called within a `Relation.change` callback.
 *
 * NOTE: TypeScript's structural typing allows readonly objects to be passed to `Mutable<T>`
 * parameters, so there is no compile-time error. Enforcement is runtime-only.
 */
export const addTag = (entity: Mutable<Unknown>, tag: string): void => internal.addTag(entity, tag);

/**
 * Remove a tag from the relation.
 * Must be called within a `Relation.change` callback.
 *
 * NOTE: TypeScript's structural typing allows readonly objects to be passed to `Mutable<T>`
 * parameters, so there is no compile-time error. Enforcement is runtime-only.
 */
export const removeTag = (entity: Mutable<Unknown>, tag: string): void => internal.removeTag(entity, tag);

/**
 * Check if the relation is deleted.
 * Accepts both reactive relations and snapshots.
 */
export const isDeleted = (entity: Unknown | Snapshot): boolean => internal.isDeleted(entity);

//
// Annotations
//

/**
 * Get the label of the relation.
 * Accepts both reactive relations and snapshots.
 */
export const getLabel = (entity: Unknown | Snapshot): string | undefined => internal.getLabel(entity);

/**
 * Set the label of the relation.
 * Must be called within a `Relation.change` callback.
 *
 * NOTE: TypeScript's structural typing allows readonly objects to be passed to `Mutable<T>`
 * parameters, so there is no compile-time error. Enforcement is runtime-only.
 */
export const setLabel = (entity: Mutable<Unknown>, label: string): void => internal.setLabel(entity, label);

/**
 * Get the description of the relation.
 * Accepts both reactive relations and snapshots.
 */
export const getDescription = (entity: Unknown | Snapshot): string | undefined => internal.getDescription(entity);

/**
 * Set the description of the relation.
 * Must be called within a `Relation.change` callback.
 *
 * NOTE: TypeScript's structural typing allows readonly objects to be passed to `Mutable<T>`
 * parameters, so there is no compile-time error. Enforcement is runtime-only.
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

export const sortByLabel: Comparator = internal.sortByLabel as Comparator;
export const sortByTypename: Comparator = internal.sortByTypename as Comparator;
export const sort = (...comparators: Comparator[]): Comparator => internal.sort(...comparators) as Comparator;

//
// Version
//

export const VersionTypeId = internal.VersionTypeId;
export const isVersion = internal.isVersion;

/**
 * Represent relation version.
 */
export type Version = internal.EntityVersion;

/**
 * Returns the version of the relation.
 * Accepts both reactive relations and snapshots.
 */
export const version = (entity: Unknown | Snapshot): Version => internal.version(entity);
