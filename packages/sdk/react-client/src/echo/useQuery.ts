//
// Copyright 2022 DXOS.org
//

import { useMemo, useSyncExternalStore } from 'react';

import { Space } from '@dxos/client';
import { EchoObject, Filter, TypeFilter } from '@dxos/echo-schema';

type UseQuery = {
  <T extends EchoObject>(space: Space, filter?: TypeFilter<T>): T[];
  (space: Space, filter?: Filter): EchoObject[];
};

/**
 * Create subscription.
 * https://beta.reactjs.org/reference/react/useSyncExternalStore
 */
export const useQuery: UseQuery = (space: Space, filter?: Filter) => {
  const query = useMemo(() => space.db2.query(filter ?? {}), [space.db2, ...filterToDepsArray(filter)]);

  return useSyncExternalStore(
    (cb) => query.subscribe(cb),
    () => query.getObjects()
  );
};

const filterToDepsArray = (filter?: Filter) => Object.entries(filter ?? {}).flat();
