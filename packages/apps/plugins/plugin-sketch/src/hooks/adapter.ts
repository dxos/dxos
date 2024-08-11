//
// Copyright 2023 DXOS.org
//

import { transact } from '@tldraw/state';
import { createTLStore, defaultShapeUtils, type TLRecord } from '@tldraw/tldraw';
import { type TLStore } from '@tldraw/tlschema';

import { type UnsubscribeCallback } from '@dxos/async';
import { next as A } from '@dxos/automerge/automerge';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type DocAccessor } from '@dxos/react-client/echo';

import { decode, encode, getDeep, rebasePath, throttle } from './util';

const DEFAULT_TIMEOUT = 250;

export type AutomergeStoreAdapterProps = {
  timeout?: number;
};

/**
 * Ref: https://github.com/LiangrunDa/tldraw-with-automerge/blob/main/src/App.tsx.
 */
// TODO(burdon): Use AbstractAutomergeStoreAdapter.
export class AutomergeStoreAdapter {
  private readonly _subscriptions: UnsubscribeCallback[] = [];
  private _readonly = false; // TODO(burdon): !!!
  private _lastHeads: A.Heads | undefined = undefined;

  private _store?: TLStore;

  constructor(private readonly _options: AutomergeStoreAdapterProps = {}) {}

  get isOpen() {
    return !!this._store;
  }

  get store() {
    return this._store;
  }

  get readonly() {
    return this._readonly;
  }

  open(accessor: DocAccessor<any>) {
    invariant(accessor.path.length);
    if (this.isOpen) {
      this.close();
    }

    log('opening...', { path: accessor.path });

    // Create store.
    const store = createTLStore({ shapeUtils: defaultShapeUtils });

    // Initial sync.
    // Path: objects > xxx > data > content
    {
      const recordMap: Record<string, TLRecord> = getDeep(accessor.handle.docSync(), accessor.path) ?? {};
      const records = Object.values(recordMap);

      //
      // Initialize the store with the automerge doc records.
      //
      if (records.length === 0) {
        // If the automerge doc is empty, initialize the automerge doc with the default store records.
        accessor.handle.change((doc) => {
          const recordMap: Record<string, TLRecord> = getDeep(doc, accessor.path, true);
          for (const record of store.allRecords()) {
            recordMap[record.id] = encode(record);
          }
        });
      } else {
        // Replace the store records with the automerge doc records.
        transact(() => {
          store.clear();
          store.put(
            records.map((record) => decode(record)),
            'initialize',
          );
        });
      }
    }

    //
    // Subscribe to changes from TLDraw component's store (model).
    // Throttle update events by tracking the last mutation and submitted after timeout.
    // https://tldraw.dev/docs/persistence#Listening-for-changes
    // https://github.com/tldraw/tldraw-yjs-example/blob/main/src/useYjsStore.ts
    // TODO(burdon): Live mode via transient feeds?
    //
    {
      type Mutation = { type: string; record: TLRecord };
      const updateObject = throttle<Map<string, Mutation>>((mutations) => {
        accessor.handle.change((doc) => {
          const recordMap: Record<string, TLRecord> = getDeep(doc, accessor.path, true);
          log('component updated', { mutations });
          mutations.forEach(({ type, record }) => {
            switch (type) {
              case 'added': {
                recordMap[record.id] = encode(record);
                break;
              }
              case 'updated': {
                // TODO(dmaretskyi): Granular updates.
                recordMap[record.id] = encode(record);
                break;
              }
              case 'removed': {
                delete recordMap[record.id];
                break;
              }
            }
          });

          mutations.clear();
        });
      }, this._options.timeout ?? DEFAULT_TIMEOUT);

      const mutations = new Map<string, Mutation>();
      this._subscriptions.push(
        store.listen(
          ({ changes }) => {
            Object.values(changes.added).forEach((record) => {
              mutations.set(record.id, { type: 'added', record });
            });

            Object.values(changes.updated).forEach(([_, record]) => {
              mutations.set(record.id, { type: 'updated', record });
            });

            Object.values(changes.removed).forEach((record) => {
              mutations.set(record.id, { type: 'removed', record });
            });

            updateObject(mutations);
          },
          // Only sync user's document changes.
          { scope: 'document', source: 'user' },
        ),
      );
    }

    //
    // Subscribe to ECHO automerge mutations (events) to update TLDraw store (model).
    //
    {
      const updateStore = () => {
        const doc = accessor.handle.docSync()!;
        const recordMap: Record<string, TLRecord> = getDeep(doc, accessor.path);

        const updated = new Set<TLRecord['id']>();
        const removed = new Set<TLRecord['id']>();

        const currentHeads = A.getHeads(doc);
        const diff = A.equals(this._lastHeads, currentHeads) ? [] : A.diff(doc, this._lastHeads ?? [], currentHeads);
        diff.forEach((patch) => {
          // TODO(dmaretskyi): Filter out local updates.
          const relativePath = rebasePath(patch.path, accessor.path);
          if (!relativePath) {
            return;
          }

          if (relativePath.length === 0) {
            for (const id of Object.keys(recordMap)) {
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
            // eslint-disable-next-line no-fallthrough
            case 'put':
            case 'insert':
            case 'inc':
            case 'splice': {
              updated.add(relativePath[0] as TLRecord['id']);
              break;
            }
            default:
              log.warn('did not process patch', { patch, path: accessor.path });
          }
        });

        log('remote update', {
          currentHeads,
          lastHeads: this._lastHeads,
          path: accessor.path,
          diff: diff.filter((patch) => !!rebasePath(patch.path, accessor.path)),
          automergeState: recordMap,
          doc,
          updated,
          removed,
        });

        // Update/remove the records in the store.
        store.mergeRemoteChanges(() => {
          if (updated.size) {
            store.put(Array.from(updated).map((id) => decode(recordMap[id])));
          }
          if (removed.size) {
            store.remove(Array.from(removed));
          }
        });

        this._lastHeads = currentHeads;
      };

      accessor.handle.addListener('change', updateStore);
      this._subscriptions.push(() => accessor.handle.removeListener('change', updateStore));
    }

    this._store = store;
  }

  close() {
    this._subscriptions.forEach((unsubscribe) => unsubscribe());
    this._subscriptions.length = 0;
    this._store = undefined;
  }
}
