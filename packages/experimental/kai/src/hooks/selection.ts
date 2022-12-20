//
// Copyright 2022 DXOS.org
//

import { useEffect, useState } from 'react';

import { unproxy, EchoObject, Selector } from '@dxos/echo-db2';

export const id = (object: EchoObject) => object[unproxy]._id;
export const db = (object: EchoObject) => object[unproxy]._database;
export const save = (object: EchoObject) => db(object)!.save(object);

/**
 * Query for objects.
 */
export const useObjects = (selector?: Selector): EchoObject[] => {
  const [objects, setObjects] = useState<EchoObject[]>([]);

  return objects;
};

/**
 * Create reactive selection.
 */
// TODO(burdon): Consider useSyncExternalStore.
export const useSelection = (db: EchoObject, selection: Selection): Selection => {
  const [, forceUpdate] = useState({});
  const [handle, setHandle] = useState(() =>
    db.createSubscription(() => {
      forceUpdate({});
    })
  );

  useEffect(() => {
    if (!handle) {
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
