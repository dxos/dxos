//
// Copyright 2022 DXOS.org
//

import { useMemo, useSyncExternalStore } from 'react';

import type { QueryOptions, OpaqueEchoObject, Query, FilterSource, Space } from '@dxos/client/echo';

type UseQuery = {
  <T extends OpaqueEchoObject>(space?: Space, filter?: FilterSource<T>, options?: QueryOptions, deps?: any[]): T[];
};

/**
 * Create subscription.
 */
// TODO(burdon): Support typed operator filters (e.g., Note.filter(note => ...)).
export const useQuery: UseQuery = <T extends OpaqueEchoObject>(
  space?: Space,
  filter?: FilterSource<T>,
  options?: QueryOptions,
  deps?: any[],
) => {
  const query = useMemo(
    () => space?.db.query(filter, options) as Query<T> | undefined,
    [space?.db, ...(typeof filter === 'function' ? [] : filterToDepsArray(filter)), ...(deps ?? [])],
  );

  // https://beta.reactjs.org/reference/react/useSyncExternalStore
  return (
    useSyncExternalStore<T[] | undefined>(
      (cb) => query?.subscribe?.(cb) ?? cb,
      () => query?.objects,
    ) ?? []
  );
};

// TODO(dmaretskyi): Serialize the filter here instead.
const filterToDepsArray = (filter?: FilterSource<any>) =>
  Object.entries(filter ?? {})
    .flat(10)
    .map((x) => (typeof x === 'function' || typeof x === 'object' ? null : x));
