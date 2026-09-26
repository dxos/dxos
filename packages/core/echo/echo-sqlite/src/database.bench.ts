//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import * as Scope from 'effect/Scope';
import type * as SqlClient from 'effect/unstable/sql/SqlClient';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bench, describe } from 'vitest';

import { Filter, Obj, Order, Query, Ref } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { EID, EntityId, SpaceId } from '@dxos/keys';

import { SqliteDatabase } from './database.ts';

// Run with: DX_RUN_MANUAL_TESTS=1 pnpm exec vitest bench --run (from this package).
const OBJECTS = Number(process.env.ECHO_SQLITE_BENCH_OBJECTS ?? 10_000);
const ORGANIZATIONS = 100;
const TYPES = [TestSchema.Person, TestSchema.Organization];
const OPTIONS = { time: 1_000 };

type State = {
  runtime: ManagedRuntime.ManagedRuntime<SqlClient.SqlClient, never>;
  db: SqliteDatabase;
  /** A second instance on the same file whose working set only the cold-load bench touches. */
  cold: SqliteDatabase;
  spaceId: SpaceId;
  personIds: string[];
  orgIds: string[];
};

let statePromise: Promise<State> | undefined;
let counter = 0;

/**
 * One seeded space shared by every bench. A lazy singleton rather than `beforeAll`, which vitest's
 * `bench()` does not await before the first (warmup) call.
 */
const ensureState = (): Promise<State> => {
  statePromise ??= (async () => {
    const dir = mkdtempSync(join(tmpdir(), 'echo-sqlite-bench-'));
    process.once('exit', () => rmSync(dir, { recursive: true, force: true }));
    const runtime = ManagedRuntime.make(SqliteClient.layer({ filename: join(dir, 'bench.db') }).pipe(Layer.orDie));
    const spaceId = SpaceId.random();
    const scope = await runtime.runPromise(Scope.make());
    process.once('exit', () => void runtime.runPromise(Scope.close(scope, Exit.void)));
    const db = await runtime.runPromise(SqliteDatabase.open({ spaceId, types: TYPES }).pipe(Scope.provide(scope)));

    const orgs = Array.from({ length: ORGANIZATIONS }, (_, index) =>
      db.add(Obj.make(TestSchema.Organization, { name: `Organization ${index}` })),
    );
    const personIds: string[] = [];
    for (let index = 0; index < OBJECTS; index++) {
      const person = db.add(
        Obj.make(TestSchema.Person, {
          name: `Person ${index}`,
          email: `person${index}@example.com`,
          age: index % 90,
          employer: Ref.make(orgs[index % ORGANIZATIONS]),
        }),
      );
      personIds.push(person.id);
    }
    await db.flush();
    const cold = await runtime.runPromise(SqliteDatabase.open({ spaceId, types: TYPES }).pipe(Scope.provide(scope)));
    return { runtime, db, cold, spaceId, personIds, orgIds: orgs.map((org) => org.id) };
  })();
  return statePromise;
};

const pick = <T>(values: readonly T[]): T => values[counter++ % values.length];

describe(
  `echo-sqlite (${OBJECTS.toLocaleString()} people, ${ORGANIZATIONS} organizations)`,
  { tags: ['manual'], timeout: 600_000 },
  () => {
    bench(
      'open space + first page (limit 10)',
      async () => {
        const { runtime, spaceId } = await ensureState();
        await runtime.runPromise(
          Effect.scoped(
            Effect.gen(function* () {
              const db = yield* SqliteDatabase.open({ spaceId, types: TYPES });
              yield* Effect.promise(() => db.query(Query.select(Filter.type(TestSchema.Person)).limit(10)).run());
            }),
          ),
        );
      },
      OPTIONS,
    );

    bench(
      'query: type, limit 10',
      async () => {
        const { db } = await ensureState();
        await db.query(Query.select(Filter.type(TestSchema.Person)).limit(10)).run();
      },
      OPTIONS,
    );

    bench(
      'query: property eq (1 match)',
      async () => {
        const { db } = await ensureState();
        await db.query(Filter.type(TestSchema.Person, { name: `Person ${counter++ % OBJECTS}` })).run();
      },
      OPTIONS,
    );

    bench(
      'query: range + orderBy property, limit 20',
      async () => {
        const { db } = await ensureState();
        await db
          .query(
            Query.select(Filter.type(TestSchema.Person, { age: Filter.between(30, 40) }))
              .orderBy(Order.property('name', 'desc'))
              .limit(20),
          )
          .run();
      },
      OPTIONS,
    );

    bench(
      'query: full-text (trigram), limit 10',
      async () => {
        const { db } = await ensureState();
        await db.query(Query.select(Filter.text(`person${counter++ % OBJECTS}@`)).limit(10)).run();
      },
      OPTIONS,
    );

    bench(
      'query: reference traversal (10 people → employers)',
      async () => {
        const { db } = await ensureState();
        await db.query(Query.select(Filter.type(TestSchema.Person)).limit(10).reference('employer')).run();
      },
      OPTIONS,
    );

    bench(
      'query: incoming references (org ← its people)',
      async () => {
        const { db, orgIds } = await ensureState();
        await db.query(Query.select(Filter.id(pick(orgIds))).referencedBy(TestSchema.Person, 'employer')).run();
      },
      OPTIONS,
    );

    bench(
      `query: hydrate all ${OBJECTS.toLocaleString()} people`,
      async () => {
        const { db } = await ensureState();
        await db.query(Filter.type(TestSchema.Person)).run();
      },
      { time: 3_000 },
    );

    let coldIndex = 0;
    bench(
      'ref load, cold (reads + hydrates 1 row)',
      async () => {
        const { cold, personIds } = await ensureState();
        // Each call loads a person this instance has not loaded before.
        await cold.makeRef(EID.make({ entityId: EntityId.make(personIds[coldIndex++ % personIds.length]) })).load();
      },
      { time: 500 },
    );

    bench(
      'ref load, resident (working-set hit)',
      async () => {
        const { db, orgIds } = await ensureState();
        await db.makeRef(EID.make({ entityId: EntityId.make(orgIds[0]) })).load();
      },
      OPTIONS,
    );

    bench(
      'insert 1 object + flush',
      async () => {
        const { db } = await ensureState();
        db.add(Obj.make(TestSchema.Organization, { name: `New ${counter++}` }));
        await db.flush();
      },
      OPTIONS,
    );

    bench(
      'update 1 resident object + flush',
      async () => {
        const { db, orgIds } = await ensureState();
        const org = await db
          .makeRef<TestSchema.Organization>(EID.make({ entityId: EntityId.make(pick(orgIds)) }))
          .load();
        Obj.update(org, (org) => {
          org.name = `Renamed ${counter++}`;
        });
        await db.flush();
      },
      OPTIONS,
    );
  },
);
