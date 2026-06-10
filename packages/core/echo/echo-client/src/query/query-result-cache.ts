//
// Copyright 2026 DXOS.org
//

import { type Query, type QueryResult } from '@dxos/echo';
import { WeakDictionary } from '@dxos/util';

/**
 * Serializes a (scope-normalized) query into a stable cache key. Two calls that build the same
 * query AST share a key — and therefore a cached {@link QueryResult.QueryResult} — so the
 * per-instance `.atom` getter hands back the same atom over one underlying subscription.
 */
export const serializeQueryKey = (query: Query.Any): string => JSON.stringify(query.ast);

/**
 * Caches {@link QueryResult.QueryResult} instances keyed by serialized query AST so that repeated
 * `query(sameQuery)` calls return a shared instance. This keeps the per-instance `.atom` getter
 * stable across calls, so inline `query(...).atom` opens a single ECHO subscription instead of a
 * fresh one on every re-evaluation.
 *
 * Entries are held weakly: a result is reachable only while a caller variable or an active
 * `.atom`/`subscribe` finalizer references it. Once those drop, GC reclaims the result and the
 * {@link WeakDictionary}'s FinalizationRegistry evicts the dead key, so the cache cannot grow
 * without bound. An idle (unsubscribed) cached result is cheap — {@link QueryResult.QueryResult}
 * activates its context lazily on first subscribe.
 *
 * Callers must key on the already scope-normalized query (owning spaceId bound), so semantically
 * identical queries collapse to one entry while queries against different spaces stay distinct.
 */
export class QueryResultCache {
  // The value generic is erased to `any` because the cache is heterogeneous over query result
  // types; the per-call `QueryResult<T>` is supplied by the public `query` typedef, not here.
  readonly #byKey = new WeakDictionary<string, QueryResult.QueryResult<any>>();

  /**
   * Returns the cached result for the (normalized) query, constructing one via `factory` on a miss.
   */
  getOrCreate(query: Query.Any, factory: () => QueryResult.QueryResult<any>): QueryResult.QueryResult<any> {
    return this.#byKey.getOrInsertComputed(serializeQueryKey(query), factory);
  }

  /**
   * Number of live (non-collected) cached entries. Primarily for diagnostics and tests; the count
   * may lag GC since dead entries are only pruned once the FinalizationRegistry fires.
   */
  get size(): number {
    return this.#byKey.size;
  }
}
