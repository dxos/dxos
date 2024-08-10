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

  open(accessor: DocAccessor<TLDrawStoreData>) {
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
          const content: Record<string, TLRecord> = getDeepAndInit(doc, accessor.path);
          for (const record of store.allRecords()) {
            content[record.id] = encode(record);
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
          const content: Record<string, TLRecord> = getDeepAndInit(doc, accessor.path);
          log('component updated', { mutations });
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
        const contentRecords: Record<string, TLRecord> = getDeep(doc, accessor.path);

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
          automergeState: contentRecords,
          doc,
          updated,
          removed,
        });

        // Update/remove the records in the store.
        store.mergeRemoteChanges(() => {
          if (updated.size) {
            store.put(Array.from(updated).map((id) => decode(contentRecords[id])));
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

// TLDraw -> Automerge
// TODO(burdon): Types?dec
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

// TODO(burdon): Move to utils.
const throttle = <T>(f: (arg: T) => void, t: number) => {
  let timeout: ReturnType<typeof setTimeout>;
  return (arg: T) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => f(arg), t);
  };
};

// TODO(burdon): AM Utils.

const getDeep = (obj: any, path: readonly (string | number)[]) => {
  let value = obj;
  for (const key of path) {
    value = value?.[key];
  }

  return value;
};

const getDeepAndInit = (obj: any, path: readonly (string | number)[]) => {
  let value = obj;
  for (const key of path) {
    value[key] ??= {};
    value = value[key];
  }

  return value;
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
