//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

const _EchoSchemaBrandSymbol = Symbol.for('@dxos/echo/EchoSchemaBrand');

/**
 * Brand symbol for ECHO schemas to distinguish them from raw Effect schemas.
 * Used at runtime to mark EchoSchema instances as branded.
 * Cast to unique symbol for proper TypeScript brand tracking.
 */
export const EchoSchemaBrandSymbol: unique symbol = _EchoSchemaBrandSymbol as any;

/**
 * String key used to identify the kind of an entity (object or relation).
 *
 * NOTE: This is intentionally a string literal instead of a unique symbol.
 * Unique symbols cause TS4023 "cannot be named" errors when external packages
 * try to export types that reference this key (e.g., `export const Graph = ...`).
 * TypeScript cannot emit declaration files that reference unique symbols from
 * external modules. Using a string literal allows the type to be inlined in
 * declaration files, making the API portable across package boundaries.
 *
 * TODO(burdon): Consider if there's a way to get the type safety benefits of
 * unique symbols while maintaining declaration file portability.
 */
export const KindId = '@dxos/echo/kind' as const;
export type KindId = typeof KindId;

/**
 * Kinds of entities stored in ECHO: objects and relations.
 */
export enum EntityKind {
  Object = 'object',
  Relation = 'relation',
}

export const EntityKindSchema = Schema.Enums(EntityKind);
