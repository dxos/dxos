//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as KeyValueStore from '@effect/platform/KeyValueStore';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

/**
 * Scoped key-value storage service for processes.
 * Each process receives its own namespaced instance via the process manager.
 */
export class StorageService extends Context.Tag('@dxos/functions-runtime/StorageService')<
  StorageService,
  {
    /** Read a value by key. Returns `None` if key does not exist. */
    get(key: string): Effect.Effect<Option.Option<string>>;

    /** Write a value for the given key. */
    set(key: string, value: string): Effect.Effect<void>;

    /** Remove a key. */
    delete(key: string): Effect.Effect<void>;

    /** List all keys, optionally filtered by prefix. */
    list(prefix?: string): Effect.Effect<readonly string[]>;
  }
>() {
  static get = Effect.serviceFunctionEffect(StorageService, (_) => _.get);
  static set = Effect.serviceFunctionEffect(StorageService, (_) => _.set);
  static delete = Effect.serviceFunctionEffect(StorageService, (_) => _.delete);
  static list = Effect.serviceFunctionEffect(StorageService, (_) => _.list);

  /**
   * Create a StorageService scoped under `prefix` in the given backing store.
   * All keys are transparently namespaced so processes cannot collide.
   */
  static scoped(kvStore: KeyValueStore.KeyValueStore, prefix: string): Context.Tag.Service<StorageService> {
    const prefixed = KeyValueStore.prefix(kvStore, prefix);
    const knownKeys = new Set<string>();

    return {
      get: (key: string) => prefixed.get(key).pipe(Effect.orDie),

      set: (key: string, value: string) =>
        prefixed.set(key, value).pipe(
          Effect.tap(() => Effect.sync(() => knownKeys.add(key))),
          Effect.orDie,
        ),

      delete: (key: string) =>
        prefixed.remove(key).pipe(
          Effect.tap(() => Effect.sync(() => knownKeys.delete(key))),
          Effect.orDie,
        ),

      list: (keyPrefix?: string) =>
        Effect.sync(() => {
          const keys = [...knownKeys];
          if (keyPrefix === undefined) {
            return keys;
          }
          return keys.filter((key) => key.startsWith(keyPrefix));
        }),
    };
  }
}
