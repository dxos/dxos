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

  /**
   * Grace period (ms) after a page request before an as-yet-undelivered range is settled as the end
   * of the feed. Only matters for async (indexed) sources, where reaching the end produces no change
   * event to observe — a real page that arrives later still supersedes this via the live-update path,
   * so this is a safety net, not a hard cutoff. Defaults to 5000ms.
   */
  loadTimeout?: number;
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
type Snapshot<O> = { items: O[]; skip: number; limit: number; isLoading: boolean; hasMore: boolean };

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
 * a new range by opening a fresh `QueryResult` for it.
 *
 * Async-tolerant delivery: a `QueryResult` for a new range starts empty and only fills once its
 * source resolves — instantly for a cache-backed feed query, but after a round-trip for an
 * indexed (host) query. So the store never publishes the in-flight `QueryResult.results`
 * directly. It keeps the last non-empty window (`items`) and only swaps it on a real delivery,
 * which keeps the list stable (no flash-to-empty / scroll snap) while the next page loads. `hasMore`
 * and single-flight (`loading`) are driven by *delivered* results, not the transient window, so a
 * momentarily-empty range never looks like the end and never stalls paging.
 */
const createPaginationStore = <Q extends Query.Any, O extends Entity.Entity<Query.Type<Q>>>(
  resource: Database.Queryable | undefined,
  innerAst: Parameters<typeof Query.fromAst>[0],
  pageSize: number,
  initialMaxWindowSize: number,
  loadTimeout: number,
) => {
  let maxWindowSize = initialMaxWindowSize;
  let skip = 0;
  let limit = pageSize;
  let subscribed = false;
  let queryResult: QueryResult.QueryResult<Query.Type<Q>> | undefined;
  let innerUnsubscribe: (() => void) | undefined;
  let settleTimer: ReturnType<typeof setTimeout> | undefined;

  // The visible window, held across range changes: only replaced by a non-empty delivery, a live
  // update to the settled range, or an identity reset (a fresh store). Holding it is what prevents
  // the flash-to-empty when an async page is in flight.
  let items: O[] = EMPTY_ARRAY;
  // From the last delivered page: a full page (>= limit) means there may be more. Kept in state (not
  // derived from the in-flight window) so a transient empty range doesn't read as "no more".
  let hasMore = false;
  // A range change is in flight and hasn't delivered — the single-flight guard for async pages, so
  // paging can't stack requests while a page loads across ticks.
  let loading = false;
  // Same-tick burst guard: a cache-backed (feed) delivery clears `loading` synchronously inside
  // `getNext`, so `loading` alone wouldn't stop a virtualizer firing `onChange` many times in one
  // tick. Set synchronously, cleared on the next microtask, so the whole burst collapses to one page.
  let pending = false;

  let snapshot: Snapshot<O> = { items, skip, limit, isLoading: loading, hasMore };
  const listeners = new Set<() => void>();

  const publish = () => {
    snapshot = { items, skip, limit, isLoading: loading, hasMore };
    for (const listener of listeners) {
      listener();
    }
  };

  const clearSettleTimer = () => {
    if (settleTimer !== undefined) {
      clearTimeout(settleTimer);
      settleTimer = undefined;
    }
  };

  // Called on every `QueryResult` change (and once synchronously per range change, for cache-backed
  // queries whose results are already present). While a range change is loading, an empty result is
  // held (the range hasn't resolved yet); a non-empty result completes the load. Once settled, a
  // change is a live update to the current range and is reflected as-is (including emptying).
  const onDelivered = () => {
    if (!subscribed || !queryResult) {
      return;
    }
    const results = queryResult.results as O[];
    if (loading) {
      if (results.length === 0) {
        return; // Range not yet resolved — hold the previous window; `settleTimer` handles the end.
      }
      clearSettleTimer();
      loading = false;
    }
    items = results;
    hasMore = results.length >= limit;
    publish();
  };

  // Reaching the end of an async feed produces no change event (the empty result matches the empty
  // initial cache), so a range that never delivers is settled here as the end — keeping the current
  // window visible. A page that arrives after this still supersedes it via `onDelivered`'s
  // live-update path, so an over-eager timeout self-corrects.
  const settleEnd = () => {
    settleTimer = undefined;
    if (!loading) {
      return;
    }
    const results = subscribed && queryResult ? (queryResult.results as O[]) : EMPTY_ARRAY;
    loading = false;
    if (results.length > 0) {
      items = results;
      hasMore = results.length >= limit;
    } else {
      hasMore = false; // No page arrived — treat the requested range as the end; hold `items`.
    }
    publish();
  };

  // (Re)points the query at the current skip/limit. Subscribes *before* reading `.results`, since a
  // `QueryResult` with no subscribers throws on `.results`.
  const pointAtRange = () => {
    clearSettleTimer();
    innerUnsubscribe?.();
    innerUnsubscribe = undefined;
    queryResult = undefined;

    if (!resource) {
      loading = false;
      items = EMPTY_ARRAY;
      hasMore = false;
      publish();
      return;
    }

    // `Query.fromAst` necessarily erases the entity type to `Query.Any`; the cast restores it,
    // which is sound because only `skip`/`limit` were layered on top of the caller's own query's
    // selection/filter/type -- the entity type this query selects is unchanged from `Q`.
    const effectiveQuery = Query.fromAst(innerAst).skip(skip).limit(limit) as Q;
    const nextQueryResult = resource.query(effectiveQuery);
    loading = true;
    innerUnsubscribe = nextQueryResult.subscribe(() => onDelivered());
    queryResult = nextQueryResult;
    // Deliver synchronously for cache-backed (feed) queries whose results are already present; an
    // async (indexed) query stays loading and holds the previous window until `onDelivered` fires.
    onDelivered();
    publish();
    if (loading) {
      settleTimer = setTimeout(settleEnd, loadTimeout);
    }
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
          clearSettleTimer();
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
      // Single-flight (`pending` for the same-tick burst, `loading` for an async page in flight) and
      // driven by delivered `hasMore`, so a burst of virtualizer `onChange` calls (one per
      // newly-rendered row) collapses to one page request, and a page still loading never triggers
      // another.
      if (pending || loading || !hasMore) {
        return;
      }
      pending = true;
      queueMicrotask(() => {
        pending = false;
      });
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
      if (pending || loading || skip === 0) {
        return;
      }
      pending = true;
      queueMicrotask(() => {
        pending = false;
      });
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
  const loadTimeout = options?.loadTimeout ?? 5000;

  // A new store -- and thus a reset to empty -- is only built when "what" is being shown changes:
  // filter/order (`innerAstKey`), page size, or `resource` (matching `useQuery`, which likewise
  // keys its memo on `resource` directly rather than just its truthiness).
  const store = useMemo(
    () => createPaginationStore<Q, O>(resource, innerAst, pageSize, maxWindowSize, loadTimeout),
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
    hasMore: snapshot.hasMore,
    isLoading: snapshot.isLoading,
    atHead: snapshot.skip === 0,
    jumpToHead: store.jumpToHead,
  };
};
