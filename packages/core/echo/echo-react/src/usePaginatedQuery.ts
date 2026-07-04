//
// Copyright 2026 DXOS.org
//

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { type Database, type Entity, Query } from '@dxos/echo';

export type UsePaginatedQueryOptions = {
  /**
   * Max loaded items before the newest end is evicted (the window's start advances instead of
   * growing further). Defaults to 10x the query's page size.
   */
  maxWindowSize?: number;
};

export type PaginatedQueryResult<T> = {
  /** Loaded window, in query order (newest first for `Order.natural('desc')`). */
  items: T[];
  /** Extends toward older items by one page. Single-flight; no-op while loading or exhausted. */
  loadNext: () => void;
  /**
   * Extends back toward the head by one page (the inverse of `loadNext`). Single-flight; no-op
   * while loading or already at the head.
   */
  loadPrevious: () => void;
  /** Whether older items remain beyond what is currently loaded. Inferred from the last page's size. */
  hasMore: boolean;
  isLoading: boolean;
  /** False once eviction has detached the window from the live head (i.e. skip > 0). */
  atHead: boolean;
  /** Resets to the newest page and resumes live updates. */
  jumpToHead: () => void;
};

type Range = { identityKey: string; skip: number; limit: number };

/**
 * Wraps a query with page management for windowed (paginated) reads. The query's own `.limit(n)`
 * clause is the page size -- the hook manages which page is loaded by rewriting `skip`/`limit` on
 * top of it; the query must not carry its own `.skip()`.
 *
 * The query's `.orderBy(...)` is otherwise untouched. For lazily-loaded feeds, pass
 * `Order.natural('desc')` (see `@dxos/echo`'s `Feed`/`Order` modules) to get true windowed
 * loading -- other combinations still page correctly but fetch/sort in memory rather than
 * lazily (see `FeedQueryContext`).
 *
 * Manages its own query subscription rather than delegating to `useQuery`: a pagination-only
 * range change (new `skip`/`limit`) produces a brand new `QueryResult` instance, and `useQuery`'s
 * snapshot always mirrors whatever query is passed *right now* -- there's no way for it to keep
 * showing the previous range's data while the new range loads. That flash-to-empty on every
 * `loadNext`/`loadPrevious` was collapsing the virtualizer and snapping scroll position. Here,
 * `items` is only reset to empty when the underlying "what" (filter/order/page size/resource)
 * changes identity, not when only `skip`/`limit` move -- it keeps showing the previous window
 * until the new range's first real result arrives.
 *
 * @example
 * ```tsx
 * const { items, loadNext, hasMore, isLoading, atHead, jumpToHead } = usePaginatedQuery(
 *   db,
 *   Query.select(Filter.type(Message.Message)).from(feed).orderBy(Order.natural('desc')).limit(50),
 * );
 * ```
 */
export const usePaginatedQuery = <
  Q extends Query.Any,
  O extends Entity.Entity<Query.Type<Q>> = Entity.Entity<Query.Type<Q>>,
>(
  resource: Database.Queryable | undefined,
  query: Q,
  options?: UsePaginatedQueryOptions,
): PaginatedQueryResult<O> => {
  if (query.ast.type !== 'limit') {
    throw new TypeError('usePaginatedQuery requires the query to carry .limit(pageSize).');
  }
  if (query.ast.query.type === 'skip') {
    throw new TypeError('usePaginatedQuery manages .skip() internally -- do not include it in the query.');
  }
  const pageSize = query.ast.limit;
  const innerAst = query.ast.query;
  const innerAstKey = JSON.stringify(innerAst);
  const maxWindowSize = options?.maxWindowSize ?? pageSize * 10;

  // Pagination state (which page is loaded), reset whenever the underlying query (filter, order,
  // page size, or resource) changes identity.
  const identityKey = `${resource ? '1' : '0'}:${innerAstKey}:${pageSize}`;
  const [state, setState] = useState<Range>(() => ({ identityKey, skip: 0, limit: pageSize }));
  // Guards `loadNext`/`loadPrevious` against a burst of synchronous re-entrant calls within the same
  // tick (a virtualizer's `onChange` can fire once per newly-rendered row, so a single
  // "scrolled near the edge" event may invoke the callback many times before React re-renders
  // with the new range). `isLoading` state can't gate this: it only updates on the *next* render,
  // by which point the whole burst has already gone through. This ref is set synchronously the
  // instant the first call proceeds, so the rest of the burst sees it and no-ops immediately,
  // regardless of the render cycle.
  const pendingRef = useRef(false);
  if (state.identityKey !== identityKey) {
    setState({ identityKey, skip: 0, limit: pageSize });
    pendingRef.current = false;
  }
  const { skip, limit } = state.identityKey === identityKey ? state : { skip: 0, limit: pageSize };

  // `Query.fromAst` necessarily erases the entity type to `Query.Any`; the cast restores it,
  // which is sound because only `skip`/`limit` were layered on top of the caller's own `query`'s
  // selection/filter/type -- the entity type `effectiveQuery` selects is unchanged from `Q`.
  const effectiveQuery = useMemo(
    () => Query.fromAst(innerAst).skip(skip).limit(limit) as Q,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [innerAstKey, skip, limit],
  );

  const [items, setItems] = useState<O[]>([]);
  // Tracks which identityKey `items` currently reflects, so a pagination-only query change (same
  // identity, new skip/limit) can keep showing stale data instead of resetting to empty.
  const itemsIdentityRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!resource) {
      itemsIdentityRef.current = identityKey;
      setItems([]);
      return;
    }

    const queryResult = resource.query(effectiveQuery);
    if (itemsIdentityRef.current !== identityKey) {
      itemsIdentityRef.current = identityKey;
      setItems([]);
    }

    let cancelled = false;
    // Query results are always hydrated entities; `query()`'s/`run()`'s declared return types use
    // the raw schema type (`Query.Type<Q>`), matching `O = Entity.Entity<Query.Type<Q>>`.
    const unsubscribe = queryResult.subscribe(() => {
      if (cancelled) {
        return;
      }
      setItems(queryResult.results as O[]);
    });

    // `run()` awaits the query context's own async work (e.g. the shared `FeedWindow` extending
    // to cover the newly requested range) before resolving, unlike a synchronous `.results` read,
    // which can reflect a window that hasn't caught up yet -- e.g. advancing `skip` past what's
    // buffered synchronously undershoots to however many items happen to already be loaded, then
    // jumps up again once the fetch resolves. That transient shrink was visible as a jump under
    // the virtualizer on every eviction step. `run()` is still needed alongside `subscribe` above:
    // it's what supplies the correct value for *this* range (including the "already fully
    // buffered, no fetch needed" case where `changed` may never fire again); `subscribe` continues
    // to catch genuinely live updates after that.
    void queryResult.run().then((results) => {
      if (cancelled) {
        return;
      }
      setItems(results as O[]);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource, effectiveQuery]);

  const [isLoading, setIsLoading] = useState(false);
  const rangeRef = useRef({ skip, limit });
  if (rangeRef.current.skip !== skip || rangeRef.current.limit !== limit) {
    rangeRef.current = { skip, limit };
    setIsLoading(true);
  }

  useEffect(() => {
    setIsLoading(false);
    pendingRef.current = false;
  }, [items]);

  const hasMore = items.length >= limit;
  const hasMoreRef = useRef(hasMore);
  hasMoreRef.current = hasMore;

  const atHead = skip === 0;
  const atHeadRef = useRef(atHead);
  atHeadRef.current = atHead;

  const loadNext = useCallback(() => {
    if (pendingRef.current || !hasMoreRef.current) {
      return;
    }
    pendingRef.current = true;
    setState((prev) => {
      if (prev.identityKey !== identityKey) {
        return prev;
      }
      const nextLimit = prev.limit + pageSize;
      return nextLimit <= maxWindowSize
        ? { ...prev, limit: nextLimit }
        : { ...prev, limit: maxWindowSize, skip: prev.skip + pageSize };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identityKey, pageSize, maxWindowSize]);

  const loadPrevious = useCallback(() => {
    if (pendingRef.current || atHeadRef.current) {
      return;
    }
    pendingRef.current = true;
    setState((prev) => {
      if (prev.identityKey !== identityKey) {
        return prev;
      }
      // Slides the window toward the head at constant size (limit unchanged) -- decreasing skip
      // while holding limit fixed both reveals newer items at the front and drops an equal count
      // of the oldest loaded items, mirroring loadNext's own "slide" branch (taken once it hits
      // maxWindowSize) in the opposite direction.
      return { ...prev, skip: Math.max(0, prev.skip - pageSize) };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identityKey, pageSize]);

  const jumpToHead = useCallback(() => {
    pendingRef.current = false;
    setState({ identityKey, skip: 0, limit: pageSize });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identityKey, pageSize]);

  return { items, loadNext, loadPrevious, hasMore, isLoading, atHead, jumpToHead };
};
