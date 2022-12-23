//
// Copyright 2022 DXOS.org
//

import React, { Context, createContext, useContext, useEffect, useMemo, useReducer, useState, useSyncExternalStore } from 'react';

import { EchoObject, EchoDatabase, Filter, Selection, SelectionHandle, TypeFilter } from '@dxos/echo-db2';

// TODO(burdon): Move to echo-db2.

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

export const makeReactive = <P>(comp: React.FC<P>): React.FC<P> => props => {
  const db = useDatabase();
  const [, forceUpdate] = useReducer(x => x + 1, 0);
  const [handle] = useState(() => db.createSubscription(() => {
    forceUpdate();
  }));
  const accessObserver = db.createAccessObserver();

  useEffect(() => {
    if (!handle.subscribed) {
      console.error('bug: subscription lost') // TODO(dmaretskyi): Fix this.
    }

    return () => handle.unsubscribe();
  }, []);

  try {
    return comp(props);
  } finally {
    handle.update([...accessObserver.accessed]);
  }
}