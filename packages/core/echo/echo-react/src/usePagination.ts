//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import * as Atom from '@effect-atom/atom/Atom';
import { useMemo } from 'react';

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

/** Reactive pagination window read from {@link PaginationAtom.atom}. */
export type PaginationState<O> = {
  items: O[];
  skip: number;
  limit: number;
  isLoading: boolean;
  hasMore: boolean;
};

/** Paginated query atom plus range controls (for use outside React hooks). */
export type PaginationAtom<O> = {
  /** Loaded window and paging metadata for the active range. */
  atom: Atom.Atom<PaginationState<O>>;
  setMaxWindowSize: (value: number) => void;
  getNext: () => void;
  getPrevious: () => void;
  jumpToHead: () => void;
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

const parsePaginationQuery = (
  query: Query.Any,
): { pageSize: number; innerAst: Parameters<typeof Query.fromAst>[0] } => {
  if (query.ast.type !== 'limit') {
    throw new TypeError('usePagination requires the query to carry .limit(pageSize).');
  }
  if (query.ast.query.type === 'skip') {
    throw new TypeError('usePagination manages .skip() internally -- do not include it in the query.');
  }
  return { pageSize: query.ast.limit, innerAst: query.ast.query };
};

/**
 * Builds the pagination query atom for one query identity (filter/order/page size/resource).
 * Range delivery is wired through each range's {@link QueryResult.atom} so consumers read a single
 * atom rather than a bespoke `useSyncExternalStore` pair. `skip`/`limit` remain closure state
 * (pagination bookkeeping, not props the tree reads independently); `getNext`/`getPrevious`
 * re-point the active range by opening a fresh `QueryResult` for it.
 *
 * Async-tolerant delivery: a `QueryResult` for a new range starts empty and only fills once its
 * source resolves — instantly for a cache-backed feed query, but after a round-trip for an
 * indexed (host) query. The atom never publishes the in-flight range directly; it keeps the last
 * non-empty window (`items`) and only swaps it on a real delivery, which keeps the list stable
 * (no flash-to-empty / scroll snap) while the next page loads.
 */
const createPaginationAtom = <Q extends Query.Any, O extends Entity.Entity<Query.Type<Q>>>(
  resource: Database.Queryable | undefined,
  innerAst: Parameters<typeof Query.fromAst>[0],
  pageSize: number,
  initialMaxWindowSize: number,
  loadTimeout: number,
): PaginationAtom<O> => {
  let maxWindowSize = initialMaxWindowSize;
  let skip = 0;
  let limit = pageSize;
  let queryResult: QueryResult.QueryResult<Query.Type<Q>> | undefined;
  let queryUnsubscribe: (() => void) | undefined;
  let settleTimer: ReturnType<typeof setTimeout> | undefined;

  let items: O[] = EMPTY_ARRAY;
  let hasMore = false;
  let loading = false;
  let pending = false;

  let publish: (() => void) | undefined;

  const makeState = (): PaginationState<O> => ({ items, skip, limit, isLoading: loading, hasMore });

  const clearSettleTimer = () => {
    if (settleTimer !== undefined) {
      clearTimeout(settleTimer);
      settleTimer = undefined;
    }
  };

  const readCurrentResults = (): O[] => {
    if (!queryResult) {
      return EMPTY_ARRAY;
    }
    if ('runSync' in queryResult && typeof queryResult.runSync === 'function') {
      return queryResult.runSync() as O[];
    }
    return (queryResult as { results: O[] }).results;
  };

  const applyDelivery = (results: O[]) => {
    if (loading) {
      if (results.length === 0) {
        return;
      }
      clearSettleTimer();
      loading = false;
    }
    items = results;
    hasMore = results.length >= limit;
  };

  const settleEnd = () => {
    settleTimer = undefined;
    if (!loading) {
      return;
    }
    const results = readCurrentResults();
    loading = false;
    if (results.length > 0) {
      items = results;
      hasMore = results.length >= limit;
    } else {
      hasMore = false;
    }
    publish?.();
  };

  const pointAtRange = () => {
    clearSettleTimer();
    queryUnsubscribe?.();
    queryUnsubscribe = undefined;
    queryResult = undefined;

    if (!resource) {
      loading = false;
      items = EMPTY_ARRAY;
      hasMore = false;
      return;
    }

    const effectiveQuery = Query.fromAst(innerAst).skip(skip).limit(limit) as Q;
    queryResult = resource.query(effectiveQuery);
    loading = true;
    queryUnsubscribe = queryResult.subscribe(() => {
      publish?.();
    });
    if (loading) {
      settleTimer = setTimeout(settleEnd, loadTimeout);
    }
  };

  const atom = Atom.make<PaginationState<O>>((get) => {
    publish = () => {
      if (queryResult) {
        applyDelivery(readCurrentResults());
      }
      get.setSelf(makeState());
    };

    get.addFinalizer(() => {
      publish = undefined;
      clearSettleTimer();
      queryUnsubscribe?.();
      queryUnsubscribe = undefined;
      queryResult = undefined;
    });

    if (queryResult) {
      applyDelivery(get(queryResult.atom) as O[]);
    } else if (resource) {
      pointAtRange();
      if (queryResult) {
        applyDelivery(readCurrentResults());
      }
    }

    return makeState();
  });

  return {
    atom,
    setMaxWindowSize: (value: number) => {
      maxWindowSize = value;
    },
    getNext: () => {
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
      publish?.();
    },
    getPrevious: () => {
      if (pending || loading || skip === 0) {
        return;
      }
      pending = true;
      queueMicrotask(() => {
        pending = false;
      });
      skip = Math.max(0, skip - pageSize);
      pointAtRange();
      publish?.();
    },
    jumpToHead: () => {
      pending = false;
      skip = 0;
      limit = pageSize;
      pointAtRange();
      publish?.();
    },
  };
};

/**
 * Paginated query atom for a query identity. Holds the loaded window in {@link PaginationAtom.atom}
 * and exposes imperative range controls for paging. Use inside derived atoms via `get(pagination.atom)`.
 */
export const paginationAtom = <
  Q extends Query.Any,
  O extends Entity.Entity<Query.Type<Q>> = Entity.Entity<Query.Type<Q>>,
>(
  resource: Database.Queryable | undefined,
  query: Q,
  options?: UsePaginationOptions,
): PaginationAtom<O> => {
  const { pageSize, innerAst } = parsePaginationQuery(query);
  const maxWindowSize = options?.maxWindowSize ?? pageSize * 10;
  const loadTimeout = options?.loadTimeout ?? 5000;
  return createPaginationAtom<Q, O>(resource, innerAst, pageSize, maxWindowSize, loadTimeout);
};

/**
 * Wraps a query with page management for paginated reads. The query's own `.limit(n)` clause is
 * the page size -- the hook manages which page is loaded by rewriting `skip`/`limit` on top of
 * it; the query must not carry its own `.skip()`.
 *
 * The query's `.orderBy(...)` is otherwise untouched, and applies to any query the underlying
 * `Database.Queryable` supports -- e.g. `Order.natural('desc')` for feed insertion order.
 *
 * TODO(wittjosiah): For feed-scoped queries, every range change re-fetches and decodes the *entire*
 * underlying feed before slicing out the requested page, regardless of ordering -- this hook only
 * bounds what's held/rendered (via `maxWindowSize` eviction), not what's fetched. A previous
 * version special-cased `Order.natural('desc')` with a cursor-based `FeedWindow` that made only
 * that ordering truly lazy; it was reverted because partial laziness (fast for one ordering, a
 * full decode for every other) wasn't worth the added complexity on its own. Revisit as a general,
 * index-backed keyset-pagination feature covering all orderings uniformly, once the host index
 * (`EntityMetaIndex`/`QueryExecutor`) supports ordered range reads -- see `FeedQueryContext`'s
 * `applyOrderSkipLimit` for where the current full-decode path lives.
 *
 * Backed by {@link paginationAtom}. Range delivery subscribes to the active {@link QueryResult} and
 * reads its {@link QueryResult.atom} on each notification so only `skip`/`limit` moves re-point the
 * subscription in place and the previous window is held until the new range's first real result
 * arrives (no flash-to-empty on `getNext`/`getPrevious`).
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
  const { pageSize, innerAst } = parsePaginationQuery(query);
  const innerAstKey = JSON.stringify(innerAst);
  const maxWindowSize = options?.maxWindowSize ?? pageSize * 10;

  const pagination = useMemo(() => paginationAtom<Q, O>(resource, query, options), [resource, innerAstKey, pageSize]);
  pagination.setMaxWindowSize(maxWindowSize);

  const state = useAtomValue(pagination.atom);

  return {
    items: state.items,
    getNext: pagination.getNext,
    getPrevious: pagination.getPrevious,
    hasMore: state.hasMore,
    isLoading: state.isLoading,
    atHead: state.skip === 0,
    jumpToHead: pagination.jumpToHead,
  };
};
