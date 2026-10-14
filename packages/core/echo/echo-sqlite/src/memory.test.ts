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
import { setFlagsFromString } from 'node:v8';
import { runInNewContext } from 'node:vm';
import { afterEach, beforeEach } from 'vitest';

import { Filter, Obj, Query, Ref } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { SpaceId } from '@dxos/keys';

import { type OpenOptions, SqliteDatabase } from './database.ts';

// A fresh context sees `gc` once the flag is set, without starting node with --expose-gc.
setFlagsFromString('--expose-gc');
const gc: () => void = runInNewContext('gc');

/**
 * Runs full collections across macrotask turns: WeakRef targets deref'd in a job stay alive until the
 * job ends, and FinalizationRegistry callbacks run in later tasks.
 */
const collect = async () => {
  for (let round = 0; round < 6; round++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    gc();
  }
};

const TYPES = [TestSchema.Person, TestSchema.Organization, TestSchema.Task];

let dir: string;
let filename: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'echo-sqlite-memory-'));
  filename = join(dir, `${randomUUID()}.db`);
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const session = <A, E>(body: (db: SqliteDatabase) => Effect.Effect<A, E>, options: OpenOptions = {}) =>
  Effect.scoped(
    Effect.gen(function* () {
      const db = yield* SqliteDatabase.open({ types: TYPES, ...options });
      return yield* body(db);
    }),
  ).pipe(Effect.provide(SqliteClient.layer({ filename })));

/** Seeds `count` people (each with an employer ref to one shared organization) and closes. */
const seed = (spaceId: SpaceId, count: number) =>
  session(
    (db) =>
      Effect.promise(async () => {
        const org = db.add(Obj.make(TestSchema.Organization, { name: 'DXOS' }));
        for (let index = 0; index < count; index++) {
          db.add(Obj.make(TestSchema.Person, { name: `Person ${index}`, age: index % 90, employer: Ref.make(org) }));
        }
        await db.flush();
      }),
    { spaceId },
  );

describe('Memory residency', () => {
  it.effect('opening a large space reads no object rows (T-1)', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      yield* seed(spaceId, 2_000);
      yield* session(
        (db) =>
          Effect.promise(async () => {
            expect(db.diagnostics()).toMatchObject({ hydrated: 0, resident: 0, queries: 0, loads: 0 });

            const page = await db.query(Query.select(Filter.type(TestSchema.Person)).limit(10)).run();
            expect(page).toHaveLength(10);
            expect(db.diagnostics()).toMatchObject({ hydrated: 10, queries: 1, loads: 0 });
          }),
        { spaceId },
      );
    }),
  );

  it.effect('query results nobody holds are released (T-2)', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      yield* seed(spaceId, 1_000);
      yield* session(
        (db) =>
          Effect.promise(async () => {
            // Held only through WeakRefs once this function returns.
            const refs = await (async () => {
              const people = await db.query(Filter.type(TestSchema.Person)).run();
              expect(people).toHaveLength(1_000);
              return people.map((person) => new WeakRef(person));
            })();
            expect(db.diagnostics().hydrated).toBe(1_000);

            await collect();

            expect(refs.filter((ref) => ref.deref() !== undefined)).toHaveLength(0);
            expect(db.diagnostics().resident).toBe(0);

            // A later lookup re-reads the rows.
            const again = await db.query(Query.select(Filter.type(TestSchema.Person)).limit(5)).run();
            expect(again).toHaveLength(5);
            expect(db.diagnostics().hydrated).toBe(1_005);
          }),
        { spaceId },
      );
    }),
  );

  it.effect('held objects stay resident and keep their identity', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      yield* seed(spaceId, 200);
      yield* session(
        (db) =>
          Effect.promise(async () => {
            const [held] = await db.query(Query.select(Filter.type(TestSchema.Person, { name: 'Person 7' }))).run();
            await (async () => {
              await db.query(Filter.type(TestSchema.Person)).run();
            })();

            await collect();

            // Only the held object survives, and a new query returns that same instance.
            expect(db.diagnostics().resident).toBe(1);
            const [same] = await db.query(Query.select(Filter.type(TestSchema.Person, { name: 'Person 7' }))).run();
            expect(same).toBe(held);
          }),
        { spaceId },
      );
    }),
  );

  it.effect('unflushed changes are never collected', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      yield* seed(spaceId, 10);
      yield* session(
        (db) =>
          Effect.promise(async () => {
            await (async () => {
              const [person] = await db.query(Query.select(Filter.type(TestSchema.Person, { name: 'Person 3' }))).run();
              Obj.update(person, (person) => {
                person.name = 'Renamed';
              });
            })();
            await collect();
            await db.flush();
            await collect();
            expect(db.diagnostics().resident).toBe(0);

            const renamed = await db.query(Filter.type(TestSchema.Person, { name: 'Renamed' })).run();
            expect(renamed).toHaveLength(1);
          }),
        { spaceId },
      );
    }),
  );

  it.effect('resolving a ref loads one row and the target is released with its referrer', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      yield* seed(spaceId, 50);
      yield* session(
        (db) =>
          Effect.promise(async () => {
            const employer = await (async () => {
              const [person] = await db.query(Query.select(Filter.type(TestSchema.Person)).limit(1)).run();
              const org = await person.employer?.load();
              expect(org?.name).toBe('DXOS');
              expect(db.diagnostics()).toMatchObject({ hydrated: 2, loads: 1 });
              return new WeakRef(org ?? {});
            })();

            await collect();

            expect(employer.deref()).toBeUndefined();
            expect(db.diagnostics().resident).toBe(0);
          }),
        { spaceId },
      );
    }),
  );
});
