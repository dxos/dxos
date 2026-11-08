//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach } from 'vitest';

import { Database, Entity, Filter, Obj, Query, Tag } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import * as EffectEx from '@dxos/effect/EffectEx';

import { SqliteDatabase } from './database.ts';

const TYPES = [TestSchema.Person, TestSchema.Organization, Tag.Tag];

let dir: string;
let filename: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'echo-sqlite-spike-'));
  filename = join(dir, `${randomUUID()}.db`);
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const session = <A>(body: (db: SqliteDatabase) => Promise<A>): Effect.Effect<A, unknown> =>
  Effect.scoped(
    Effect.gen(function* () {
      const db = yield* SqliteDatabase.open({ types: TYPES });
      return yield* Effect.promise(() => body(db));
    }),
  ).pipe(Effect.provide(SqliteClient.layer({ filename })));

describe('assistant handler surface (spike)', () => {
  it.effect('runs the memory skill handlers verbatim against this backend', () =>
    session(async (db) => {
      const layer = Database.layer(db);

      // `SaveMemory`'s body.
      const saved = await EffectEx.runPromise(
        Effect.gen(function* () {
          const obj = yield* Database.add(Obj.make(TestSchema.Person, { name: 'Alice' }));
          return Entity.toJSON(obj);
        }).pipe(Effect.provide(layer)),
      );
      expect(saved).toBeDefined();

      // `QueryMemories`'s body, including the full-text filter and the limit.
      const found = await EffectEx.runPromise(
        Effect.gen(function* () {
          const query = Query.all(
            ...'Alice'.split(' ').map((term) => Query.select(Filter.text(term, { type: 'full-text' }))),
          )
            .select(Filter.type(TestSchema.Person))
            .limit(10);
          yield* Database.flush();
          const results = yield* Database.query(query).run;
          return results.map((obj) => Entity.toJSON(obj));
        }).pipe(Effect.provide(layer)),
      );
      expect(found).toHaveLength(1);
    }),
  );
});
