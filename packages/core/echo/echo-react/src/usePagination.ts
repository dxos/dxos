//
// Copyright 2026 DXOS.org
//

import { useCallback, useRef, useState } from 'react';

import { type Database, type Entity, type Query } from '@dxos/echo';

import { useQuery } from './useQuery';

export interface PaginationOptions {
  /** Items per page; the window grows by this on each {@link PaginationResult.loadMore}. */
  pageSize: number;
}

export interface PaginationResult<O> {
  /** The current window of results. Held stable across a window change so the list never blanks. */
  objects: O[];
  /** Extend the window by one page. A no-op while the window isn't full (already at the end). */
  loadMore: () => void;
  /** Whether the window is currently full — there may be more to load. */
  hasMore: boolean;
}

/**
 * Windowed pagination over a reactive query. `makeQuery(limit)` builds the query for a given window
 * size (typically `Query.select(...).limit(limit)`); the hook owns the window and grows it via
 * `loadMore`.
 *
 * Growing the window re-issues the query, and a query's reactive result is briefly empty before it
 * resolves (especially when it routes to the host indexer). Calling `useQuery` with a changing limit
 * directly would therefore blank the list on each page — resetting scroll position. This hook instead
 * HOLDS the prior results until the new (superset) window resolves, so the consumer never sees an
 * empty frame. It resets when the query changes shape (a different filter / order / scope), i.e. a
 * genuinely different result set — detected by comparing the query built at a fixed sentinel limit.
 */
export const usePagination = <Q extends Query.Any>(
  resource: Database.Queryable | undefined,
  makeQuery: (limit: number) => Q,
  { pageSize }: PaginationOptions,
): PaginationResult<Entity.Entity<Query.Type<Q>>> => {
  type Item = Entity.Entity<Query.Type<Q>>;

  const [size, setSize] = useState(pageSize);
  const objects: Item[] = useQuery(resource, makeQuery(size));

  // Limit-independent identity of the query: growing the window keeps this stable, but a different
  // filter/order/scope changes it. `0` is a sentinel — this query is never executed.
  const baseKey = JSON.stringify(makeQuery(0).ast);
  const [shownBaseKey, setShownBaseKey] = useState(baseKey);
  const retained = useRef<Item[]>([]);
  if (baseKey !== shownBaseKey) {
    // The result set changed underneath us: reset the window and drop the retained page so the new set
    // isn't masked by the previous one's stale results. (setState during render — React re-renders.)
    setShownBaseKey(baseKey);
    setSize(pageSize);
    retained.current = [];
  }

  if (objects.length > 0) {
    retained.current = objects;
  }
  const stable = objects.length > 0 ? objects : retained.current;
  const hasMore = stable.length >= size;

  const loadMore = useCallback(() => {
    // Only grow when the window is full — a short result means the last page is already resident.
    setSize((current) => (stable.length >= current ? current + pageSize : current));
  }, [stable.length, pageSize]);

  return { objects: stable, loadMore, hasMore };
};
