//
// Copyright 2026 DXOS.org
//

import * as KeyValueStore from '@effect/platform/KeyValueStore';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { StorageService } from '@dxos/functions';

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
