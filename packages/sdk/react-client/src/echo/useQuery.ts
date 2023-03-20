//
// Copyright 2022 DXOS.org
//

import { useMemo, useSyncExternalStore } from 'react';

import { Space } from '@dxos/client';
import { TypedObject, Filter, Query, TypeFilter } from '@dxos/echo-schema';

type UseQuery = {
  <T extends TypedObject>(space?: Space, filter?: TypeFilter<T>): T[];
  <T extends TypedObject>(space?: Space, filter?: Filter<T>): TypedObject[];
};

/**
 * Create subscription.
 */
// TODO(burdon): Support typed operator filters (e.g., Note.filter(note => ...)).
export const useQuery: UseQuery = <T extends TypedObject>(
  space?: Space,
  filter?: Filter<T>,
  deps?: any[]
): TypedObject[] => {
  const query = useMemo(
    () => space?.db.query(filter ?? {}) as Query<T> | undefined,
    [space?.db, ...(typeof filter === 'function' ? [] : filterToDepsArray(filter)), ...(deps ?? [])]
  );

  // https://beta.reactjs.org/reference/react/useSyncExternalStore
  return (
    useSyncExternalStore<T[] | undefined>(
      (cb) => query?.subscribe?.(cb) ?? cb,
      () => query?.objects
    ) ?? []
  );
};

const filterToDepsArray = (filter?: Filter<any>) => Object.entries(filter ?? {}).flat();
