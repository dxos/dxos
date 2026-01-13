//
// Copyright 2026 DXOS.org
//

import * as Reactivity from '@effect/experimental/Reactivity';
import * as SqlClient from '@effect/sql/SqlClient';
import * as SqliteClient from '@effect/sql-sqlite-wasm/SqliteClient';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

describe('opfs-worker browser test', () => {
  it.effect(
    'should run the opfs worker',
    Effect.fnUntraced(function* () {
      const clientLayer = SqliteClient.layer({
        worker: Effect.sync(() => new Worker(new URL('./opfs-worker.ts', import.meta.url), { type: 'module' })),
      });

      yield* Effect.gen(function* () {
        const client = yield* SqlClient.SqlClient;
        yield* client`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT)`;
        yield* client`INSERT INTO users (name) VALUES ('Alice')`;
        yield* client`INSERT INTO users (name) VALUES ('Bob')`;
        const results = yield* client`SELECT * FROM users`;

        expect(results).toHaveLength(2);
        expect(results[0].name).toBe('Alice');
        expect(results[1].name).toBe('Bob');
      }).pipe(Effect.provide(clientLayer.pipe(Layer.provideMerge(Reactivity.layer))));
    }),
  );
});
