//
// Copyright 2022 DXOS.org
//

import { useMemo, useSyncExternalStore } from 'react';

import { EchoDatabase, EchoObject, Filter, TypeFilter } from '@dxos/echo-schema';

//
// TODO(burdon): Factor out (react-client).
//

type UseQuery = {
  <T extends EchoObject>(db: EchoDatabase, filter?: TypeFilter<T>): T[];
  (db: EchoDatabase, filter?: Filter): EchoObject[];
};

/**
 * Create subscription.
 * https://beta.reactjs.org/reference/react/useSyncExternalStore
 */
export const useQuery: UseQuery = (db: EchoDatabase, filter?: Filter) => {
  const query = useMemo(() => db.query(filter ?? {}), [db, ...Object.entries(filter ?? {}).flat()]);

  return useSyncExternalStore(
    (cb) => query.subscribe(cb),
    () => query.getObjects()
  );
};

