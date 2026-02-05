//
// Copyright 2022 DXOS.org
//

import { useMemo, useSyncExternalStore } from 'react';

import { type Database, type Entity, Filter, Query } from '@dxos/echo';

const EMPTY_ARRAY: never[] = [];

const noop = () => {};

interface UseQueryFn {
  <Q extends Query.Any, O extends Entity.Entity<Query.Type<Q>> = Entity.Entity<Query.Type<Q>>>(
    resource: Database.Queryable | undefined,
    query: Q,
  ): O[];

  <F extends Filter.Any, O extends Entity.Entity<Filter.Type<F>> = Entity.Entity<Filter.Type<F>>>(
    resource: Database.Queryable | undefined,
    filter: F,
  ): O[];
}

/**
 * Create subscription.
 */
export const useQuery: UseQueryFn = (
  resource: Database.Queryable | undefined,
  queryOrFilter: Query.Any | Filter.Any,
): Entity.Any[] => {
  const query = Filter.is(queryOrFilter) ? Query.select(queryOrFilter) : queryOrFilter;

  const { getObjects, subscribe } = useMemo(() => {
    let queryResult = undefined;
    if (resource) {
      queryResult = resource.query(query);
    }

    let subscribed = false;
    return {
      getObjects: () => (subscribed && queryResult ? queryResult.results : EMPTY_ARRAY),
      subscribe: (cb: () => void) => {
        subscribed = true;
        const unsubscribe = queryResult?.subscribe(cb) ?? noop;
        return () => {
          unsubscribe?.();
          subscribed = false;
        };
      },
    };
  }, [resource, JSON.stringify(query.ast)]);

  // https://beta.reactjs.org/reference/react/useSyncExternalStore
  // NOTE: This hook will resubscribe whenever the callback passed to the first argument changes; make sure it is stable.
  const objects = useSyncExternalStore<Entity.Any[]>(subscribe, getObjects);
  return objects;
};
