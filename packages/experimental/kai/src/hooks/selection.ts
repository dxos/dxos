//
// Copyright 2022 DXOS.org
//

import React, { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { unproxy, EchoObject, EchoDatabase, Filter, Selection, SelectionHandle } from '@dxos/echo-db2';

// TODO(burdon): Move to echo-db2.
export const id = (object: EchoObject) => object[unproxy]._id;

export const DatabaseContext = createContext<{ database?: EchoDatabase }>({});

export const useDatabase = (): EchoDatabase => {
  const { database } = useContext(DatabaseContext);
  return database!;
};

/**
 * Query for objects.
 */
export const useObjects = (db: EchoDatabase, filter?: Filter): EchoObject[] => {
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
