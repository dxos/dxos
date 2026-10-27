//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { type QueryAST } from '@dxos/echo-protocol';

import type * as Feed from './Feed.ts';

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
 *
 * @performance O(1); builds a scope node.
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
 *
 * @performance O(1); builds a scope node.
 */
export const registry = (location: 'local' | 'remote' = 'local'): QueryAST.RegistryScope => ({
  _tag: 'registry',
  location,
});

/** Options for {@link feed}. */
export type FeedScopeOptions = {
  /**
   * Only items that are members of these branches: a branch id, or `null` for the main branch;
   * `'all'` reads every branch. Omit to read the main branch only.
   *
   * The filter is by membership only: a branch's ancestor items up to its fork point are not
   * included — read them with `Feed.readBranch` over the whole feed.
   */
  branches?: ReadonlyArray<Feed.BranchId | null> | 'all';

  /**
   * Reads the feed as a walk along the path from the root branch to `branch`, in local order; select
   * with {@link Filter.feedCursor} to start after a local cursor and order with `Order.natural` for the
   * direction. `forks` also gives the base item of each branch that forks at a block the walk gives.
   */
  walk?: { branch?: Feed.BranchId | null; forks?: boolean };
};

/**
 * Scope targeting a specific feed (by its underlying queue EID).
 *
 * To read only what follows a cursor, select with {@link Filter.feedCursor} — the bound is part of
 * the query, not of the scope.
 *
 * @example
 * ```ts
 * db.query(Query.select(Filter.feedCursor(cursor)).from(Scope.feed(feedUri)));
 * db.query(Query.select(Filter.everything()).from(Scope.feed(feedUri, { branches: [null] })));
 *
 * // Walk the root branch and then the branch, 50 items at a time.
 * db.query(
 *   Query.select(Filter.feedCursor({ begin: cursor, positions: 'local' }))
 *     .from(Scope.feed(feedUri, { walk: { branch } }))
 *     .orderBy(Order.natural('asc'))
 *     .limit(50),
 * );
 * ```
 *
 * @performance O(1); builds a scope node.
 */
export const feed = (feedUri: string, options?: FeedScopeOptions): QueryAST.FeedScope => ({
  _tag: 'feed',
  feedUri,
  ...(options?.branches === undefined
    ? {}
    : { branches: options.branches === 'all' ? ('all' as const) : [...options.branches] }),
  ...(options?.walk === undefined
    ? {}
    : {
        walk: {
          ...(options.walk.branch !== undefined ? { branch: options.walk.branch } : {}),
          ...(options.walk.forks !== undefined ? { forks: options.walk.forks } : {}),
        },
      }),
});
