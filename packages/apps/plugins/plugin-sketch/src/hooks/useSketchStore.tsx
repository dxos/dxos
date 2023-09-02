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
import { TLStore } from '@tldraw/tlschema';
import { useEffect, useMemo } from 'react';
import { Transaction, YEvent } from 'yjs';

import { Text } from '@dxos/client/echo';

type Unsubscribe = () => void;

/**
 * Constructs store from ECHO object.
 * Derived from tldraw example: https://github.com/tldraw/tldraw/blob/main/apps/examples/src/yjs/useYjsStore.ts
 */
export class EchoStore {
  private readonly _subscriptions: Unsubscribe[] = [];
  private readonly _store: TLStore;

  constructor(private readonly _data: Text, private readonly _options = { timeout: 250 }) {
    this._store = createTLStore({ shapes: defaultShapes });
  }

  get store() {
    return this._store;
  }

  open() {
    if (this._subscriptions.length) {
      return this;
    }

    // TODO(burdon): Schema document type.
    // TODO(burdon): Garbage collection (gc)?
    const doc = this._data.doc!; // ?? new Doc({ gc: true });
    const yRecords = doc.getMap<TLRecord>('content');

    // TODO(burdon): Capture mouse-up event to trigger save.

    // Initialize the store with the yjs doc records.
    // If the yjs doc is empty, initialize the yjs doc with the default store records.
    if (yRecords.size === 0) {
      // Create the initial store records.
      transact(() => {
        this._store.clear();
        this._store.put([
          PageRecordType.create({ id: 'page:page' as TLPageId, name: 'Page 1', index: 'a1' }),
          DocumentRecordType.create({ id: 'document:document' as TLDocument['id'] }),
        ]);
      });

      // Sync the store records to the yjs doc.
      doc.transact(() => {
        for (const record of this._store.allRecords()) {
          yRecords.set(record.id, record);
        }
      });
    } else {
      // Replace the store records with the yjs doc records.
      transact(() => {
        this._store.clear();
        this._store.put([...yRecords.values()]);
      });
    }

    //
    // Subscribe to ECHO yjs mutations (events) to update ECHO object.
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
      this._store.mergeRemoteChanges(() => {
        if (removed.length) {
          this._store.remove(removed);
        }
        if (updated.length) {
          this._store.put(updated);
        }
      });
    };

    yRecords.observeDeep(handleChange);

    this._subscriptions.push(() => yRecords.unobserveDeep(handleChange));

    //
    // Subscribe to changes from component's store (model).
    // Throttle update events by tracking the last mutation and submitted after timeout.
    // TODO(burdon): Live mode via transient feeds?
    //
    let timeout: ReturnType<typeof setTimeout>;
    const mutations = new Map();
    this._subscriptions.push(
      this._store.listen(
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
            }, this._options.timeout);
          });
        },
        // Only sync user's document changes.
        { source: 'user', scope: 'document' },
      ),
    );

    return this;
  }

  close() {
    this._subscriptions.forEach((unsubscribe) => unsubscribe());
    this._subscriptions.length = 0;
    return this;
  }
}

export const useSketchStore = (data: Text, options = { timeout: 250 }): TLStore => {
  const store = useMemo(() => new EchoStore(data, options), [data.id]);
  useEffect(() => {
    store.open();
    return () => {
      store.close();
    };
  }, [store]);

  return store?.store;
};
