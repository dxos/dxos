//
// Copyright 2023 DXOS.org
//

import { createTLStore, defaultShapes, TLRecord } from '@tldraw/tldraw';
import { useEffect, useState } from 'react';
import { Doc, YEvent, Transaction } from 'yjs';

import { Drawing as DrawingType } from '@braneframe/types';

import { DrawingModel } from '../props';

export const useDrawingModel = (object: DrawingType): DrawingModel => {
  const [store] = useState(() => createTLStore({ shapes: defaultShapes }));
  useEffect(() => {
    const subscriptions: (() => void)[] = [];

    // TODO(burdon): Get from item.
    // TODO(burdon): Garbage collection (gc)?
    // TODO(burdon): Live-mode toggle (e.g., transient feeds?)
    const doc = new Doc({ gc: true });
    const yRecords = doc.getMap<TLRecord>('__records__');

    //
    // Read from YJS.
    //
    const handleChange = (events: YEvent<any>[], transaction: Transaction) => {
      if (transaction.local) {
        return;
      }

      const updated: TLRecord[] = [];
      const removed: TLRecord['id'][] = [];

      events.forEach((event) => {
        event.changes.keys.forEach((change: any, id: string) => {
          switch (change.action) {
            case 'add':
            case 'update': {
              updated.push(yRecords.get(id)!);
              break;
            }
            case 'delete': {
              removed.push(id as TLRecord['id']);
              break;
            }
          }
        });
      });

      // Update/remove the records in the store.
      store.mergeRemoteChanges(() => {
        if (removed.length) {
          store.remove(removed);
        }
        if (updated.length) {
          store.put(updated);
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

  return {
    object,
    store,
  };
};
