//
// Copyright 2023 DXOS.org
//

import { transact } from '@tldraw/state';
import { createTLStore, defaultShapes, type TLRecord } from '@tldraw/tldraw';
import { type TLStore } from '@tldraw/tlschema';
import { useEffect, useState } from 'react';
import { type Transaction, type YEvent } from 'yjs';
import * as A from '@dxos/automerge/automerge';
import { log } from '@dxos/log';

import { Expando, TypedObject, type TextObject, getRawDoc, DocAccessor } from '@dxos/react-client/echo';

type Unsubscribe = () => void;

/**
 * Constructs store from ECHO object.
 * Derived from tldraw example: https://github.com/tldraw/tldraw/blob/main/apps/examples/src/yjs/useYjsStore.ts
 */
export class YjsStoreAdapter {
  private readonly _store: TLStore;
  private readonly _subscriptions: Unsubscribe[] = [];

  constructor(private readonly _options = { timeout: 250 }) {
    this._store = createTLStore({ shapes: defaultShapes });
  }

  get store() {
    return this._store;
  }

  open(data: TextObject) {
    if (this._subscriptions.length) {
      this.close();
    }

    // TODO(burdon): Schema document type.
    // TODO(burdon): Garbage collection (gc)?
    // TODO(burdon): Capture mouse-up event to trigger save.
    const doc = data.doc!; // ?? new Doc({ gc: true });
    const yRecords = doc.getMap<TLRecord>('content');

    // Initialize the store with the yjs doc records.
    // If the yjs doc is empty, initialize the yjs doc with the default store records.
    if (yRecords.size === 0) {
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
  }

  close() {
    this._subscriptions.forEach((unsubscribe) => unsubscribe());
    this._subscriptions.length = 0;
    this._store.clear();
  }
}

export class AutomergeStoreAdapter {
  private readonly _store: TLStore;
  private readonly _subscriptions: Unsubscribe[] = [];
  private _lastHeads: A.Heads | undefined = undefined;

  constructor(private readonly _options = { timeout: 250 }) {
    this._store = createTLStore({ shapes: defaultShapes });
  }

  get store() {
    return this._store;
  }

  open(docAccess: DocAccessor<{ content: Record<string, any> }>) {
    if (this._subscriptions.length) {
      this.close();
    }

    const path = docAccess.path ?? [];

    // Initial sync
    {
      const contentRecords: Record<string, TLRecord> | undefined = getDeep(docAccess.docSync()!, path);

      // Initialize the store with the automerge doc records.
      // If the automerge doc is empty, initialize the automerge doc with the default store records.
      if (Object.entries(contentRecords ?? {}).length === 0) {
        // Sync the store records to the automerge doc.
        docAccess.change((doc) => {
          const content: Record<string, TLRecord> = getAndInit(doc, path, {});
          const allRecords = this._store.allRecords();
          log.info('seed initial records', { allRecords });
          for (const record of allRecords) {
            content[record.id] = clone(record);
          }
        });
      } else {
        // Replace the store records with the automerge doc records.
        transact(() => {
          log.info('load initial records', { contentRecords });
          this._store.clear();
          this._store.put([...Object.values(contentRecords ?? {})].map(record => clone(record)));
        });
      }
    }

    //
    // Subscribe to ECHO automerge mutations (events) to update ECHO object.
    //
    const handleChange = () => {
      const doc = docAccess.docSync()!;

      const currentHeads = A.getHeads(doc);
      const diff = A.equals(this._lastHeads, currentHeads) ? [] : A.diff(doc, this._lastHeads ?? [], currentHeads);
      const contentRecords: Record<string, TLRecord> = getDeep(doc, path);

      const updated = new Set<TLRecord['id']>();
      const removed = new Set<TLRecord['id']>();

      diff.forEach((patch) => {
        // TODO(dmaretskyi): Filter out local updates.

        const relativePath = rebasePath(patch.path, path);
        if (!relativePath) {
          return;
        }
        if (relativePath.length === 0) {
          for (const id of Object.keys(contentRecords)) {
            updated.add(id as TLRecord['id']);
          }
          return;
        }

        switch (patch.action) {
          case 'del': {
            if (relativePath.length === 1) {
              removed.add(relativePath[0] as TLRecord['id']);
              break;
            }
          }
          case 'put':
          case 'insert':
          case 'inc':
          case 'splice': {
            const id = relativePath[0] as TLRecord['id'];
            updated.add(id);
            break;
          }
          default:
            log.warn('did not process patch', { patch, mountPath: path });
        }
      });

      log.info('remote change', {
        currentHeads,
        lastHeads: this._lastHeads,
        path,
        diff: diff.filter((patch) => !!rebasePath(patch.path, path)),
        automergeState: contentRecords,
        doc,
        updated,
        removed,
      });

      // Update/remove the records in the store.
      this._store.mergeRemoteChanges(() => {
        if (removed.size) {
          this._store.remove(Array.from(removed));
        }
        if (updated.size) {
          this._store.put(Array.from(updated).map((id) => clone(contentRecords[id])));
        }
      });
      this._lastHeads = currentHeads;
    };

    docAccess.addListener('change', handleChange);
    this._subscriptions.push(() => docAccess.removeListener('change', handleChange));

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
            docAccess.change((doc) => {
              const content: Record<string, TLRecord> = getAndInit(doc, path, {});
              log.info('submitting mutations', { mutations });
              mutations.forEach(({ type, record }) => {
                switch (type) {
                  case 'added': {
                    content[record.id] = clone(record);
                    break;
                  }
                  case 'updated': {
                    // TODO(dmaretskyi): Granular updates.
                    content[record.id] = clone(record);
                    break;
                  }
                  case 'removed': {
                    delete content[record.id];
                    break;
                  }
                }
              });

              mutations.clear();
            });
          }, this._options.timeout);
        },
        // Only sync user's document changes.
        { source: 'user', scope: 'document' },
      ),
    );
  }

  close() {
    this._subscriptions.forEach((unsubscribe) => unsubscribe());
    this._subscriptions.length = 0;
    this._store.clear();
  }
}

export const useStoreAdapter = (data: TextObject | Expando, options = { timeout: 250 }): TLStore => {
  const [adapter] = useState(() =>
    data instanceof TypedObject ? new AutomergeStoreAdapter(options) : new YjsStoreAdapter(options),
  );
  useEffect(() => {
    adapter.open(getRawDoc(data, ['content']) as any);
    return () => {
      // TODO(burdon): Throws error if still mounted.
      // adapter.close();
    };
  }, [data]);

  return adapter.store;
};

const getDeep = (obj: any, path: string[]) => {
  let value = obj;
  for (const key of path) {
    value = value?.[key];
  }
  return value;
};

const getAndInit = (obj: any, path: string[], value: any) => {
  let parent = obj;
  for (const key of path) {
    parent[key] ??= {};
    parent = parent[key];
  }
  return parent;
};

const rebasePath = (path: A.Prop[], base: string[]): A.Prop[] | undefined => {
  if (path.length < base.length) {
    return undefined;
  }

  for (let i = 0; i < base.length; ++i) {
    if (path[i] !== base[i]) {
      return undefined;
    }
  }

  return path.slice(base.length);
};

const clone = (obj: any) => {
  return JSON.parse(JSON.stringify(obj));
}