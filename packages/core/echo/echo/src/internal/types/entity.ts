//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

// NOTE: String literals are used instead of unique symbols for both KindId and SchemaKindId.
//   Unique symbols cause TS4023 "cannot be named" errors when external packages
//   try to export types that reference this key (e.g., `export const Graph = ...`).
//   TypeScript cannot emit declaration files that reference unique symbols from
//   external modules. Using a string literal allows the type to be inlined in
//   declaration files, making the API portable across package boundaries.

/**
 * String key used to identify the kind of an entity instance (object or relation).
 */
export const KindId = '~@dxos/echo/Kind' as const;
export type KindId = typeof KindId;

/**
 * String key used to identify the kind of a schema (object schema or relation schema).
 * Parallels KindId which identifies instance kinds.
 */
export const SchemaKindId = '~@dxos/echo/SchemaKind' as const;
export type SchemaKindId = typeof SchemaKindId;

/**
 * String key used to brand snapshot types.
 * Snapshots have SnapshotKindId instead of KindId, making them
 * distinguishable from reactive objects at the type level.
 */
export const SnapshotKindId = '~@dxos/echo/SnapshotKind' as const;
export type SnapshotKindId = typeof SnapshotKindId;

/**
 * Kinds of entities stored in ECHO: objects and relations.
 */
export enum EntityKind {
  Object = 'object',
  Relation = 'relation',
}

export const EntityKindSchema = Schema.Enums(EntityKind);

/**
 * Typename for generic object references (Type.Obj / Type.Ref(Type.Obj)).
 * Used when referencing any object without a specific schema.
 */
export const ANY_OBJECT_TYPENAME = 'dxos.org/schema/AnyObject';

/**
 * Version for generic object references.
 */
export const ANY_OBJECT_VERSION = '0.0.0';
