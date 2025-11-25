//
// Copyright 2022 DXOS.org
//

import { useMemo, useSyncExternalStore } from 'react';

import { type Database, type Echo, Filter, type Live, Query, type Space, isSpace } from '@dxos/client/echo';

const EMPTY_ARRAY: never[] = [];

const noop = () => {};

// TODO(dmaretskyi): Queries are fully serializable, so we can remove `deps` argument.
interface UseQueryFn {
  <Q extends Query.Any>(
    spaceOrEcho: Space | Echo | Database.Queryable | undefined,
    query: Q,
    deps?: any[],
  ): Live<Query.Type<Q>>[];

  <F extends Filter.Any>(
    spaceOrEcho: Space | Echo | Database.Queryable | undefined,
    filter: F,
    deps?: any[],
  ): Live<Filter.Type<F>>[];
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
): Live<unknown>[] => {
  const query = Filter.is(queryOrFilter) ? Query.select(queryOrFilter) : queryOrFilter;

  const { getObjects, subscribe } = useMemo(() => {
    let queryResult = undefined;
    if (resource) {
      queryResult = isSpace(resource) ? resource.db.query(query) : resource.query(query);
    }

    let subscribed = false;
    return {
      getObjects: () => (subscribed && queryResult ? queryResult.objects : EMPTY_ARRAY),
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
  const objects = useSyncExternalStore<Live<unknown>[] | undefined>(subscribe, getObjects);
  return objects ?? [];
};
