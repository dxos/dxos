//
// Copyright 2023 DXOS.org
//

import { transact } from '@tldraw/state';
import {
  createTLStore,
  defaultShapes,
  DocumentRecordType,
  PageRecordType,
  TLDocument,
  TLPageId,
  TLRecord,
} from '@tldraw/tldraw';
import { useEffect, useState } from 'react';
import { Transaction, YEvent } from 'yjs';

import { Drawing as DrawingType } from '@braneframe/types';

import { DrawingModel } from '../props';

/**
 * Constructs model from ECHO object.
 * Derived from tldraw example: https://github.com/tldraw/tldraw/blob/main/apps/examples/src/yjs/useYjsStore.ts
 */
export const useDrawingModel = (object: DrawingType, options = { timeout: 250 }): DrawingModel => {
  const [store] = useState(() => createTLStore({ shapes: defaultShapes }));

  useEffect(() => {
    const subscriptions: (() => void)[] = [];

    // TODO(burdon): Schema document type.
    // TODO(burdon): Garbage collection (gc)?
    const doc = object.content.doc!; // ?? new Doc({ gc: true });
    const yRecords = doc.getMap<TLRecord>('content');

    // Initialize the store with the yjs doc records.
    // If the yjs doc is empty, initialize the yjs doc with the default store records.
    if (yRecords.size === 0) {
      // Create the initial store records.
      transact(() => {
        store.clear();
        store.put([
          DocumentRecordType.create({
            id: 'document:document' as TLDocument['id'],
          }),
          // TODO(burdon): Manage pages?
          PageRecordType.create({
            id: 'page:page' as TLPageId,
            name: 'Page 1',
            index: 'a1',
          }),
        ]);
      });

      // Sync the store records to the yjs doc.
      doc.transact(() => {
        for (const record of store.allRecords()) {
          yRecords.set(record.id, record);
        }
      });
    } else {
      // Replace the store records with the yjs doc records.
      transact(() => {
        store.clear();
        store.put([...yRecords.values()]);
      });
    }

    //
    // Subscribe to ECHO YJS mutations (events) to update ECHO object.
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
    // Subscribe to changes from component's store (model).
    // Throttle update events by tracking the last mutation and submitted after timeout.
    // TODO(burdon): Live mode via transient feeds?
    //
    let timeout: ReturnType<typeof setTimeout>;
    const mutations = new Map();
    subscriptions.push(
      store.listen(
        ({ changes }) => {
          doc.transact(() => {
            clearTimeout(timeout);

            Object.values(changes.added).forEach((record) => {
              mutations.set(record.id, { type: 'added', record });
            });

            Object.values(changes.updated).forEach(([_, record]) => {
              mutations.set(record.id, { type: 'updated', record });
            });

            Object.values(changes.removed).forEach((record) => {
              mutations.set(record.id, { type: 'removed', record });
            });

            timeout = setTimeout(() => {
              mutations.forEach(({ type, record }) => {
                switch (type) {
                  case 'added': {
                    yRecords.set(record.id, record);
                    break;
                  }
                  case 'updated': {
                    yRecords.set(record.id, record);
                    break;
                  }
                  case 'removed': {
                    yRecords.delete(record.id);
                    break;
                  }
                }
              });

              mutations.clear();
            }, options.timeout);
          });
        },
        // Only sync user's document changes.
        { source: 'user', scope: 'document' },
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
