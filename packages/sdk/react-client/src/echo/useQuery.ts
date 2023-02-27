//
// Copyright 2022 DXOS.org
//

import { useMemo, useSyncExternalStore } from 'react';

import { Space } from '@dxos/client';
import { Document, Filter, Query, TypeFilter } from '@dxos/echo-schema';

type UseQuery = {
  <T extends Document>(space?: Space, filter?: TypeFilter<T>): T[];
  <T extends Document>(space?: Space, filter?: Filter<T>): Document[];
};

/**
 * Create subscription.
 */
export const useQuery: UseQuery = <T extends Document>(space?: Space, filter?: Filter<T>, deps?: any[]): Document[] => {
  const query = useMemo(
    () => space?.db.query(filter ?? {}) as Query<T> | undefined,
    [space?.db, ...(typeof filter === 'function' ? deps ?? [] : filterToDepsArray(filter))]
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
