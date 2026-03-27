//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as KeyValueStore from '@effect/platform/KeyValueStore';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

/**
 * Scoped key-value storage service for processes.
 * Each process receives its own namespaced instance via the process manager.
 */
export class StorageService extends Context.Tag('@dxos/functions-runtime/StorageService')<
  StorageService,
  {
    /** Read a value by key. Returns `None` if key does not exist. */
    get<S extends Schema.Schema<any, string, any>>(
      schema: S,
      key: string,
    ): Effect.Effect<Option.Option<Schema.Schema.Type<S>>, never, Schema.Schema.Context<S>>;

    /** Write a value for the given key. */
    set<S extends Schema.Schema<any, string, any>>(
      schema: S,
      key: string,
      value: Schema.Schema.Type<S>,
    ): Effect.Effect<void, never, Schema.Schema.Context<S>>;

    /** Remove a key. */
    delete(key: string): Effect.Effect<void>;

    /** List all keys, optionally filtered by prefix. */
    list(prefix?: string): Effect.Effect<readonly string[]>;

    /** Remove all keys managed by this scoped store. */
    clear(): Effect.Effect<void>;
  }
>() {}

export const get = Effect.serviceFunctionEffect(StorageService, (_) => _.get);
export const set = Effect.serviceFunctionEffect(StorageService, (_) => _.set);
export const deleteKey = Effect.serviceFunctionEffect(StorageService, (_) => _.delete);
export const list = Effect.serviceFunctionEffect(StorageService, (_) => _.list);
export const clear = Effect.serviceFunctionEffect(StorageService, (_) => _.clear);

/**
 * Create a StorageService scoped under `prefix` in the given backing store.
 * All keys are transparently namespaced so processes cannot collide.
 */
export const layer = (kvStore: KeyValueStore.KeyValueStore, prefix: string): Context.Tag.Service<StorageService> => {
  const prefixed = KeyValueStore.prefix(kvStore, prefix);
  const knownKeys = new Set<string>();

  return {
    get: <S extends Schema.Schema<any, string, any>>(schema: S, key: string) =>
      Effect.gen(function* () {
        const opt = yield* prefixed.get(key).pipe(Effect.orDie);
        if (Option.isNone(opt)) {
          return Option.none();
        }
        const decoded = yield* Schema.decode(schema)(opt.value).pipe(Effect.orDie);
        return Option.some(decoded);
      }),

    set: <S extends Schema.Schema<any, string, any>>(schema: S, key: string, value: Schema.Schema.Type<S>) =>
      Effect.gen(function* () {
        const encoded = yield* Schema.encode(schema)(value).pipe(Effect.orDie);
        yield* prefixed.set(key, encoded).pipe(
          Effect.tap(() => Effect.sync(() => knownKeys.add(key))),
          Effect.orDie,
        );
      }),

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

    clear: () =>
      Effect.forEach([...knownKeys], (key) => prefixed.remove(key)).pipe(
        Effect.tap(() => Effect.sync(() => knownKeys.clear())),
        Effect.asVoid,
        Effect.orDie,
      ),
  };
};
