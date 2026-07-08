//
// Copyright 2022 DXOS.org
//

import { useMemo, useSyncExternalStore } from 'react';

import { type Database, type Entity, Filter, Query } from '@dxos/echo';

const EMPTY_ARRAY: never[] = [];

const noop = () => {};

interface UseQueryFn {
  <K, Row, O extends Entity.Entity<Row> = Entity.Entity<Row>>(
    resource: Database.Queryable | undefined,
    query: Query.Query<Query.Group<K, Row>>,
  ): Query.Group<K, O>[];

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
 *
 * @param queryOrFilter - The query or filter to apply. Query is memoized based on the AST. No need to call useMemo.
 */
// The overloaded public signature returns `O[]` (entities) or `Group<K, O>[]` (grouped queries)
// depending on the query shape; the implementation forwards whatever the query result produces,
// so — as with any implementation of a multi-signature overloaded function type — it is typed
// as `any[]` here rather than picking one of the mutually-incompatible overload return shapes.
export const useQuery: UseQueryFn = (
  resource: Database.Queryable | undefined,
  queryOrFilter: Query.Any | Filter.Any,
): any[] => {
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
  const objects = useSyncExternalStore<any[]>(subscribe, getObjects);
  return objects;
};
