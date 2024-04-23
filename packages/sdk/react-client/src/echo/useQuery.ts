//
// Copyright 2022 DXOS.org
//

import { useMemo, useSyncExternalStore } from 'react';

import type { QueryOptions, Query, FilterSource, Space, EchoReactiveObject } from '@dxos/client/echo';

type UseQuery = {
  <T extends EchoReactiveObject<any>>(
    space?: Space,
    filter?: FilterSource<T>,
    options?: QueryOptions,
    deps?: any[],
  ): T[];
};

/**
 * Create subscription.
 */
// TODO(burdon): Support typed operator filters (e.g., Note.filter(note => ...)).
export const useQuery: UseQuery = <T extends EchoReactiveObject<any>>(
  space?: Space,
  filter?: FilterSource<T>,
  options?: QueryOptions,
  deps?: any[],
) => {
  const { subscribe, getObjects } = useMemo(() => {
    const query = space?.db.query(filter, options) as Query<T> | undefined;

    return {
      subscribe: (cb: () => void) => query?.subscribe(cb) ?? noop,
      getObjects: () => query?.objects ?? EMPTY_ARRAY,
    };
  }, [space?.db, ...(typeof filter === 'function' ? [] : filterToDepsArray(filter)), ...(deps ?? [])]);

  // https://beta.reactjs.org/reference/react/useSyncExternalStore
  // NOTE: This hook will resubscribe whenever the callback passed to the first argument changes -- make sure it is stable.
  return useSyncExternalStore<T[] | undefined>(subscribe, getObjects) ?? [];
};

// TODO(dmaretskyi): Serialize the filter here instead.
const filterToDepsArray = (filter?: FilterSource<any>) =>
  Object.entries(filter ?? {})
    .flat(10)
    .map((x) => (typeof x === 'function' || typeof x === 'object' ? null : x));

const noop = () => {};

const EMPTY_ARRAY: never[] = [];
