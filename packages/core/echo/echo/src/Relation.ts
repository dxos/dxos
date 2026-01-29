//
// Copyright 2025 DXOS.org
//

import type * as Schema from 'effect/Schema';

import { raise } from '@dxos/debug';
import type { ForeignKey } from '@dxos/echo-protocol';
import { createJsonPath, getValue as getValue$ } from '@dxos/effect';
import { assertArgument, invariant } from '@dxos/invariant';
import { DXN, type ObjectId } from '@dxos/keys';
import { assumeType } from '@dxos/util';

import type * as Database from './Database';
import * as Entity from './Entity';
import {
  type ObjectJSON as APIJSON,
  ATTR_RELATION_SOURCE,
  ATTR_RELATION_TARGET,
  type AnyEntity,
  type Comparator as ApiComparator,
  type Meta as ApiMeta,
  type ReadonlyMeta as ApiReadonlyMeta,
  type EntityVersion as ApiVersion,
  type ChangeCallback,
  EntityKind,
  type InternalObjectProps,
  type KindId,
  MetaId,
  type Mutable,
  type ObjectMeta,
  RelationSourceDXNId,
  RelationSourceId,
  RelationTargetDXNId,
  RelationTargetId,
  SnapshotKindId,
  VersionTypeId,
  addTag as addTag$,
  change as change$,
  changeMeta as changeMeta$,
  deleteKeys as deleteKeys$,
  getDXN as getDXN$,
  getDatabase as getDatabase$,
  getDescription as getDescription$,
  getKeys as getKeys$,
  getLabel as getLabel$,
  getMetaChecked as getMeta$,
  getObjectDXN,
  getSchema as getSchema$,
  getSnapshot as getSnapshot$,
  getTypeAnnotation,
  getTypeDXN as getTypeDXN$,
  getTypename as getTypename$,
  isDeleted as isDeleted$,
  isVersion,
  makeObject,
  objectToJSON as toJSON$,
  removeTag as removeTag$,
  setDescription as setDescription$,
  setLabel as setLabel$,
  setValue as setValue$,
  sort as sort$,
  sortByLabel as sortByLabel$,
  sortByTypename as sortByTypename$,
  subscribe as subscribe$,
  version as version$,
} from './internal';
import type * as Obj from './Obj';
import type * as Type from './Type';

/**
 * Base type for all ECHO relations.
 * @private
 */
interface BaseRelation<Source, Target>
  extends AnyEntity,
    Type.Relation.Endpoints<Source, Target>,
    Entity.OfKind<EntityKind.Relation> {}

/**
 * Relation with no known properties beyond id, kind, source, and target.
 * Use this when the relation's schema/properties are not known.
 *
 * NOTE: This is a TypeScript type only, not a schema.
 * To validate that a value is an ECHO relation, use `Relation.isRelation`.
 */
export interface Unknown extends BaseRelation<Obj.Unknown, Obj.Unknown> {}

/**
 * Relation type with specific source and target types.
 */
export type Relation<Source extends Obj.Unknown, Target extends Obj.Unknown, Props> = BaseRelation<Source, Target> &
  Props;

/**
 * Unbranded base type for relations - common structure without the brand.
 * Both reactive relations and snapshots are assignable to this.
 */
export interface Base extends AnyEntity, Type.Relation.Endpoints<Obj.Base, Obj.Base> {
  readonly id: ObjectId;
}

/**
 * Base type for snapshot relations (has SnapshotKindId instead of KindId).
 */
interface BaseRelationSnapshot<Source, Target> extends AnyEntity, Type.Relation.Endpoints<Source, Target> {
  readonly [SnapshotKindId]: EntityKind.Relation;
  readonly id: ObjectId;
}

/**
 * Immutable snapshot of an ECHO relation.
 * Branded with SnapshotKindId (not KindId).
 * Property values are frozen at the time the snapshot was created.
 * Returned by getSnapshot() and hooks.
 */
export type Snapshot<T extends Unknown = Unknown> = Omit<T, KindId> & BaseRelationSnapshot<Obj.Base, Obj.Base>;

export const Source: unique symbol = RelationSourceId as any;
export type Source = typeof Source;

export const Target: unique symbol = RelationTargetId as any;
export type Target = typeof Target;

/**
 * Internal props type for relation instance creation.
 */
type RelationMakeProps<T extends Unknown> = {
  id?: ObjectId;
  [MetaId]?: ObjectMeta;
  [Source]: T[Source];
  [Target]: T[Target];
} & Type.Properties<T>;

/**
 * Props type for relation creation with a given schema.
 * Takes a schema type (created with Type.Relation) and extracts the props type.
 */
export type MakeProps<S extends Type.Relation.Any> = RelationMakeProps<Schema.Schema.Type<S>>;

/**
 * Creates new relation.
 * @param schema - Relation schema.
 * @param props - Relation properties. Endpoints are passed as [Relation.Source] and [Relation.Target] keys.
 * @param meta - Relation metadata.
 * @returns
 */
// NOTE: Writing the definition this way (with generic over schema) makes typescript perfer to infer the type from the first param (this schema) rather than the second param (the props).
// TODO(dmaretskyi): Move meta into props.
export const make = <S extends Type.Relation.Any>(
  schema: S,
  props: NoInfer<RelationMakeProps<Schema.Schema.Type<S>>>,
  meta?: ObjectMeta,
): Schema.Schema.Type<S> & Entity.OfKind<typeof Entity.Kind.Relation> => {
  assertArgument(getTypeAnnotation(schema)?.kind === EntityKind.Relation, 'schema', 'Expected a relation schema');

  if (props[MetaId] != null) {
    meta = props[MetaId] as any;
    delete props[MetaId];
  }

  const sourceDXN = getObjectDXN(props[Source]) ?? raise(new Error('Unresolved relation source'));
  const targetDXN = getObjectDXN(props[Target]) ?? raise(new Error('Unresolved relation target'));

  (props as any)[RelationSourceDXNId] = sourceDXN;
  (props as any)[RelationTargetDXNId] = targetDXN;

  return makeObject<Schema.Schema.Type<S>>(schema, props as any, meta);
};

/**
 * Type guard for relations.
 * Returns true for both reactive relations and relation snapshots.
 */
export const isRelation = (value: unknown): value is Unknown => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  if (ATTR_RELATION_SOURCE in value || ATTR_RELATION_TARGET in value) {
    return true;
  }

  // Check for reactive relation (KindId) or snapshot (SnapshotKindId).
  const kind = (value as any)[Entity.KindId] ?? (value as any)[SnapshotKindId];
  return kind === EntityKind.Relation;
};

/**
 * @returns Relation source DXN.
 * Accepts both reactive relations and snapshots.
 * @throws If the object is not a relation.
 */
export const getSourceDXN = (value: Base): DXN => {
  assertArgument(isRelation(value), 'Expected a relation');
  assumeType<InternalObjectProps>(value);
  const dxn = (value as InternalObjectProps)[RelationSourceDXNId];
  invariant(dxn instanceof DXN);
  return dxn;
};

/**
 * @returns Relation target DXN.
 * Accepts both reactive relations and snapshots.
 * @throws If the object is not a relation.
 */
export const getTargetDXN = (value: Base): DXN => {
  assertArgument(isRelation(value), 'Expected a relation');
  assumeType<InternalObjectProps>(value);
  const dxn = (value as InternalObjectProps)[RelationTargetDXNId];
  invariant(dxn instanceof DXN);
  return dxn;
};

/**
 * @returns Relation source.
 * Accepts both reactive relations and snapshots.
 * @throws If the object is not a relation.
 */
export const getSource = <T extends Base>(relation: T): Type.Relation.Source<T> => {
  assertArgument(isRelation(relation), 'Expected a relation');
  assumeType<InternalObjectProps>(relation);
  const obj = (relation as InternalObjectProps)[RelationSourceId];
  invariant(obj !== undefined, `Invalid source: ${relation.id}`);
  return obj as Type.Relation.Source<T>;
};

/**
 * @returns Relation target.
 * Accepts both reactive relations and snapshots.
 * @throws If the object is not a relation.
 */
export const getTarget = <T extends Base>(relation: T): Type.Relation.Target<T> => {
  assertArgument(isRelation(relation), 'Expected a relation');
  assumeType<InternalObjectProps>(relation);
  const obj = (relation as InternalObjectProps)[RelationTargetId];
  invariant(obj !== undefined, `Invalid target: ${relation.id}`);
  return obj as Type.Relation.Target<T>;
};

//
// Change
//

/**
 * Makes all properties mutable recursively.
 * Used to provide a mutable view of a relation within `Relation.change`.
 */
export type { Mutable };

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
export const change = <T extends Unknown>(relation: T, callback: ChangeCallback<T>): void => {
  change$(relation, callback);
};

//
// Snapshot
//

/**
 * Returns an immutable snapshot of a relation.
 * The snapshot is branded with SnapshotKindId instead of KindId,
 * making it distinguishable from the reactive relation at the type level.
 */
export const getSnapshot: <T extends Unknown>(rel: T) => Snapshot<T> = getSnapshot$ as any;

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
  return subscribe$(rel, callback);
};

//
// Property Access
//

/**
 * Get a deeply nested property from a relation.
 * Accepts both reactive relations and snapshots.
 */
export const getValue = (rel: Base, path: readonly (string | number)[]): any => {
  return getValue$(rel, createJsonPath(path));
};

/**
 * Set a deeply nested property on a relation.
 * Only accepts reactive relations (not snapshots).
 */
export const setValue: (rel: Unknown, path: readonly (string | number)[], value: any) => void = setValue$ as any;

//
// Type
//

/**
 * Get the DXN of the relation.
 * Accepts both reactive relations and snapshots.
 */
export const getDXN = (entity: Unknown | Snapshot): DXN => getDXN$(entity);

/**
 * @returns The DXN of the relation's type.
 */
export const getTypeDXN = getTypeDXN$;

/**
 * Get the schema of the relation.
 * Returns the branded ECHO schema used to create the relation.
 */
export const getSchema: (rel: unknown | undefined) => Type.Entity.Any | undefined = getSchema$ as any;

/**
 * @returns The typename of the relation's type.
 * Accepts both reactive relations and snapshots.
 */
export const getTypename = (entity: Unknown | Snapshot): string | undefined => getTypename$(entity);

//
// Database
//

/**
 * Get the database the relation belongs to.
 * Accepts both reactive relations and snapshots.
 */
export const getDatabase = (entity: Unknown | Snapshot): Database.Database | undefined => getDatabase$(entity);

//
// Meta
//

/**
 * Deeply read-only version of ObjectMeta.
 */
export type ReadonlyMeta = ApiReadonlyMeta;

/**
 * Mutable meta type received in the `Relation.changeMeta()` callback.
 */
export type Meta = ApiMeta;

/**
 * Get the metadata for a relation.
 * Returns a read-only view of the metadata.
 */
export const getMeta = (entity: Unknown | Snapshot): ReadonlyMeta => getMeta$(entity);

/**
 * Perform mutations on a relation's metadata within a controlled context.
 * Only accepts reactive relations (not snapshots).
 */
export const changeMeta = (entity: Unknown, callback: (meta: ObjectMeta) => void): void =>
  changeMeta$(entity, callback);

/**
 * @returns Foreign keys for the relation from the specified source.
 * Accepts both reactive relations and snapshots.
 */
export const getKeys = (entity: Unknown | Snapshot, source: string): ForeignKey[] => getKeys$(entity, source);

/**
 * Delete all keys from the relation for the specified source.
 * Only accepts reactive relations (not snapshots).
 */
export const deleteKeys = (entity: Unknown, source: string): void => deleteKeys$(entity, source);

/**
 * Add a tag to the relation.
 * Only accepts reactive relations (not snapshots).
 */
export const addTag = (entity: Unknown, tag: string): void => addTag$(entity, tag);

/**
 * Remove a tag from the relation.
 * Only accepts reactive relations (not snapshots).
 */
export const removeTag = (entity: Unknown, tag: string): void => removeTag$(entity, tag);

/**
 * Check if the relation is deleted.
 * Accepts both reactive relations and snapshots.
 */
export const isDeleted = (entity: Unknown | Snapshot): boolean => isDeleted$(entity);

//
// Annotations
//

/**
 * Get the label of the relation.
 * Accepts both reactive relations and snapshots.
 */
export const getLabel = (entity: Unknown | Snapshot): string | undefined => getLabel$(entity);

/**
 * Set the label of the relation.
 * Only accepts reactive relations (not snapshots).
 */
export const setLabel = (entity: Unknown, label: string): void => setLabel$(entity, label);

/**
 * Get the description of the relation.
 * Accepts both reactive relations and snapshots.
 */
export const getDescription = (entity: Unknown | Snapshot): string | undefined => getDescription$(entity);

/**
 * Set the description of the relation.
 * Only accepts reactive relations (not snapshots).
 */
export const setDescription = (entity: Unknown, description: string): void => setDescription$(entity, description);

//
// JSON
//

/**
 * JSON representation of a relation.
 */
export type JSON = APIJSON;

/**
 * Converts relation to its JSON representation.
 * Accepts both reactive relations and snapshots.
 */
export const toJSON = (entity: Unknown | Snapshot): JSON => toJSON$(entity);

//
// Sorting
//

/**
 * Comparator function type for sorting relations.
 * Accepts both reactive relations and snapshots.
 */
export type Comparator = ApiComparator<Unknown | Snapshot>;

export const sortByLabel: Comparator = sortByLabel$ as Comparator;
export const sortByTypename: Comparator = sortByTypename$ as Comparator;
export const sort = (...comparators: Comparator[]): Comparator => sort$(...comparators) as Comparator;

//
// Version
//

export { VersionTypeId, isVersion };

/**
 * Represent relation version.
 */
export type Version = ApiVersion;

/**
 * Returns the version of the relation.
 * Accepts both reactive relations and snapshots.
 */
export const version = (entity: Unknown | Snapshot): Version => version$(entity);
