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

import { CURRENT_VERSION, DEFAULT_VERSION, schema } from './schema';

// Strings longer than this will have collaborative editing disabled for performance reasons.
const STRING_CRDT_LIMIT = 300_000;

export interface StoreAdapter {
  store?: TLStore;
  readonly: boolean;
}

// TODO(burdon): Move to SketchType?
export type TLDrawStoreData = {
  schema?: string; // Undefined means version 1.
  content: Record<string, any>;
};

/**
 * Ref: https://github.com/LiangrunDa/tldraw-with-automerge/blob/main/src/App.tsx.
 */
export class AutomergeStoreAdapter implements StoreAdapter {
  private readonly _subscriptions: UnsubscribeCallback[] = [];
  private _store?: TLStore;
  private _readonly = false;
  private _lastHeads: A.Heads | undefined = undefined;

  constructor(private readonly _options = { timeout: 250 }) {}

  get isOpen() {
    return !!this._store;
  }

  get store() {
    return this._store;
  }

  get readonly() {
    return this._readonly;
  }

  // TODO(burdon): Just pass in object?
  open(accessor: DocAccessor<TLDrawStoreData>) {
    if (this.isOpen) {
      this.close();
    }

    // Path: objects > xxx > data > content
    log('opening...', { path: accessor.path });
    invariant(accessor.path.length);

    // Initial sync.
    const contentRecords: Record<string, TLRecord> | undefined = getDeep(accessor.handle.docSync()!, accessor.path);

    // Create store.
    const store = createTLStore({ shapeUtils: defaultShapeUtils });
    this._store = store;

    // Initialize the store with the automerge doc records.
    // If the automerge doc is empty, initialize the automerge doc with the default store records.
    if (Object.entries(contentRecords ?? {}).length === 0) {
      // Sync the store records to the automerge doc.
      saveStore(this._store, accessor);
    } else {
      // Replace the store records with the automerge doc records.
      transact(() => {
        store.clear();
        store.put(Object.values(contentRecords ?? {}).map((record) => decode(record)));

        // TODO(wittjosiah): Automatic migrations are disabled for now.
        // const currentVersion = accessor.handle.docSync()?.schema;
        // if (currentVersion === undefined) {
        //   saveStore(store, accessor);
        // }

        // const version = maybeMigrateSnapshot(
        //   store,
        //   Object.values(contentRecords ?? {}).map((record) => decode(record)),
        //   currentVersion !== undefined ? parseInt(currentVersion) : undefined,
        // );

        // if (version !== undefined) {
        //   if (version === -1) {
        //     this._readonly = true;
        //   } else {
        //     saveStore(store, accessor);
        //   }
        // }
      });
    }

    //
    // Subscribe to ECHO automerge mutations (events) to update ECHO object.
    //
    const handleChange = () => {
      const doc = accessor.handle.docSync()!;
      const currentHeads = A.getHeads(doc);
      const diff = A.equals(this._lastHeads, currentHeads) ? [] : A.diff(doc, this._lastHeads ?? [], currentHeads);
      const contentRecords: Record<string, TLRecord> = getDeep(doc, accessor.path);

      const updated = new Set<TLRecord['id']>();
      const removed = new Set<TLRecord['id']>();

      diff.forEach((patch) => {
        // TODO(dmaretskyi): Filter out local updates.
        const relativePath = rebasePath(patch.path, accessor.path);
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
            log.warn('did not process patch', { patch, path: accessor.path });
        }
      });

      log('remote change', {
        currentHeads,
        lastHeads: this._lastHeads,
        path: accessor.path,
        diff: diff.filter((patch) => !!rebasePath(patch.path, accessor.path)),
        automergeState: contentRecords,
        doc,
        updated,
        removed,
      });

      // Update/remove the records in the store.
      store.mergeRemoteChanges(() => {
        if (removed.size) {
          store.remove(Array.from(removed));
        }

        // TODO(wittjosiah): Automatic migrations are disabled for now.
        // if (updated.size) {
        //   const currentVersion = accessor.handle.docSync()?.schema;
        //   const version = maybeMigrateSnapshot(
        //     store,
        //     Object.values(Array.from(updated).map((id) => decode(contentRecords[id]))),
        //     currentVersion !== undefined ? parseInt(currentVersion) : undefined,
        //   );
        //   if (version === -1) {
        //     this._readonly = true;
        //   }
        // }
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
              const content: Record<string, TLRecord> = getAndInit(doc, accessor.path, {});
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
    this._store = undefined;
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
// TODO(burdon): Types?
const encode = (value: any): any => {
  if (Array.isArray(value)) {
    return value.map(encode);
  }
  if (value instanceof A.RawString) {
    throw new Error('Encode called on automerge data.');
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

/**
 * Insert records into the store catching possible schema errors.
 * @returns The new schema version; undefined if no migration was needed; -1 if error.
 */
// TODO(burdon): Make readonly if we are behind the records. Need to inform user.
const _maybeMigrateSnapshot = (store: TLStore, records: any[], version?: number): number | undefined => {
  try {
    log('loading', { records: records.length, schema: version });
    store.put(records);
  } catch (err) {
    log.info('migrating schema...', err);
    const serialized = records.reduce<Record<string, any>>((acc, record) => {
      acc[record.id] = record;
      return acc;
    }, {});

    const snapshot = store.migrateSnapshot({ schema: schema[version ?? DEFAULT_VERSION], store: serialized });
    try {
      log('loading', { records: Object.keys(snapshot.store).length, schema: snapshot.schema.schemaVersion });
      store.loadSnapshot(snapshot);
      log.info('migrated schema', { version: CURRENT_VERSION });
      return CURRENT_VERSION;
    } catch (err) {
      // Fallback.
      // TODO(burdon): Notify user shapes missing. Make readonly.
      log.info('loading records...');
      for (const record of Object.values(serialized)) {
        try {
          store.put([record]);
        } catch (err) {
          log.catch(err, { record });
        }
      }

      return -1;
    }
  }
};

// TODO(burdon): Need unit test and check that records are duplicated.
const saveStore = (store: TLStore, accessor: DocAccessor<TLDrawStoreData>, version = CURRENT_VERSION) => {
  accessor.handle.change((doc) => {
    // TODO(burdon): Why isn't path just "content"?
    const content: Record<string, TLRecord> = getAndInit(doc, accessor.path, {});
    const records = store.allRecords();
    log('saving records...', { records: records.length });
    // TODO(burdon): Do we need to construct a different path?
    doc.schema = String(version);
    for (const record of records) {
      content[record.id] = encode(record);
    }
  });
};
