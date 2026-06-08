//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { type QueryAST } from '@dxos/echo-protocol';

/**
 * Scope targeting a space's automerge documents.
 *
 * With no `spaceId`, targets the owning space — i.e. the space of whichever database
 * executes the query — so callers can reference "this space" without looking up its id.
 *
 * @example
 * ```ts
 * db.query(Filter.type(Person).from(Scope.space()));            // owning space
 * db.query(Filter.type(Person).from(Scope.space({ id: otherSpaceId }))); // a specific space
 * ```
 */
export const space = (options?: { id?: string; includeAllFeeds?: boolean }): QueryAST.SpaceScope => ({
  _tag: 'space',
  ...(options?.id !== undefined ? { spaceId: options.id } : {}),
  ...(options?.includeAllFeeds ? { includeAllFeeds: true } : {}),
});

/**
 * Scope targeting a code-shipped object/type registry.
 *
 * - `'local'`  — the in-process registry attached to the hypergraph (default).
 * - `'remote'` — a remote registry service (not yet implemented).
 *
 * @example
 * ```ts
 * // Discover all types — persisted in the space and code-shipped in the registry.
 * db.query(Filter.type(Type.Type).from(Scope.space(), Scope.registry()));
 * ```
 */
export const registry = (location: 'local' | 'remote' = 'local'): QueryAST.RegistryScope => ({
  _tag: 'registry',
  location,
});

/**
 * Scope targeting a specific feed (by its underlying queue DXN).
 */
export const feed = (feedUri: string): QueryAST.FeedScope => ({
  _tag: 'feed',
  feedUri,
});
