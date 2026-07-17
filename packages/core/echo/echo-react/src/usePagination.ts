//
// Copyright 2026 DXOS.org
//

import { useMemo, useSyncExternalStore } from 'react';

import { type Database, type Entity, Query } from '@dxos/echo';

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
  /**
   * Whether a range query is in flight -- true from when a range is requested until it delivers its
   * first result (including the initial load), false once settled (even if the result is empty).
   * Lets a consumer distinguish "still loading" from "loaded and empty".
   */
  isLoading: boolean;
  /** False once eviction has detached the window from the live head (i.e. skip > 0). */
  atHead: boolean;
  /** Resets to the newest page and resumes live updates. */
  jumpToHead: () => void;
};

/** Reactive snapshot handed to React by `useSyncExternalStore`; a fresh object only on real change. */
type Snapshot<O> = { items: O[]; skip: number; limit: number; isLoading: boolean };

/**
 * The element type a paginated query yields: the flat record for an aggregate query (branded with
 * {@link Query.AggregateResult}), otherwise the query's entity type. Mirrors `useQuery`'s overloads.
 */
type PaginationElement<Q extends Query.Any> =
  Query.Type<Q> extends Query.AggregateResult ? Query.Type<Q> : Entity.Entity<Query.Type<Q>>;

/**
 * Builds the external store backing `usePagination` for one query identity (filter/order/page
 * size/resource). Mirrors `useQuery`'s own `useMemo`-built `{ getObjects, subscribe }` pair as
 * closely as the added pagination state allows: nothing is queried and `.results` is never read
 * until `subscribe()` is called (i.e. from `useSyncExternalStore`'s commit-safe effect, never
 * during render). `getSnapshot` returns the last *delivered* results (`displayItems`), which are
 * only replaced once a newly-pointed range actually produces a result -- so the previous page stays
 * visible (rather than flashing empty) while an async range loads. `QueryResultImpl` still owns
 * recompute/dedup; we only retain the most recent delivered array.
 *
 * `skip`/`limit` live as plain closure state rather than React state: pagination is internal
 * bookkeeping for *which range this same identity is currently showing*, not a prop the rest of
 * the component tree needs to read independently. `getNext`/`getPrevious` re-point the query at
 * a new range by opening a fresh `QueryResult` for it, without discarding the previous one's
 * results until the new one delivers its own -- that's what keeps the previous page visible while
 * the new one loads (see the hook's own doc comment for why that matters).
 */
const createPaginationStore = <Q extends Query.Any, O>(
  resource: Database.Queryable | undefined,
  innerAst: Parameters<typeof Query.fromAst>[0],
  pageSize: number,
  initialMaxWindowSize: number,
) => {
  let maxWindowSize = initialMaxWindowSize;
  let skip = 0;
  let limit = pageSize;
  // Single-flight latch coalescing a synchronous burst of `getNext`/`getPrevious` into one range
  // change: a virtualizer's `onChange` fires once per newly-rendered row, so one "scrolled near the
  // edge" gesture can invoke the callback many times before React re-renders with the new range.
  // Set and checked synchronously within the call (so the whole burst sees it, no dependency on a
  // render in between) and cleared on the next microtask, so a later genuine gesture isn't blocked.
  // Purely about coalescing re-entrant calls -- whether the query has delivered is `isLoading`'s job.
  let rangeChangePending = false;
  let innerUnsubscribe: (() => void) | undefined;
  // Whether a range query is in flight: true from the moment a range is (re)pointed until that range
  // delivers its first result (including the initial load), then false. Cleared on genuine delivery
  // (in the subscribe callback), never on a timer: async sources (feeds served by the index) stay
  // `true` until the host's first response lands, and since even an empty feed notifies, this settles
  // rather than sticking. A real "still loading" signal, so consumers can tell "loading" apart from
  // "loaded and empty". Initialised to whether there is a resource to load at all.
  let isLoading = resource !== undefined;
  // The items currently shown. Held across a range change until the new range delivers its own
  // results, so the list never flickers to empty while a new (possibly async) range loads.
  let displayItems: O[] = EMPTY_ARRAY;
  let snapshot: Snapshot<O> = { items: displayItems, skip, limit, isLoading };
  const listeners = new Set<() => void>();

  const notify = () => {
    snapshot = { items: displayItems, skip, limit, isLoading };
    for (const listener of listeners) {
      listener();
    }
  };

  // (Re)points the query at the current skip/limit.
  //
  // TODO(wittjosiah): For feeds, this re-fetches/decodes the whole feed on every range change --
  // only what's rendered is bounded, not what's fetched. Needs index-backed keyset pagination to
  // fix properly.
  const pointAtRange = () => {
    innerUnsubscribe?.();
    innerUnsubscribe = undefined;

    if (!resource) {
      displayItems = EMPTY_ARRAY;
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

    // Publish the new range's results only once they exist, and clear `isLoading` on that first
    // delivery. `subscribe({ fire: true })` invokes the callback synchronously for synchronous
    // sources (authoritative results, possibly empty) and defers it until the first response for
    // asynchronous sources (e.g. a feed served by the index) -- that first response always arrives,
    // even for an empty feed, so `isLoading` clears on genuine delivery without ever sticking. Until
    // then `displayItems` keeps showing the previous range, so the list never flickers to empty while
    // a new range loads. The callback also fires on every later change (keeping the window live);
    // those later fires leave the already-false `isLoading` untouched.
    innerUnsubscribe = nextQueryResult.subscribe(
      () => {
        displayItems = nextQueryResult.results as O[];
        isLoading = false;
        notify();
      },
      { fire: true },
    );

    // Reflect the in-flight state without clobbering `displayItems` (which still holds the previous
    // range for async sources; synchronous sources have already replaced it, and cleared `isLoading`,
    // above).
    notify();
    // Clear the re-entrancy latch on the next microtask: long enough to coalesce a synchronous burst
    // within one tick, but not tied to delivery -- `isLoading` (cleared only on delivery) is what
    // guards against requesting the next range before this one lands, so a later gesture on a settled
    // window can proceed once the latch lifts.
    queueMicrotask(() => {
      rangeChangePending = false;
    });
  };

  return {
    subscribe: (onStoreChange: () => void) => {
      listeners.add(onStoreChange);
      if (listeners.size === 1) {
        pointAtRange();
      }
      return () => {
        listeners.delete(onStoreChange);
        if (listeners.size === 0) {
          innerUnsubscribe?.();
          innerUnsubscribe = undefined;
        }
      };
    },
    getSnapshot: (): Snapshot<O> => snapshot,
    setMaxWindowSize: (value: number) => {
      maxWindowSize = value;
    },
    getNext: () => {
      if (isLoading || rangeChangePending || snapshot.items.length < limit) {
        return;
      }
      rangeChangePending = true;
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
      if (isLoading || rangeChangePending || skip === 0) {
        return;
      }
      rangeChangePending = true;
      // Slides the window toward the head at constant size (limit unchanged) -- decreasing skip
      // while holding limit fixed both reveals newer items at the front and drops an equal count
      // of the oldest loaded items, mirroring getNext's own "slide" branch (taken once it hits
      // maxWindowSize) in the opposite direction.
      skip = Math.max(0, skip - pageSize);
      pointAtRange();
    },
    jumpToHead: () => {
      rangeChangePending = false;
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
 * Keeps showing the previous page while a new one loads: `items` only resets to empty when the
 * query's filter/order/page-size/resource identity changes, not when `skip`/`limit` move.
 *
 * @example
 * ```tsx
 * const { items, getNext, hasMore, isLoading, atHead, jumpToHead } = usePagination(
 *   db,
 *   Query.select(Filter.type(Message.Message)).from(feed).orderBy(Order.natural('desc')).limit(50),
 * );
 * ```
 */
export const usePagination = <Q extends Query.Any>(
  resource: Database.Queryable | undefined,
  query: Q,
  options?: UsePaginationOptions,
): PaginationResult<PaginationElement<Q>> => {
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
    () => createPaginationStore<Q, PaginationElement<Q>>(resource, innerAst, pageSize, maxWindowSize),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resource, innerAstKey, pageSize],
  );
  // `maxWindowSize` deliberately isn't part of the store's `useMemo` deps above (a caller passing
  // a literal default each render shouldn't reset the window), but a genuine change should still
  // take effect immediately rather than only on the next unrelated identity change.
  store.setMaxWindowSize(maxWindowSize);

  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);

  // Stable across renders that don't change `snapshot` (`store`'s own methods are already stable
  // per store identity) -- callers can pass this straight through to a memoized child (e.g. a
  // virtualizer's pagination callbacks) without re-destructuring and re-bundling it themselves.
  return useMemo(
    () => ({
      items: snapshot.items,
      getNext: store.getNext,
      getPrevious: store.getPrevious,
      hasMore: snapshot.items.length >= snapshot.limit,
      isLoading: snapshot.isLoading,
      atHead: snapshot.skip === 0,
      jumpToHead: store.jumpToHead,
    }),
    [snapshot, store],
  );
};
