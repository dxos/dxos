//
// Copyright 2023 DXOS.org
//

import { createTLStore, defaultShapes, Tldraw, TLRecord } from '@tldraw/tldraw';
import React, { FC, useEffect, useState } from 'react';
import * as Y from 'yjs';

import { Drawing as DrawingType } from '@braneframe/types';
import { Main } from '@dxos/aurora';
import { SpaceProxy } from '@dxos/client';

import '@tldraw/tldraw/tldraw.css';

import type { DrawingModel } from '../props';

export const useDrawingStore = () => {
  const [store] = useState(() => createTLStore({ shapes: defaultShapes }));
  useEffect(() => {
    const subscriptions: (() => void)[] = [];

    // TODO(burdon): Get from item.
    // TODO(burdon): gc?
    const doc = new Y.Doc({ gc: true });
    const yRecords = doc.getMap<TLRecord>('--room---');

    //
    // Read from YJS.
    //
    const handleChange = (events: Y.YEvent<any>[], transaction: Y.Transaction) => {
      if (transaction.local) {
        return;
      }

      const toPut: TLRecord[] = [];
      const toRemove: TLRecord['id'][] = [];

      events.forEach((event) => {
        event.changes.keys.forEach((change, id) => {
          switch (change.action) {
            case 'add':
            case 'update': {
              toPut.push(yRecords.get(id)!);
              break;
            }
            case 'delete': {
              toRemove.push(id as TLRecord['id']);
              break;
            }
          }
        });
      });

      // Update/remove the records in the store.
      store.mergeRemoteChanges(() => {
        if (toRemove.length) {
          store.remove(toRemove);
        }
        if (toPut.length) {
          store.put(toPut);
        }
      });
    };

    yRecords.observeDeep(handleChange);
    subscriptions.push(() => yRecords.unobserveDeep(handleChange));

    //
    // Write to YJS.
    //
    subscriptions.push(
      store.listen(
        ({ changes }) => {
          doc.transact(() => {
            Object.values(changes.added).forEach((record) => {
              yRecords.set(record.id, record);
            });

            Object.values(changes.updated).forEach(([_, record]) => {
              yRecords.set(record.id, record);
            });

            Object.values(changes.removed).forEach((record) => {
              yRecords.delete(record.id);
            });
          });
        },
        { source: 'user', scope: 'document' }, // Only sync user's document changes.
      ),
    );

    return () => {
      subscriptions.forEach((unsubscribe) => unsubscribe());
      subscriptions.length = 0;
    };
  }, [store]);

  return store;
};

export const DrawingMain: FC<{ data: [SpaceProxy, DrawingType] }> = ({ data }) => {
  const space = data[0];
  const drawing = data[data.length - 1] as DrawingType;

  const model: DrawingModel = {
    root: drawing,
  };

  const store = useDrawingStore();

  // https://tldraw.dev/docs/assets
  return (
    <Main.Content classNames='flex flex-col grow min-bs-[100vh] overflow-hidden bg-white dark:bg-neutral-925'>
      <Tldraw store={store} />
    </Main.Content>
  );
};
