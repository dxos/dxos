//
// Copyright 2026 DXOS.org
//

import { useMemo, useSyncExternalStore } from 'react';

import { type Database, type Entity, Query, type QueryResult } from '@dxos/echo';

const EMPTY_ARRAY: never[] = [];

export type UsePaginationOptions = {
  /**
   * Max loaded items before the newest end is evicted (the window's start advances instead of
   * growing further). Defaults to 10x the query's page size.
   */
  maxWindowSize?: number;
};

export type PaginationResult<T> = {
  /** Loaded window, in query order (newest first for `Order.natural('desc')`). */
  items: T[];
  /** Extends toward older items by one page. Single-flight; no-op while loading or exhausted. */
  getNext: () => void;
  /**
   * Extends back toward the head by one page (the inverse of `getNext`). Single-flight; no-op
   * while loading or already at the head.
   */
  getPrevious: () => void;
  /** Whether older items remain beyond what is currently loaded. Inferred from the last page's size. */
  hasMore: boolean;
  isLoading: boolean;
  /** False once eviction has detached the window from the live head (i.e. skip > 0). */
  atHead: boolean;
  /** Resets to the newest page and resumes live updates. */
  jumpToHead: () => void;
};

/** Reactive snapshot handed to React by `useSyncExternalStore`; a fresh object only on real change. */
type Snapshot<O> = { items: O[]; skip: number; limit: number; isLoading: boolean };

/**
 * Builds the external store backing `usePagination` for one query identity (filter/order/page
 * size/resource). Mirrors `useQuery`'s own `useMemo`-built `{ getObjects, subscribe }` pair as
 * closely as the added pagination state allows: nothing is queried and `.results` is never read
 * until `subscribe()` is called (i.e. from `useSyncExternalStore`'s commit-safe effect, never
 * during render), and `getSnapshot` reads the live `QueryResult.results` rather than keeping a
 * second cache of its own -- `QueryResultImpl` already only recomputes it when the underlying data
 * actually changes, so there's nothing to duplicate.
 *
 * `skip`/`limit` live as plain closure state rather than React state: pagination is internal
 * bookkeeping for *which range this same identity is currently showing*, not a prop the rest of
 * the component tree needs to read independently. `getNext`/`getPrevious` re-point the query at
 * a new range by opening a fresh `QueryResult` for it, without discarding the previous one's
 * results until the new one delivers its own -- that's what keeps the previous page visible while
 * the new one loads (see the hook's own doc comment for why that matters).
 */
const createPaginationStore = <Q extends Query.Any, O extends Entity.Entity<Query.Type<Q>>>(
  resource: Database.Queryable | undefined,
  innerAst: Parameters<typeof Query.fromAst>[0],
  pageSize: number,
  initialMaxWindowSize: number,
) => {
  let maxWindowSize = initialMaxWindowSize;
  let skip = 0;
  let limit = pageSize;
  // Guards `getNext`/`getPrevious` against a burst of synchronous re-entrant calls within the
  // same tick (a virtualizer's `onChange` can fire once per newly-rendered row, so a single
  // "scrolled near the edge" event may invoke the callback many times before the first one's new
  // range has delivered a result). Plain closure state, checked and set synchronously inside the
  // call itself, so the rest of the burst sees it immediately -- no dependency on a render
  // happening in between.
  let pending = false;
  let subscribed = false;
  let queryResult: QueryResult.QueryResult<Query.Type<Q>> | undefined;
  let innerUnsubscribe: (() => void) | undefined;
  let isLoading = false;
  let snapshot: Snapshot<O> = { items: EMPTY_ARRAY, skip, limit, isLoading };
  const listeners = new Set<() => void>();

  const notify = () => {
    snapshot = {
      items: subscribed && queryResult ? (queryResult.results as O[]) : EMPTY_ARRAY,
      skip,
      limit,
      isLoading,
    };
    for (const listener of listeners) {
      listener();
    }
  };

  // (Re)points the query at the current skip/limit. Subscribes *before* publishing the new
  // `QueryResult` to `queryResult` (read by `getSnapshot`), since `.results` throws on a
  // `QueryResult` with no subscribers -- matching how `useQuery` never reads `.results` until
  // its own `subscribe()` has already run.
  const pointAtRange = () => {
    innerUnsubscribe?.();
    innerUnsubscribe = undefined;
    queryResult = undefined;

    if (!resource) {
      isLoading = false;
      notify();
      return;
    }

    // `Query.fromAst` necessarily erases the entity type to `Query.Any`; the cast restores it,
    // which is sound because only `skip`/`limit` were layered on top of the caller's own query's
    // selection/filter/type -- the entity type this query selects is unchanged from `Q`.
    const effectiveQuery = Query.fromAst(innerAst).skip(skip).limit(limit) as Q;
    const nextQueryResult = resource.query(effectiveQuery);
    isLoading = true;
    // Only refreshes `items` (via `notify`) when the data genuinely changes later -- `isLoading`/
    // `pending` are resolved separately below, since `QueryResultImpl` only re-emits `changed` on
    // an actual recompute difference, and this callback would never fire at all if the requested
    // range's recomputed result happens to already match the cached one -- ending the same "stuck
    // pending forever" bug this store previously worked around with an explicit `.run()`.
    innerUnsubscribe = nextQueryResult.subscribe(() => {
      notify();
    });
    queryResult = nextQueryResult;
    notify();
    // `notify()` above already published the best currently-known value for this range (complete
    // if it was already buffered, a transient undershoot otherwise -- the same thing `useQuery`
    // shows for any query that hasn't finished resolving yet). `isLoading`/`pending` gate this
    // tick's re-entrancy and a "just requested a new range" signal, not "the query is provably
    // fully settled", so resolving them on the next microtask -- rather than waiting on the
    // subscribe callback above, which may never fire -- keeps them from ever getting stuck, while
    // still blocking every synchronous call within the same burst (a virtualizer's `onChange` can
    // fire many times per tick for one user gesture, all before a single microtask elapses).
    queueMicrotask(() => {
      isLoading = false;
      pending = false;
      notify();
    });
  };

  return {
    subscribe: (onStoreChange: () => void) => {
      listeners.add(onStoreChange);
      if (listeners.size === 1) {
        subscribed = true;
        pointAtRange();
      }
      return () => {
        listeners.delete(onStoreChange);
        if (listeners.size === 0) {
          subscribed = false;
          innerUnsubscribe?.();
          innerUnsubscribe = undefined;
          queryResult = undefined;
        }
      };
    },
    getSnapshot: (): Snapshot<O> => snapshot,
    setMaxWindowSize: (value: number) => {
      maxWindowSize = value;
    },
    getNext: () => {
      if (pending || snapshot.items.length < limit) {
        return;
      }
      pending = true;
      const nextLimit = limit + pageSize;
      if (nextLimit <= maxWindowSize) {
        limit = nextLimit;
      } else {
        limit = maxWindowSize;
        skip += pageSize;
      }
      pointAtRange();
    },
    getPrevious: () => {
      if (pending || skip === 0) {
        return;
      }
      pending = true;
      // Slides the window toward the head at constant size (limit unchanged) -- decreasing skip
      // while holding limit fixed both reveals newer items at the front and drops an equal count
      // of the oldest loaded items, mirroring getNext's own "slide" branch (taken once it hits
      // maxWindowSize) in the opposite direction.
      skip = Math.max(0, skip - pageSize);
      pointAtRange();
    },
    jumpToHead: () => {
      pending = false;
      skip = 0;
      limit = pageSize;
      pointAtRange();
    },
  };
};

/**
 * Wraps a query with page management for paginated reads. The query's own `.limit(n)` clause is
 * the page size -- the hook manages which page is loaded by rewriting `skip`/`limit` on top of
 * it; the query must not carry its own `.skip()`.
 *
 * The query's `.orderBy(...)` is otherwise untouched, and applies to any query the underlying
 * `Database.Queryable` supports -- e.g. `Order.natural('desc')` for feed insertion order.
 *
 * TODO(dxos): For feed-scoped queries, every range change re-fetches and decodes the *entire*
 * underlying feed before slicing out the requested page, regardless of ordering -- this hook only
 * bounds what's held/rendered (via `maxWindowSize` eviction), not what's fetched. A previous
 * version special-cased `Order.natural('desc')` with a cursor-based `FeedWindow` that made only
 * that ordering truly lazy; it was reverted because partial laziness (fast for one ordering, a
 * full decode for every other) wasn't worth the added complexity on its own. Revisit as a general,
 * index-backed keyset-pagination feature covering all orderings uniformly, once the host index
 * (`EntityMetaIndex`/`QueryExecutor`) supports ordered range reads -- see `FeedQueryContext`'s
 * `applyOrderSkipLimit` for where the current full-decode path lives.
 *
 * Backed by its own `useSyncExternalStore`-managed store per query identity, rather than
 * delegating to `useQuery`: a pagination-only range change (new `skip`/`limit`) produces a brand
 * new `QueryResult` instance, and `useQuery`'s snapshot always mirrors whatever query is passed
 * *right now* -- there's no way for it to keep showing the previous range's data while the new
 * range loads. That flash-to-empty on every `getNext`/`getPrevious` was collapsing the
 * virtualizer and snapping scroll position. Here, `items` is only reset to empty when the
 * underlying "what" (filter/order/page size/resource) changes identity -- a new store is built
 * for that case -- not when only `skip`/`limit` move, which re-points the *same* store's
 * subscription in place and keeps showing the previous window until the new range's first real
 * result arrives.
 *
 * @example
 * ```tsx
 * const { items, getNext, hasMore, isLoading, atHead, jumpToHead } = usePagination(
 *   db,
 *   Query.select(Filter.type(Message.Message)).from(feed).orderBy(Order.natural('desc')).limit(50),
 * );
 * ```
 */
export const usePagination = <
  Q extends Query.Any,
  O extends Entity.Entity<Query.Type<Q>> = Entity.Entity<Query.Type<Q>>,
>(
  resource: Database.Queryable | undefined,
  query: Q,
  options?: UsePaginationOptions,
): PaginationResult<O> => {
  if (query.ast.type !== 'limit') {
    throw new TypeError('usePagination requires the query to carry .limit(pageSize).');
  }
  if (query.ast.query.type === 'skip') {
    throw new TypeError('usePagination manages .skip() internally -- do not include it in the query.');
  }
  const pageSize = query.ast.limit;
  const innerAst = query.ast.query;
  const innerAstKey = JSON.stringify(innerAst);
  const maxWindowSize = options?.maxWindowSize ?? pageSize * 10;

  // A new store -- and thus a reset to empty -- is only built when "what" is being shown changes:
  // filter/order (`innerAstKey`), page size, or `resource` (matching `useQuery`, which likewise
  // keys its memo on `resource` directly rather than just its truthiness).
  const store = useMemo(
    () => createPaginationStore<Q, O>(resource, innerAst, pageSize, maxWindowSize),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resource, innerAstKey, pageSize],
  );
  // `maxWindowSize` deliberately isn't part of the store's `useMemo` deps above (a caller passing
  // a literal default each render shouldn't reset the window), but a genuine change should still
  // take effect immediately rather than only on the next unrelated identity change.
  store.setMaxWindowSize(maxWindowSize);

  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);

  return {
    items: snapshot.items,
    getNext: store.getNext,
    getPrevious: store.getPrevious,
    hasMore: snapshot.items.length >= snapshot.limit,
    isLoading: snapshot.isLoading,
    atHead: snapshot.skip === 0,
    jumpToHead: store.jumpToHead,
  };
};
