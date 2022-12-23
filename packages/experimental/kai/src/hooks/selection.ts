//
// Copyright 2022 DXOS.org
//

import { Context, createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { EchoObject, EchoDatabase, Filter, Selection, SelectionHandle, TypeFilter } from '@dxos/echo-db2';

// TODO(burdon): Factor out (react-client).

export type DatabaseContextType = { database?: EchoDatabase };

export const DatabaseContext: Context<DatabaseContextType> = createContext<DatabaseContextType>({});

export const useDatabase = (): EchoDatabase => {
  const { database } = useContext(DatabaseContext);
  return database!;
};

type UseObjects = {
  <T extends EchoObject>(filter?: TypeFilter<T>): T[];
  (filter?: Filter): EchoObject[];
};

/**
 * Query for objects.
 */
export const useObjects: UseObjects = (filter?: Filter): EchoObject[] => {
  const db = useDatabase();
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
export const useSelection = (selection: Selection): SelectionHandle => {
  const db = useDatabase();

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
