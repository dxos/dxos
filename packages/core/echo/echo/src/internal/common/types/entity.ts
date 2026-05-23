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
 * Hidden slot on a static `Type.Type` entity that holds the source Effect
 * Schema. `Type.getSchema(...)` reads this for static types; persisted types
 * rebuild from `jsonSchema` instead. Stored as a string key for declaration
 * portability (see KindId comment above).
 */
export const StaticTypeSchemaSlot = '~@dxos/echo/Type.StaticSchema' as const;
export type StaticTypeSchemaSlot = typeof StaticTypeSchemaSlot;

/**
 * Phantom string key on `Type<A>` entities that carries the instance type `A`.
 * Lets internal helpers (`makeObject`, `createObject`, etc.) pattern-match the
 * instance type from an entity input without importing from the top-level
 * `Type` module. Mirrors `Type.InstancePhantomId` (declared in `Type.ts`).
 *
 * Stored as a string key so declarations remain portable across packages
 * (see KindId comment above).
 */
export const InstancePhantomId = '~@dxos/echo/Type.Instance' as const;
export type InstancePhantomId = typeof InstancePhantomId;

/**
 * Kinds of entities stored in ECHO: objects, relations, and types.
 */
export enum EntityKind {
  Object = 'object',
  Relation = 'relation',
  Type = 'type',
}

export const EntityKindSchema = Schema.Enums(EntityKind);

/**
 * Typename for generic object references (Type.Obj / Ref.Ref(Obj.Unknown)).
 * Used when referencing any object without a specific schema.
 */
export const ANY_OBJECT_TYPENAME = 'org.dxos.schema.anyObject';

/**
 * Version for generic object references.
 */
export const ANY_OBJECT_VERSION = '0.0.0';
