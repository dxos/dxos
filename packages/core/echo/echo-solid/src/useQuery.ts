//
// Copyright 2022 DXOS.org
//

import { type Accessor, createEffect, createMemo, createSignal, onCleanup } from 'solid-js';

import { type Database, type Entity, Filter, Query } from '@dxos/echo';

const EMPTY_ARRAY: never[] = [];

type MaybeAccessor<T> = T | Accessor<T>;

/**
 * Create a reactive query subscription.
 * Accepts either values or accessors for resource and query/filter.
 *
 * @param resource - The database or queryable resource (can be reactive)
 * @param queryOrFilter - The query or filter to apply (can be reactive)
 * @returns An accessor that returns the current query results
 */
export const useQuery = <T extends Entity.Any = Entity.Any>(
  resource: MaybeAccessor<Database.Queryable | undefined>,
  queryOrFilter: MaybeAccessor<Query.Any | Filter.Any>,
): Accessor<T[]> => {
  // Derive the normalized query from the input
  const query = createMemo(() => {
    const resolved = typeof queryOrFilter === 'function' ? queryOrFilter() : queryOrFilter;
    return Filter.is(resolved) ? Query.select(resolved) : resolved;
  });

  // Derive the query result object reactively
  const queryResult = createMemo(() => {
    const q = query();
    const resolvedResource = typeof resource === 'function' ? resource() : resource;
    return resolvedResource?.query(q);
  });

  // Store the current results in a signal
  const [objects, setObjects] = createSignal<T[]>(EMPTY_ARRAY as T[]);

  // Subscribe to query result changes
  createEffect(() => {
    const result = queryResult();
    if (!result) {
      // Keep previous value during transitions to prevent flickering
      return;
    }

    // Subscribe with immediate fire to get initial results
    const unsubscribe = result.subscribe(
      () => {
        setObjects(() => result.results as T[]);
      },
      { fire: true },
    );

    onCleanup(unsubscribe);
  });

  return objects;
};
