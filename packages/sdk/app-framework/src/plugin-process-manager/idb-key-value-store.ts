//
// Copyright 2026 DXOS.org
//

import * as PlatformError from '@effect/platform/Error';
import * as KeyValueStore from '@effect/platform/KeyValueStore';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as idb from 'idb-keyval';

const DB_NAME = 'dxos-process-manager';
const STORE_NAME = 'keyval';

const idbError = (method: string, key: string, cause: unknown) =>
  new PlatformError.SystemError({
    reason: 'Unknown',
    module: 'KeyValueStore',
    method,
    pathOrDescriptor: key,
    description: String(cause),
  });

/**
 * KeyValueStore layer backed by IndexedDB via idb-keyval.
 * Uses a dedicated IDB database (dxos-process-manager) so process records
 * survive page reloads without consuming the 5 MB localStorage quota.
 * Falls back to an in-memory store in environments without IndexedDB (e.g. Node.js tests).
 */
export const layerIdb: Layer.Layer<KeyValueStore.KeyValueStore> =
  typeof globalThis.indexedDB !== 'undefined'
    ? Layer.sync(KeyValueStore.KeyValueStore, () => {
        const store = idb.createStore(DB_NAME, STORE_NAME);
        return KeyValueStore.makeStringOnly({
          get: (key) =>
            Effect.tryPromise({
              try: () => idb.get<string>(key, store).then(Option.fromNullable),
              catch: (err) => idbError('get', key, err),
            }),

          set: (key, value) =>
            Effect.tryPromise({
              try: () => idb.set(key, value, store),
              catch: (err) => idbError('set', key, err),
            }),

          remove: (key) =>
            Effect.tryPromise({
              try: () => idb.del(key, store),
              catch: (err) => idbError('remove', key, err),
            }),

          clear: Effect.tryPromise({
            try: () => idb.clear(store),
            catch: (err) => idbError('clear', '', err),
          }),

          size: Effect.tryPromise({
            try: () => idb.keys(store).then((ks) => ks.length),
            catch: (err) => idbError('size', '', err),
          }),
        });
      })
    : KeyValueStore.layerMemory;
