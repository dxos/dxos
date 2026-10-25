//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { ForeignKey } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';
import { type Comparator, intersection } from '@dxos/util';

import type * as Tag from '../../../Tag.ts';
import { Dictionary } from '../../Annotation/dictionary.ts';
import { EntityValueAnnotationId } from '../proxy/symbols.ts';
import { type AnyProperties } from './base.ts';
import { KindId } from './entity.ts';
import { MetaId } from './model-symbols.ts';
import { TypeId } from './typename.ts';
import { TagTypeDXN } from './well-known-types.ts';

/**
 * Property name for meta when object is serialized to JSON.
 */
export const ATTR_META = '@meta';

//
// EntityMeta
//

/**
 * Whether the value is a {@link Tag} entity. Read off the entity's own kind and type stamps, so
 * neither `Tag` nor the annotation helpers are imported here (both would form an eval-order cycle).
 */
export const isTagEntity = (value: unknown): value is Tag.Tag => {
  if (value == null || typeof value !== 'object' || Reflect.get(value, KindId) === undefined) {
    return false;
  }
  const type = Reflect.get(value, TypeId);
  const dxn = DXN.isDXN(type) ? DXN.tryMake(type) : undefined;
  return dxn != null && DXN.getName(dxn) === DXN.getName(TagTypeDXN);
};

/**
 * Schema for the {@link Tag} entities in {@link EntityMetaSchema.tags}: a strong dependency, held by
 * identity like a relation endpoint, and persisted as a reference.
 */
const TagEntitySchema = Schema.declare(isTagEntity, {
  identifier: 'Tag',
  [EntityValueAnnotationId]: true,
});

export const EntityMetaSchema = Schema.Struct({
  keys: Schema.Array(ForeignKey),

  /**
   * Tags applied to this entity: {@link Tag} objects, loaded with the entity as strong dependencies.
   */
  tags: Schema.Array(TagEntitySchema),

  /**
   * Fully-qualified registry key for the object (FQN format, e.g. `com.example.type.foo`).
   * Identifies the canonical registry entry the object instance was created from.
   */
  key: Schema.optional(Schema.String),

  /**
   * Semantic version of the registry entry the object was created from.
   * Must be a valid semver string (e.g. `1.2.3`).
   */
  version: Schema.optional(Schema.String),

  /**
   * Caller-supplied domain identity, unique within a space: two entities carrying the same
   * convergence key are the same entity and are merged into one. Declared by assigning this
   * field inside an update callback — `Entity.update(x, (x) => { Entity.getMeta(x).convergenceKey = '…' })`
   * — so it batches with the caller's other writes; there is deliberately no dedicated setter.
   *
   * Objects only: the merge engine ignores the field on relations and types (not merge subjects
   * yet), and treats the empty string as no key — both are verified at detection, in the worker,
   * and in the client executor rather than at write time, since the field replicates from peers
   * that cannot be trusted to have validated it.
   *
   * Opaque to the storage engine — callers that need generations encode them in the string
   * (e.g. `com.example.seed@2`), which yields distinct entities because the strings differ.
   * Distinct from `key`/`version` above, which record the registry entry an instance was
   * created from (provenance, not identity).
   */
  convergenceKey: Schema.optional(Schema.String),

  /**
   * Dictionary of annotations to this entity.
   */
  annotations: Dictionary,

  /**
   * Unix ms timestamp when this entity was created.
   * Read-only; sourced from the system section of the automerge document — not stored in meta.
   */
  createdAt: Schema.optional(Schema.Number),

  /**
   * Unix ms timestamp of the last automerge change on this entity's document.
   * Read-only; derived from the automerge change graph — not stored in meta.
   */
  updatedAt: Schema.optional(Schema.Number),
});

export type EntityMeta = Schema.Schema.Type<typeof EntityMetaSchema>;

/** Copied element-wise rather than by value, so that a snapshot is not aliased to the live meta. */
const CONTAINER_META_FIELDS: readonly string[] = ['keys', 'tags', 'annotations'];

/** Derived at read time from the system section and the change graph; never stored in meta. */
const VIRTUAL_META_FIELDS: readonly string[] = ['createdAt', 'updatedAt'];

/**
 * Stored meta fields holding a single scalar value.
 *
 * Derived from the schema rather than listed by hand: several places enumerate meta fields —
 * snapshotting copies them, and persistence decides from them whether the meta section is worth
 * writing at all — and a hand-maintained list silently drops any field added later, so the field
 * appears to work until it crosses one of those boundaries.
 */
export const SCALAR_META_FIELDS: readonly string[] = Object.keys(EntityMetaSchema.fields).filter(
  (field) => !CONTAINER_META_FIELDS.includes(field) && !VIRTUAL_META_FIELDS.includes(field),
);

/*
 * Get metadata from object.
 * Only callable on the object root.
 *
 * @internal (use Obj.getMeta or Relation.getMeta)
 */
// TODO(burdon): Refine type to BaseObj.
export const getMeta = (obj: AnyProperties): EntityMeta => {
  const metadata = (obj as any)[MetaId];
  invariant(metadata, 'EntityMeta not found.');
  return metadata;
};

//
// Foreign keys
//

export const foreignKey = (source: string, id: string): ForeignKey => ({ source, id });
export const foreignKeyEquals = (a: ForeignKey, b: ForeignKey) => a.source === b.source && a.id === b.id;

// TODO(dmaretskyi): Move to echo-schema.
export const compareForeignKeys: Comparator<AnyProperties> = (a: AnyProperties, b: AnyProperties) =>
  intersection(getMeta(a).keys, getMeta(b).keys, foreignKeyEquals).length > 0;
