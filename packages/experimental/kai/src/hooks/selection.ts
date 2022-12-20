//
// Copyright 2022 DXOS.org
//

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { Space } from '@dxos/client';
import { unproxy, EchoObject, EchoDatabase, Filter, Selection, SelectionHandle, TypeFilter } from '@dxos/echo-db2';

// TODO(burdon): Move to echo-db2.

export const useDatabase = (space?: Space): EchoDatabase | undefined => {
  // TODO(burdon): Use state.
  return useMemo(() => space && new EchoDatabase(space.database), [space]);
};

type UseObjects = {
  <T extends EchoObject> (db: EchoDatabase, filter?: TypeFilter<T>): T[]
  (db: EchoDatabase, filter?: Filter): EchoObject[]
}

/**
 * Query for objects.
 */
export const useObjects: UseObjects = (db: EchoDatabase, filter?: Filter): EchoObject[] => {
  const query = useMemo(() => db.query(filter ?? {}), [...Object.entries(filter ?? {}).flat()]);

  return useSyncExternalStore(
    (cb) => query.subscribe(cb),
    () => query.getObjects()
  );
};

/**
 * Create reactive selection.
 */
// TODO(burdon): Consider useSyncExternalStore.
export const useSelection = (db: EchoDatabase, selection: Selection): SelectionHandle => {
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
