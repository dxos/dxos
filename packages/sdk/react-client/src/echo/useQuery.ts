//
// Copyright 2022 DXOS.org
//

import { useMemo, useSyncExternalStore } from 'react';

import { Space } from '@dxos/client';
import { Document, DocumentBase, Filter, TypeFilter } from '@dxos/echo-schema';

type UseQuery = {
  <T extends DocumentBase>(space: Space, filter?: TypeFilter<T>): T[];
  <T extends DocumentBase>(space: Space, filter?: Filter<T>): Document[];
};

/**
 * Create subscription.
 */
export const useQuery: UseQuery = (space: Space, filter?: Filter<any>) => {
  const query = useMemo(
    () => space.experimental.db.query(filter ?? {}),
    [space.experimental.db, ...filterToDepsArray(filter)]
  );

  // https://beta.reactjs.org/reference/react/useSyncExternalStore
  return useSyncExternalStore(
    (cb) => query.subscribe(cb),
    () => query.getObjects()
  );
};

const filterToDepsArray = (filter?: Filter<any>) => Object.entries(filter ?? {}).flat();
