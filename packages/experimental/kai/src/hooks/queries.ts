//
// Copyright 2022 DXOS.org
//

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { EchoDatabase, EchoObject, Filter, Selection, SelectionHandle } from '@dxos/echo-db2';

//
// TODO(burdon): Factor out (react-client).
//

/**
 * Query for objects.
 */
export const useQuery = (db: EchoDatabase, filter?: Filter): EchoObject[] => {
  const query = useMemo(() => db.query(filter ?? {}), [db, ...Object.entries(filter ?? {}).flat()]);

  return useSyncExternalStore(
    (cb) => query.subscribe(cb),
    () => query.getObjects()
  );
};

/**
 * Create reactive selection.
 */
export const useSubscription = (db: EchoDatabase, selection: Selection): SelectionHandle => {
  const [, forceUpdate] = useState({});

  const [handle, setHandle] = useState<SelectionHandle>(() =>
    db.createSubscription(() => {
      forceUpdate({});
    })
  );

  useEffect(() => {
    if (!handle.subscribed) {
      setHandle(
        db.createSubscription(() => {
          forceUpdate({});
        })
      );

      handle.update(selection);
    }

    return () => handle.unsubscribe();
  }, []);

  handle.update(selection);
  return handle;
};
