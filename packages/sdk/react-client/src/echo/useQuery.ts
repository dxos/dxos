//
// Copyright 2022 DXOS.org
//

import { useMemo, useSyncExternalStore } from 'react';

import { type Echo, Filter, type Live, Query, type Space, isSpace } from '@dxos/client/echo';

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
): unknown[] => {
  const query = Filter.is(queryOrFilter) ? Query.select(queryOrFilter) : queryOrFilter;

  const { getObjects, subscribe } = useMemo(() => {
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
  }, [spaceOrEcho, ...JSON.stringify(query.ast), ...(deps ?? [])]);

  // https://beta.reactjs.org/reference/react/useSyncExternalStore
  // NOTE: This hook will resubscribe whenever the callback passed to the first argument changes; make sure it is stable.
  const objects = useSyncExternalStore<unknown[] | undefined>(subscribe, getObjects);
  return objects ?? [];
};

const noop = () => {};

const EMPTY_ARRAY: never[] = [];
