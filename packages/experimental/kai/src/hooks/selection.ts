//
// Copyright 2022 DXOS.org
//

import { Context, createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { Space } from '@dxos/client';
import { EchoObject, EchoDatabase, Filter, Selection, SelectionHandle, TypeFilter } from '@dxos/echo-db2';

// TODO(burdon): Factor out (react-client).

export type SpaceContextType = {
  space: Space;
  database: EchoDatabase;
};

export const SpaceContext: Context<SpaceContextType | null> = createContext<SpaceContextType | null>(null);

export const useSpace = (): SpaceContextType => {
  return useContext(SpaceContext)!;
};

type UseObjects = {
  <T extends EchoObject>(filter?: TypeFilter<T>): T[];
  (filter?: Filter): EchoObject[];
};

/**
 * Query for objects.
 */
export const useObjects: UseObjects = (filter?: Filter): EchoObject[] => {
  const { database: db } = useSpace();
  const query = useMemo(() => db.query(filter ?? {}), [db, ...Object.entries(filter ?? {}).flat()]);

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
  const { database: db } = useSpace();

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
