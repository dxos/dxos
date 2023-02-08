//
// Copyright 2022 DXOS.org
//

import { useMemo, useSyncExternalStore } from 'react';

import { Space } from '@dxos/client';
import { Document, DocumentBase, Filter, TypeFilter } from '@dxos/echo-schema';

type UseQuery = {
  <T extends DocumentBase>(space?: Space, filter?: TypeFilter<T>): T[];
  <T extends DocumentBase>(space?: Space, filter?: Filter<T>): Document[];
};

/**
 * Create subscription.
 */
export const useQuery: UseQuery = <T extends DocumentBase>(space?: Space, filter?: Filter<T>): DocumentBase[] => {
  const query = useMemo(
    () => space?.experimental.db.query(filter ?? {}),
    [space?.experimental.db, ...filterToDepsArray(filter)]
  );

  // https://beta.reactjs.org/reference/react/useSyncExternalStore
  return (
    useSyncExternalStore<T[]>(
      (cb) => query?.subscribe?.(cb) ?? cb,
      () => query?.getObjects() as T[]
    ) ?? []
  );
};

const filterToDepsArray = (filter?: Filter<any>) => Object.entries(filter ?? {}).flat();
