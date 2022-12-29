//
// Copyright 2022 DXOS.org
//

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { EchoDatabase, EchoObject, Filter, Selection, SubscriptionHandle, TypeFilter } from '@dxos/echo-schema';
import { useClient } from '@dxos/react-client';

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

/**
 * Create reactive selection.
 */
export const useSubscription = (selection: Selection): SubscriptionHandle => {
  const client = useClient();
  const [, forceUpdate] = useState({});

  const [handle, setHandle] = useState<SubscriptionHandle>(() =>
    client.echo.dbRouter.createSubscription(() => {
      forceUpdate({});
    })
  );

  useEffect(() => {
    if (!handle.subscribed) {
      setHandle(
        client.echo.dbRouter.createSubscription(() => {
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
