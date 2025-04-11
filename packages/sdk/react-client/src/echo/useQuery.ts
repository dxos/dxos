//
// Copyright 2022 DXOS.org
//

import { useMemo, useSyncExternalStore } from 'react';

import {
  isSpace,
  type Echo,
  type FilterSource,
  Filter,
  type Query,
  type QueryOptions,
  type ReactiveEchoObject,
  type Space,
} from '@dxos/client/echo';

/**
 * Create subscription.
 */
// TODO(burdon): Support typed operator filters (e.g., Note.filter(note => ...)).
export const useQuery = <T extends ReactiveEchoObject<any>>(
  spaceOrEcho?: Space | Echo,
  filter?: FilterSource<T>,
  options?: QueryOptions,
  deps?: any[],
): T[] => {
  const { getObjects, subscribe } = useMemo(() => {
    let subscribed = false;
    const query = isSpace(spaceOrEcho)
      ? spaceOrEcho.db.query(filter, options)
      : (spaceOrEcho?.query(filter, options) as Query<T> | undefined);

    return {
      getObjects: () => (subscribed && query ? query.objects : EMPTY_ARRAY),
      subscribe: (cb: () => void) => {
        subscribed = true;
        const unsubscribe = query?.subscribe(cb) ?? noop;
        return () => {
          unsubscribe?.();
          subscribed = false;
        };
      },
    };
  }, [spaceOrEcho, ...filterToDepsArray(filter), ...(deps ?? [])]);

  // https://beta.reactjs.org/reference/react/useSyncExternalStore
  // NOTE: This hook will resubscribe whenever the callback passed to the first argument changes; make sure it is stable.
  const objects = useSyncExternalStore<T[] | undefined>(subscribe, getObjects);
  return objects ?? [];
};

const filterToDepsArray = (filter?: FilterSource<any>) => [JSON.stringify(Filter.from(filter).toProto())];

const noop = () => {};

const EMPTY_ARRAY: never[] = [];
