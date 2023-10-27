//
// Copyright 2022 DXOS.org
//

import { useMemo, useSyncExternalStore } from 'react';

import type { QueryOptions, TypedObject, Query, FilterSource, Space } from '@dxos/client/echo';

import { useClient } from '../client';

type UseQuery = {
  <T extends TypedObject>(space?: Space, filter?: FilterSource<T>, options?: QueryOptions, deps?: any[]): T[];
  <T extends TypedObject>(filter?: FilterSource<T>, options?: QueryOptions, deps?: any[]): T[];
};

/**
 * Create subscription.
 */
// TODO(burdon): Support typed operator filters (e.g., Note.filter(note => ...)).
export const useQuery: UseQuery = <T extends TypedObject>(...args: any[]) => {
  let space: Space | undefined;

  if (args.length === 4) {
    space = args[0];
    args.shift();
  }

  let [filter, options, deps] = args as [filter?: FilterSource<T>, options?: QueryOptions, deps?: any[]];

  options ??= {};
  if (space) {
    options.spaces = [space];
  }

  const client = useClient();

  const query = useMemo(
    () => client.spaces.query(filter, options) as Query<T> | undefined,
    [space, ...(typeof filter === 'function' ? [] : filterToDepsArray(filter)), ...(deps ?? [])],
  );

  // https://beta.reactjs.org/reference/react/useSyncExternalStore
  return (
    useSyncExternalStore<T[] | undefined>(
      (cb) => query?.subscribe?.(cb) ?? cb,
      () => query?.objects,
    ) ?? []
  );
};

const filterToDepsArray = (filter?: FilterSource<any>) => Object.entries(filter ?? {}).flat();
