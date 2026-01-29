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
 * Kinds of entities stored in ECHO: objects and relations.
 */
export enum EntityKind {
  Object = 'object',
  Relation = 'relation',
}

export const EntityKindSchema = Schema.Enums(EntityKind);
