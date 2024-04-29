//
// Copyright 2023 DXOS.org
//

import { transact } from '@tldraw/state';
import { createTLStore, defaultShapeUtils, type TLRecord } from '@tldraw/tldraw';
import { type TLStore } from '@tldraw/tlschema';

import { next as A } from '@dxos/automerge/automerge';
import { log } from '@dxos/log';
import { type DocAccessor } from '@dxos/react-client/echo';

import { type Unsubscribe } from '../types';

// Strings longer than this will have collaborative editing disabled for performance reasons.
const STRING_CRDT_LIMIT = 300_000;

// TODO(burdon): Import/export to JSON.
// interface ObjectSerializer {
//   import(data: string, migrate?: boolean): void;
//   export(data: any): string;
// }

// class SketchSerializer implements ObjectSerializer {
//   constructor(private _store: TLStore) {}
//
//   import(data: string, migrate?: boolean) {
//     const s1 = JSON.parse(data);
//     if (migrate) {
//       this._store.migrateSnapshot(s1);
//     } else {
//       this._store.loadSnapshot(s1);
//     }
//   }
//
//   export(data: any) {
//     // NOTE: Includes schema.
//     return JSON.stringify(this._store.getSnapshot());
//   }
// }

/**
 * Insert records into the store catching possible schema errors.
 */
// TODO(burdon): Optionally delete invalid shapes?
const safeStorePut = (store: TLStore, records: any[]) => {
  try {
    store.put(records);
  } catch (err) {
    log.error('invalid schema', err);
    for (const record of records) {
      try {
        store.put([record]);
      } catch (err) {
        log.error('invalid schema', err);
      }
    }
  }
};

// TODO(dmaretskyi): Take a look at https://github.com/LiangrunDa/tldraw-with-automerge/blob/main/src/App.tsx.
export class AutomergeStoreAdapter {
  private readonly _store: TLStore;
  private readonly _subscriptions: Unsubscribe[] = [];
  private _lastHeads: A.Heads | undefined = undefined;

  constructor(private readonly _options = { timeout: 250 }) {
    this._store = createTLStore({ shapeUtils: defaultShapeUtils });
  }

  get store() {
    return this._store;
  }

  open(accessor: DocAccessor<{ content: Record<string, any> }>) {
    if (this._subscriptions.length) {
      this.close();
    }

    const path = accessor.path ?? [];

    // Initial sync.
    {
      const contentRecords: Record<string, TLRecord> | undefined = getDeep(accessor.handle.docSync()!, path);

      // Initialize the store with the automerge doc records.
      // If the automerge doc is empty, initialize the automerge doc with the default store records.
      if (Object.entries(contentRecords ?? {}).length === 0) {
        // Sync the store records to the automerge doc.
        accessor.handle.change((doc) => {
          const content: Record<string, TLRecord> = getAndInit(doc, path, {});
          const allRecords = this._store.allRecords();
          log('seed initial records', { allRecords });
          for (const record of allRecords) {
            content[record.id] = encode(record);
          }
        });
      } else {
        // Replace the store records with the automerge doc records.
        transact(() => {
          log('load initial records', { contentRecords });
          this._store.clear();

          safeStorePut(
            this._store,
            Object.values(contentRecords ?? {}).map((record) => decode(record)),
          );

          // const { schema } = this._store.getSnapshot();
          // console.log(JSON.stringify(schema, null, 2));
        });
      }
    }

    //
    // Subscribe to ECHO automerge mutations (events) to update ECHO object.
    //
    const handleChange = () => {
      const doc = accessor.handle.docSync()!;

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
          // eslint-disable-next-line no-fallthrough
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

      log('remote change', {
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
          safeStorePut(this._store, Object.values(Array.from(updated).map((id) => decode(contentRecords[id]))));
        }
      });
      this._lastHeads = currentHeads;
    };

    accessor.handle.addListener('change', handleChange);
    this._subscriptions.push(() => accessor.handle.removeListener('change', handleChange));

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
            accessor.handle.change((doc) => {
              const content: Record<string, TLRecord> = getAndInit(doc, path, {});
              log('submitting mutations', { mutations });
              mutations.forEach(({ type, record }) => {
                switch (type) {
                  case 'added': {
                    content[record.id] = encode(record);
                    break;
                  }
                  case 'updated': {
                    // TODO(dmaretskyi): Granular updates.
                    content[record.id] = encode(record);
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

// TODO(burdon): Replace with lodash.get.
const getDeep = (obj: any, path: readonly (string | number)[]) => {
  let value = obj;
  for (const key of path) {
    value = value?.[key];
  }
  return value;
};

const getAndInit = (obj: any, path: readonly (string | number)[], value: any) => {
  let parent = obj;
  for (const key of path) {
    parent[key] ??= {};
    parent = parent[key];
  }
  return parent;
};

const rebasePath = (path: A.Prop[], base: readonly (string | number)[]): A.Prop[] | undefined => {
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

// TLDraw -> Automerge
const encode = (value: any): any => {
  if (Array.isArray(value)) {
    return value.map(encode);
  }
  if (value instanceof A.RawString) {
    throw new Error('encode called on automerge data');
  }
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(Object.entries(value).map(([key, value]) => [key, encode(value)]));
  }
  if (typeof value === 'string' && value.length > STRING_CRDT_LIMIT) {
    return new A.RawString(value);
  }
  return value;
};

// Automerge -> TLDraw
const decode = (value: any): any => {
  if (Array.isArray(value)) {
    return value.map(decode);
  }
  if (value instanceof A.RawString) {
    return value.toString();
  }
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(Object.entries(value).map(([key, value]) => [key, decode(value)]));
  }
  return value;
};
