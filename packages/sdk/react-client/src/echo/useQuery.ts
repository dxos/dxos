//
// Copyright 2022 DXOS.org
//

import { useMemo, useSyncExternalStore } from 'react';

import {
  type QueryOptions,
  type Query,
  type FilterSource,
  type Space,
  type EchoReactiveObject,
  type Echo,
  isSpace,
} from '@dxos/client/echo';

type UseQuery = {
  <T extends EchoReactiveObject<any>>(
    spaceOrEcho?: Space | Echo,
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
  spaceOrEcho?: Space | Echo,
  filter?: FilterSource<T>,
  options?: QueryOptions,
  deps?: any[],
) => {
  const { subscribe, getObjects } = useMemo(() => {
    const query = isSpace(spaceOrEcho)
      ? spaceOrEcho.db.query(filter, options)
      : (spaceOrEcho?.query(filter, options) as Query<T> | undefined);
    let subscribed = false;

    return {
      subscribe: (cb: () => void) => {
        subscribed = true;
        const unsubscribe = query?.subscribe(cb) ?? noop;
        return () => {
          unsubscribe?.();
          subscribed = false;
        };
      },
      getObjects: () => (subscribed && query ? query.objects : EMPTY_ARRAY),
    };
  }, [spaceOrEcho, ...(typeof filter === 'function' ? [] : filterToDepsArray(filter)), ...(deps ?? [])]);

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
