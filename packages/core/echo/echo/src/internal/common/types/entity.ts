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
 * Read the hidden `StaticTypeSchemaSlot` off any value that may carry one.
 * Returns `undefined` for raw schemas (no slot) and non-object inputs.
 * Single point-of-cast for the slot lookup.
 */
export const getStaticTypeSchema = (value: unknown): Schema.Schema.AnyNoContext | undefined => {
  if (value == null || typeof value !== 'object') {
    return undefined;
  }
  return (value as { [StaticTypeSchemaSlot]?: Schema.Schema.AnyNoContext })[StaticTypeSchemaSlot];
};

/**
 * Unwrap a Type-entity-like input to its underlying source Effect Schema; if
 * the input is already a raw schema (no slot), return it unchanged.
 *
 * The two callers — `createObject` and `Ref.Ref` — both want "the Effect
 * Schema the caller meant to register", whether they were handed a static
 * `Type.Type` entity or a raw `Schema.Schema`.
 */
export const unwrapToSchema = <S extends Schema.Schema.AnyNoContext>(
  input: S | { [StaticTypeSchemaSlot]?: S },
): S => {
  return (getStaticTypeSchema(input) as S | undefined) ?? (input as S);
};

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
 * Nominal brand carried by the well-known "any object" / "any relation"
 * schemas (`Obj.Unknown`, `Relation.Unknown`). The brand lets `Ref.Ref`,
 * `Filter.type`, and `Query.type` accept these schemas in addition to
 * `Type.Type` entities, without opening the door to arbitrary raw schemas.
 *
 * Stored as a string key so declarations remain portable across packages
 * (see KindId comment above).
 */
export const UnknownTypeSchemaBrandId = '~@dxos/echo/UnknownTypeSchemaBrand' as const;
export type UnknownTypeSchemaBrandId = typeof UnknownTypeSchemaBrandId;

/**
 * Schema-side companion to `Type.Type` entities for the "any object" /
 * "any relation" cases. Branded so `Ref.Ref` / `Filter.type` / `Query.type`
 * can pattern-match on it; arbitrary `Schema.Schema` values do not satisfy
 * this shape.
 */
export interface UnknownTypeSchema<A, K extends EntityKind> extends Schema.Schema<A, any, never> {
  readonly [UnknownTypeSchemaBrandId]: K;
}

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
