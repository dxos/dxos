//
// Copyright 2022 DXOS.org
//

import { useMemo, useSyncExternalStore } from 'react';

import { type Database, type Echo, type Entity, Filter, Query, type Space, isSpace } from '@dxos/client/echo';
import { type AnyProperties } from '@dxos/echo/internal';

const EMPTY_ARRAY: never[] = [];

const noop = () => {};

// TODO(dmaretskyi): Queries are fully serializable, so we can remove `deps` argument.
interface UseQueryFn {
  <Q extends Query.Any, O extends Entity.Entity<Query.Type<Q>> = Entity.Entity<Query.Type<Q>>>(
    spaceOrEcho: Space | Echo | Database.Queryable | undefined,
    query: Q,
    deps?: any[],
  ): O[];

  <F extends Filter.Any, O extends Entity.Entity<Filter.Type<F>> = Entity.Entity<Filter.Type<F>>>(
    spaceOrEcho: Space | Echo | Database.Queryable | undefined,
    filter: F,
    deps?: any[],
  ): O[];
}

/**
 * Create subscription.
 */
// TODO(burdon): Sort?
export const useQuery: UseQueryFn = (
  // TODO(burdon): CRITICAL: Remove Space and just requre Queryable.
  resource: Space | Echo | Database.Queryable | undefined,
  queryOrFilter: Query.Any | Filter.Any,
  deps?: any[],
): Entity.Entity<AnyProperties>[] => {
  const query = Filter.is(queryOrFilter) ? Query.select(queryOrFilter) : queryOrFilter;

  const { getObjects, subscribe } = useMemo(() => {
    let queryResult = undefined;
    if (resource) {
      queryResult = isSpace(resource) ? resource.db.query(query) : resource.query(query);
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
  }, [resource, JSON.stringify(query.ast), ...(deps ?? [])]);

  // https://beta.reactjs.org/reference/react/useSyncExternalStore
  // NOTE: This hook will resubscribe whenever the callback passed to the first argument changes; make sure it is stable.
  const objects = useSyncExternalStore<Entity.Entity<AnyProperties>[] | undefined>(subscribe, getObjects);
  return objects ?? [];
};
