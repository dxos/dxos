//
// Copyright 2022 DXOS.org
//

import { useMemo, useSyncExternalStore } from 'react';

import { Space } from '@dxos/client';
import { Document, DocumentBase, Filter, Query, TypeFilter } from '@dxos/echo-schema';

type UseQuery = {
  <T extends DocumentBase>(space?: Space, filter?: TypeFilter<T>): T[];
  <T extends DocumentBase>(space?: Space, filter?: Filter<T>): Document[];
};

/**
 * Create subscription.
 */
export const useQuery: UseQuery = <T extends DocumentBase>(space?: Space, filter?: Filter<T>): DocumentBase[] => {
  const query = useMemo(
    () => space?.db.query(filter ?? {}) as Query<T> | undefined,
    [space?.db, ...filterToDepsArray(filter)]
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
