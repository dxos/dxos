//
// Copyright 2022 DXOS.org
//

import { useMemo, useSyncExternalStore } from 'react';

import { Space } from '@dxos/client';
import { Document, DocumentBase, Filter, TypeFilter } from '@dxos/echo-schema';

type UseQuery = {
  <T extends DocumentBase>(space: Space, filter?: TypeFilter<T>): T[];
  (space: Space, filter?: Filter): Document[];
};

/**
 * Create subscription.
 * https://beta.reactjs.org/reference/react/useSyncExternalStore
 */
export const useQuery: UseQuery = (space: Space, filter?: Filter) => {
  const query = useMemo(
    () => space.experimental.db.query(filter ?? {}),
    [space.experimental.db, ...filterToDepsArray(filter)]
  );

  return useSyncExternalStore(
    (cb) => query.subscribe(cb),
    () => query.getObjects()
  );
};

const filterToDepsArray = (filter?: Filter) => Object.entries(filter ?? {}).flat();
