//
// Copyright 2022 DXOS.org
//

import { useSyncExternalStore } from 'react';

import { type Echo, Filter, type Live, Query, type Space, isSpace } from '@dxos/client/echo';
import { useDeepCompareMemo } from '@dxos/react-hooks';

const EMPTY_ARRAY: never[] = [];

const noop = () => {};

// TODO(dmaretskyi): Queries are fully serializable, so we can remove `deps` argument.
interface UseQueryFn {
  <Q extends Query.Any>(spaceOrEcho: Space | Echo | undefined, query: Q, deps?: any[]): Live<Query.Type<Q>>[];

  /**
   * @deprecated Pass `Query` instead.
   */
  <F extends Filter.Any>(spaceOrEcho: Space | Echo | undefined, filter: F, deps?: any[]): Live<Filter.Type<F>>[];
}

/**
 * Create subscription.
 */
export const useQuery: UseQueryFn = (
  spaceOrEcho: Space | Echo | undefined,
  queryOrFilter: Query.Any | Filter.Any,
  deps?: any[],
): Live<unknown>[] => {
  const query = Filter.is(queryOrFilter) ? Query.select(queryOrFilter) : queryOrFilter;

  const { getObjects, subscribe } = useDeepCompareMemo(() => {
    let subscribed = false;
    const queryResult =
      spaceOrEcho === undefined
        ? undefined
        : isSpace(spaceOrEcho)
          ? spaceOrEcho.db.query(query)
          : spaceOrEcho.query(query);

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
  }, [spaceOrEcho, query.ast, ...(deps ?? [])]);

  const objects = useSyncExternalStore<Live<unknown>[] | undefined>(subscribe, getObjects);
  return objects ?? [];
};
