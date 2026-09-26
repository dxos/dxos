//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import * as SqlClient from 'effect/unstable/sql/SqlClient';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach } from 'vitest';

import { Annotation, Blob, Database, Entity, Filter, Obj, Order, Query, Ref, Relation, Tag, Type } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { EffectEx } from '@dxos/effect';
import { DXN, SpaceId } from '@dxos/keys';
import { SqlMigrations } from '@dxos/sql-sqlite';

import { type OpenOptions, SqliteDatabase } from './database.ts';
import { UnsupportedOperationError, UnsupportedQueryError } from './errors.ts';
import init from './migrations/0001_init.sql?raw';

const TYPES = [
  TestSchema.Person,
  TestSchema.Organization,
  TestSchema.Task,
  TestSchema.EmployedBy,
  TestSchema.HasManager,
  Tag.Tag,
];

let dir: string;
let filename: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'echo-sqlite-'));
  filename = join(dir, `${randomUUID()}.db`);
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

/**
 * Opens the database on the test's SQLite file in its own scope, so each call is a fresh process's view:
 * the connection is closed (and pending writes flushed) before the next session starts.
 */
const session = <A>(body: (db: SqliteDatabase) => Promise<A>, options: OpenOptions = {}): Effect.Effect<A, unknown> =>
  Effect.scoped(
    Effect.gen(function* () {
      const db = yield* SqliteDatabase.open({ types: TYPES, ...options });
      return yield* Effect.promise(() => body(db));
    }),
  ).pipe(Effect.provide(SqliteClient.layer({ filename })));

/** Runs a raw statement against the test's file (outside any database session). */
const rawSql = <A>(effect: Effect.Effect<A, unknown, SqlClient.SqlClient>) =>
  effect.pipe(Effect.provide(SqliteClient.layer({ filename })));

const names = (entities: readonly { name?: string }[]) => entities.map((entity) => entity.name).sort();

/** Polls until `condition` holds; subscriptions re-execute asynchronously after each commit. */
const until = async (condition: () => boolean) => {
  for (let attempt = 0; attempt < 200 && !condition(); attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  expect(condition()).toBe(true);
};

describe('SqliteDatabase', () => {
  it.effect('implements the Database interface (F-1.1)', () =>
    session(async (db) => {
      expect(Database.isDatabase(db)).toBe(true);
      expect(db.graph.getDatabase(db.spaceId)).toBe(db);
    }),
  );

  it.effect('adds, queries, updates, removes and restores objects', () =>
    session(async (db) => {
      const alice = db.add(Obj.make(TestSchema.Person, { name: 'Alice', age: 30 }));
      const bob = db.add(Obj.make(TestSchema.Person, { name: 'Bob', age: 40 }));
      db.add(Obj.make(TestSchema.Organization, { name: 'DXOS' }));

      expect(Obj.getDatabase(alice)).toBe(db);
      expect(await db.query(Filter.type(TestSchema.Person)).run()).toHaveLength(2);
      expect(await db.query(Filter.everything()).run()).toHaveLength(3);
      expect(await db.query(Filter.id(bob.id)).run()).toEqual([bob]);

      Obj.update(alice, (alice) => {
        alice.age = 31;
      });
      expect(await db.query(Filter.type(TestSchema.Person, { age: Filter.gt(35) })).run()).toEqual([bob]);

      db.remove(bob);
      expect(Obj.isDeleted(bob)).toBe(true);
      expect(await db.query(Filter.type(TestSchema.Person)).run()).toEqual([alice]);
      expect(await db.query(Query.select(Filter.type(TestSchema.Person)).options({ deleted: 'only' })).run()).toEqual([
        bob,
      ]);
      expect(db.getObjectById(bob.id)).toBeUndefined();
      expect(db.getObjectById(bob.id, { deleted: true })).toBe(bob);

      db.add(bob);
      expect(Obj.isDeleted(bob)).toBe(false);
      expect(await db.query(Filter.type(TestSchema.Person)).run()).toHaveLength(2);
    }),
  );

  it.effect('reflects every mutation made before run() (T-6, read-your-writes)', () =>
    session(async (db) => {
      const person = db.add(Obj.make(TestSchema.Person, { name: 'Draft' }));
      Obj.update(person, (person) => {
        person.name = 'Final';
      });
      // No flush: run() commits pending writes before executing.
      expect(names(await db.query(Filter.type(TestSchema.Person, { name: 'Final' })).run())).toEqual(['Final']);
    }),
  );

  it.effect('runSync returns the last execution and never blocks (F-5.2)', () =>
    session(async (db) => {
      db.add(Obj.make(TestSchema.Person, { name: 'Alice' }));
      const query = db.query(Filter.type(TestSchema.Person));
      expect(query.runSync()).toEqual([]);
      await until(() => query.runSync().length === 1);
    }),
  );

  it.effect('persists objects, updates and deletions across reopen (T-8)', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      const ids = yield* session(
        async (db) => {
          const alice = db.add(
            Obj.make(TestSchema.Person, { name: 'Alice', address: { city: 'London', coordinates: {} } }),
          );
          const bob = db.add(Obj.make(TestSchema.Person, { name: 'Bob' }));
          Obj.update(alice, (alice) => {
            alice.address!.city = 'Paris';
            alice.fields = [{ label: 'role', value: 'engineer' }];
          });
          Obj.update(alice, (alice) => {
            Obj.getMeta(alice).keys.push({ source: 'example.com', id: 'alice' });
          });
          db.remove(bob);
          await db.flush();
          return { alice: alice.id, bob: bob.id };
        },
        { spaceId },
      );

      yield* session(
        async (db) => {
          const [alice] = await db.query(Filter.type(TestSchema.Person)).run();
          expect(alice.id).toBe(ids.alice);
          expect(alice.address?.city).toBe('Paris');
          expect(alice.fields).toEqual([{ label: 'role', value: 'engineer' }]);
          expect(Obj.getMeta(alice).keys).toEqual([{ source: 'example.com', id: 'alice' }]);
          expect(Obj.getDatabase(alice)).toBe(db);

          const [bob] = await db.query(Query.select(Filter.id(ids.bob)).options({ deleted: 'include' })).run();
          expect(Obj.isDeleted(bob)).toBe(true);

          // Hydrated objects are live: mutations notify and persist.
          let notified = 0;
          Obj.subscribe(alice, () => notified++);
          Obj.update(alice, (alice) => {
            alice.name = 'Alice II';
          });
          expect(notified).toBe(1);
        },
        { spaceId },
      );

      yield* session(
        async (db) => {
          expect(names(await db.query(Filter.type(TestSchema.Person)).run())).toEqual(['Alice II']);
        },
        { spaceId },
      );
    }),
  );

  it.effect('flushes pending writes when the scope closes (F-1.3)', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      yield* session(
        async (db) => {
          db.add(Obj.make(TestSchema.Organization, { name: 'DXOS' }));
        },
        { spaceId },
      );
      yield* session(
        async (db) => {
          expect(names(await db.query(Filter.type(TestSchema.Organization)).run())).toEqual(['DXOS']);
        },
        { spaceId },
      );
    }),
  );

  it.effect('isolates spaces sharing one file (F-2.5)', () =>
    Effect.gen(function* () {
      const [space1, space2] = [SpaceId.random(), SpaceId.random()];
      yield* session(async (db) => void db.add(Obj.make(TestSchema.Organization, { name: 'One' })), {
        spaceId: space1,
      });
      yield* session(async (db) => void db.add(Obj.make(TestSchema.Organization, { name: 'Two' })), {
        spaceId: space2,
      });
      yield* session(
        async (db) => {
          expect(names(await db.query(Filter.everything()).run())).toEqual(['One']);
        },
        { spaceId: space1 },
      );
    }),
  );

  it.effect('persists references and loads targets on demand (F-3.3)', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      yield* session(
        async (db) => {
          // Referenced objects that are not yet stored are added along with the referrer.
          const org = Obj.make(TestSchema.Organization, { name: 'DXOS' });
          const task = Obj.make(TestSchema.Task, { title: 'Write tests' });
          const person = db.add(
            Obj.make(TestSchema.Person, { name: 'Alice', employer: Ref.make(org), tasks: [Ref.make(task)] }),
          );
          expect(Obj.getDatabase(org)).toBe(db);
          expect(Obj.getDatabase(task)).toBe(db);

          // Refs assigned after the add are adopted too.
          const next = Obj.make(TestSchema.Task, { title: 'Ship it' });
          Obj.update(task, (task) => {
            task.previous = Ref.make(next);
            task.assignee = Ref.make(person);
          });
          expect(await db.query(Filter.type(TestSchema.Task)).run()).toHaveLength(2);
        },
        { spaceId },
      );

      yield* session(
        async (db) => {
          const [person] = await db.query(Filter.type(TestSchema.Person)).run();
          // Not resident yet: the synchronous accessor never reads storage.
          expect(person.employer?.target).toBeUndefined();
          const org = await person.employer?.load();
          expect(org?.name).toBe('DXOS');
          expect(person.employer?.target).toBe(org);

          const [task] = await Promise.all((person.tasks ?? []).map((ref) => ref.load()));
          expect(task.title).toBe('Write tests');
          expect((await task.previous?.load())?.title).toBe('Ship it');
          expect(await task.assignee?.load()).toBe(person);

          const ref = db.makeRef<TestSchema.Person>(Obj.getURI(person));
          expect(ref.target).toBe(person);
          expect(await EffectEx.runPromise(Database.load(ref))).toBe(person);

          expect(await db.query(Query.select(Filter.id(person.id)).reference('employer')).run()).toEqual([org]);
          expect(
            await db
              .query(Query.select(Filter.type(TestSchema.Organization)).referencedBy(TestSchema.Person, 'employer'))
              .run(),
          ).toEqual([person]);
          const [stored] = await db.query(Filter.type(TestSchema.Organization)).run();
          expect(
            await db.query(Filter.type(TestSchema.Person, { employer: Filter.eq(Ref.make(stored)) })).run(),
          ).toEqual([person]);
        },
        { spaceId },
      );
    }),
  );

  it.effect('persists relations and traverses them in SQL', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      yield* session(
        async (db) => {
          const alice = Obj.make(TestSchema.Person, { name: 'Alice' });
          const org = Obj.make(TestSchema.Organization, { name: 'DXOS' });
          db.add(
            Relation.make(TestSchema.EmployedBy, { [Relation.Source]: alice, [Relation.Target]: org, role: 'CTO' }),
          );
          expect(await db.query(Filter.everything()).run()).toHaveLength(3);
        },
        { spaceId },
      );

      yield* session(
        async (db) => {
          const [relation] = await db.query(Filter.type(TestSchema.EmployedBy)).run();
          expect(relation.role).toBe('CTO');
          expect(Relation.getSource(relation).name).toBe('Alice');
          expect(Relation.getTarget(relation).name).toBe('DXOS');

          const employers = await db
            .query(Query.select(Filter.type(TestSchema.Person)).sourceOf(TestSchema.EmployedBy).target())
            .run();
          expect(names(employers)).toEqual(['DXOS']);
          const employees = await db
            .query(Query.select(Filter.type(TestSchema.Organization)).targetOf(TestSchema.EmployedBy).source())
            .run();
          expect(names(employees)).toEqual(['Alice']);

          // A relation whose endpoint is deleted is hidden with it.
          db.remove(Relation.getTarget(relation));
          expect(await db.query(Filter.type(TestSchema.EmployedBy)).run()).toEqual([]);
        },
        { spaceId },
      );
    }),
  );

  it.effect('persists the parent hierarchy and cascades deletion to children (F-4.6)', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      yield* session(
        async (db) => {
          const org = db.add(Obj.make(TestSchema.Organization, { name: 'DXOS' }));
          const task = db.add(Obj.make(TestSchema.Task, { [Obj.Parent]: org, title: 'Child' }));
          db.add(Obj.make(TestSchema.Task, { [Obj.Parent]: task, title: 'Grandchild' }));
        },
        { spaceId },
      );

      yield* session(
        async (db) => {
          const [org] = await db.query(Filter.type(TestSchema.Organization)).run();
          const [task] = await db.query(Filter.type(TestSchema.Task, { title: 'Child' })).run();
          expect(Obj.getParent(task)).toBe(org);
          expect(await db.query(Query.select(Filter.id(org.id)).children()).run()).toEqual([task]);
          expect(await db.query(Query.select(Filter.id(task.id)).parent()).run()).toEqual([org]);
          expect(await db.query(Filter.childOf(org)).run()).toHaveLength(2);
          expect(await db.query(Filter.childOf(org, { transitive: false })).run()).toEqual([task]);

          db.remove(org);
          expect(await db.query(Filter.type(TestSchema.Task)).run()).toEqual([]);
          expect(
            await db.query(Query.select(Filter.type(TestSchema.Task)).options({ deleted: 'only' })).run(),
          ).toHaveLength(2);
        },
        { spaceId },
      );
    }),
  );

  it.effect('orders, limits and combines queries in SQL (F-4.7)', () =>
    session(async (db) => {
      for (const [name, age] of [
        ['Carol', 25],
        ['Alice', 35],
        ['Bob', 30],
      ] as const) {
        db.add(Obj.make(TestSchema.Person, { name, age, email: `${name.toLowerCase()}@example.com` }));
      }

      const byName = await db
        .query(Query.select(Filter.type(TestSchema.Person)).orderBy(Order.property('name', 'asc')))
        .run();
      expect(byName.map((person) => person.name)).toEqual(['Alice', 'Bob', 'Carol']);

      const oldest = await db
        .query(Query.select(Filter.type(TestSchema.Person)).orderBy(Order.property('age', 'desc')).limit(2))
        .run();
      expect(oldest.map((person) => person.name)).toEqual(['Alice', 'Bob']);

      const either = await db
        .query(
          Filter.or(Filter.type(TestSchema.Person, { name: 'Alice' }), Filter.type(TestSchema.Person, { name: 'Bob' })),
        )
        .run();
      expect(names(either)).toEqual(['Alice', 'Bob']);

      const notBob = await db
        .query(Filter.and(Filter.type(TestSchema.Person), Filter.not(Filter.props({ name: 'Bob' }))))
        .run();
      expect(names(notBob)).toEqual(['Alice', 'Carol']);

      const without = await db
        .query(
          Query.without(
            Query.select(Filter.type(TestSchema.Person)),
            Query.select(Filter.type(TestSchema.Person, { name: 'Carol' })),
          ),
        )
        .run();
      expect(names(without)).toEqual(['Alice', 'Bob']);

      expect(names(await db.query(Filter.type(TestSchema.Person, { name: Filter.in('Bob', 'Carol') })).run())).toEqual([
        'Bob',
        'Carol',
      ]);
      expect(names(await db.query(Filter.text('carol@example')).run())).toEqual(['Carol']);
      expect(names(await db.query(Filter.text('bo')).run())).toEqual(['Bob']);
      expect(await db.query(Filter.created({ after: new Date(Date.now() - 60_000) })).run()).toHaveLength(3);
    }),
  );

  it.effect('matches meta keys and tags in SQL', () =>
    session(async (db) => {
      const tag = db.add(Tag.make({ label: 'important' }));
      const person = db.add(
        Obj.make(TestSchema.Person, { name: 'Tagged', [Obj.Meta]: { keys: [{ source: 'crm', id: '42' }] } }),
      );
      Obj.update(person, (person) => {
        Obj.getMeta(person).tags.push(Ref.make(tag));
      });
      db.add(Obj.make(TestSchema.Person, { name: 'Plain' }));

      expect(names(await db.query(Filter.foreignKeys(TestSchema.Person, [{ source: 'crm', id: '42' }])).run())).toEqual(
        ['Tagged'],
      );
      expect(names(await db.query(Filter.tag(Obj.getURI(tag))).run())).toEqual(['Tagged']);
    }),
  );

  it.effect('matches annotations in SQL', () =>
    Effect.gen(function* () {
      const Color = Annotation.make({ id: 'org.dxos.annotation.echo-sqlite-color', schema: Schema.String });
      const spaceId = SpaceId.random();
      yield* session(
        async (db) => {
          for (const [name, color] of [
            ['Red', 'red'],
            ['Blue', 'blue'],
            ['Plain', undefined],
          ] as const) {
            const person = db.add(Obj.make(TestSchema.Person, { name }));
            if (color !== undefined) {
              Obj.update(person, (person) => Annotation.set(person, Color, color));
            }
          }
        },
        { spaceId },
      );
      yield* session(
        async (db) => {
          expect(names(await db.query(Filter.annotation(Color)).run()).sort()).toEqual(['Blue', 'Red']);
          expect(names(await db.query(Filter.annotation(Color, 'red')).run())).toEqual(['Red']);
          expect(names(await db.query(Filter.not(Filter.annotation(Color, 'red'))).run()).sort()).toEqual([
            'Blue',
            'Plain',
          ]);
        },
        { spaceId },
      );
    }),
  );

  it.effect('notifies subscribers only when results change (T-7)', () =>
    session(async (db) => {
      const query = db.query(Filter.type(TestSchema.Person, { age: Filter.gt(18) }));
      const seen: number[] = [];
      const unsubscribe = query.subscribe((result) => seen.push(result.results.length));

      const alice = db.add(Obj.make(TestSchema.Person, { name: 'Alice', age: 30 }));
      await until(() => seen.length === 1);
      db.add(Obj.make(TestSchema.Organization, { name: 'Unrelated' }));
      await db.flush();
      await new Promise((resolve) => setTimeout(resolve, 20));
      Obj.update(alice, (alice) => {
        alice.age = 10;
      });
      await until(() => seen.length === 2);

      unsubscribe();
      expect(seen).toEqual([1, 0]);
    }),
  );

  it.effect('re-executes a subscription only for writes that can affect it (F-5.3)', () =>
    session(async (db) => {
      const org = db.add(Obj.make(TestSchema.Organization, { name: 'DXOS' }));
      db.add(Obj.make(TestSchema.Task, { [Obj.Parent]: org, title: 'Child' }));
      const query = db.query(Filter.type(TestSchema.Task));
      const seen: number[] = [];
      const unsubscribe = query.subscribe((result) => seen.push(result.results.length));
      await until(() => seen.length === 1);

      // A write of another type does not re-execute the query.
      const executed = db.diagnostics().queries;
      Obj.update(org, (org) => {
        org.name = 'Renamed';
      });
      await db.flush();
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(db.diagnostics().queries).toBe(executed);

      // Deleting the parent (another type) hides the task through the cascade, so it must re-execute.
      db.remove(org);
      await until(() => seen.length === 2);
      unsubscribe();
      expect(seen).toEqual([1, 0]);
    }),
  );

  it.effect('persists dynamic types and objects of them (F-7.2)', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      class Note extends Type.makeObject<Note>(DXN.make('com.example.type.note', '0.1.0'))(
        Schema.Struct({ title: Schema.String, body: Schema.optional(Schema.String) }),
      ) {}

      yield* session(
        async (db) => {
          const persisted = await db.addType(Note);
          expect(Type.isType(persisted)).toBe(true);
          expect(await db.addType(Note)).toBe(persisted);
          db.add(Obj.make(Note, { title: 'Hello' }));
        },
        { spaceId },
      );

      // Reopened without registering `Note`: its schema comes from the stored type.
      yield* session(
        async (db) => {
          const types = await db.query(Filter.type(Type.Type)).run();
          expect(types.map((type) => Type.getTypename(type))).toEqual(['com.example.type.note']);
          expect(db.graph.registry.getByURI('dxn:com.example.type.note:0.1.0')).toBe(types[0]);

          const [note] = await db.query(Filter.type(DXN.make('com.example.type.note', '0.1.0'))).run();
          expect(Obj.getTypename(note)).toBe('com.example.type.note');
          expect(Entity.toJSON(note)).toMatchObject({ title: 'Hello' });
        },
        { spaceId, types: [] },
      );
    }),
  );

  it.effect('stores inline blobs', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      const bytes = new Uint8Array([1, 2, 3, 4]);
      yield* session(
        async (db) => {
          db.add(await db.createBlob(bytes, { type: 'application/octet-stream' }));
        },
        { spaceId, types: [Blob.Blob] },
      );
      yield* session(
        async (db) => {
          const [blob] = await db.query(Filter.type(Blob.Blob)).run();
          expect(await db.readBlob(blob)).toEqual(bytes);
          expect(await db.getBlobUrl(blob)).toBe('data:application/octet-stream;base64,AQIDBA==');
        },
        { spaceId, types: [Blob.Blob] },
      );
    }),
  );

  it.effect('builds data URLs for maximum-size inline blobs', () =>
    session(async (db) => {
      const bytes = new Uint8Array(Blob.MAX_INLINE_SIZE).fill(7);
      const url = await db.getBlobUrl(await db.createBlob(bytes));
      const decoded = Buffer.from((url ?? '').split(',')[1] ?? '', 'base64');
      expect(Buffer.compare(decoded, bytes)).toBe(0);
    }),
  );

  it.effect('garbage-collects deleted rows with their side-table rows (F-6.3)', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      yield* session(
        async (db) => {
          const keep = db.add(Obj.make(TestSchema.Organization, { name: 'Keep' }));
          const drop = db.add(Obj.make(TestSchema.Person, { name: 'Drop', employer: Ref.make(keep) }));
          db.remove(drop);
          expect((await db.stats()).objects).toEqual({ alive: 1, deleted: 1 });
          expect((await db.runGarbageCollection()).unlinkedObjects).toBe(1);
          expect((await db.stats()).objects).toEqual({ alive: 1, deleted: 0 });
        },
        { spaceId },
      );
      const counts = yield* rawSql(
        Effect.gen(function* () {
          const sql = yield* SqlClient.SqlClient;
          const [entities] = yield* sql<{ count: number }>`SELECT COUNT(*) AS count FROM echo_entities`;
          const [refs] = yield* sql<{ count: number }>`SELECT COUNT(*) AS count FROM echo_refs`;
          const [text] = yield* sql<{ count: number }>`SELECT COUNT(*) AS count FROM echo_fts`;
          return [entities.count, refs.count, text.count].map(Number);
        }),
      );
      expect(counts).toEqual([1, 0, 1]);
    }),
  );

  it.effect('garbage collection purges what a deletion hides, so it stays hidden', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      yield* session(
        async (db) => {
          const org = db.add(Obj.make(TestSchema.Organization, { name: 'Gone' }));
          db.add(Obj.make(TestSchema.Task, { [Obj.Parent]: org, title: 'Child' }));
          const alice = db.add(Obj.make(TestSchema.Person, { name: 'Alice' }));
          db.add(
            Relation.make(TestSchema.EmployedBy, { [Relation.Source]: alice, [Relation.Target]: org, role: 'CTO' }),
          );
          db.remove(org);

          // Org, its child task and the relation to it; Alice survives.
          expect((await db.runGarbageCollection()).unlinkedObjects).toBe(3);
          expect(await db.query(Filter.type(TestSchema.Task)).run()).toEqual([]);
          expect(await db.query(Filter.type(TestSchema.EmployedBy)).run()).toEqual([]);
          expect(names(await db.query(Filter.everything()).run())).toEqual(['Alice']);
        },
        { spaceId },
      );
    }),
  );

  it.effect('retries a failed write instead of dropping it (T-9)', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      yield* session(
        async (db) => {
          const doomed = db.add(Obj.make(TestSchema.Organization, { name: 'Doomed' }));
          await db.flush();

          await EffectEx.runPromise(
            rawSql(
              Effect.gen(function* () {
                const sql = yield* SqlClient.SqlClient;
                yield* sql`DROP TABLE echo_entities`;
              }),
            ),
          );
          db.add(Obj.make(TestSchema.Organization, { name: 'Added' }));
          db.remove(doomed);
          await expect(db.flush()).rejects.toBeDefined();

          await EffectEx.runPromise(rawSql(SqlMigrations.apply(init)));
          await db.flush();
        },
        { spaceId },
      );
      yield* session(
        async (db) => {
          expect(names(await db.query(Filter.type(TestSchema.Organization)).run())).toEqual(['Added']);
          expect(
            names(
              await db.query(Query.select(Filter.type(TestSchema.Organization)).options({ deleted: 'only' })).run(),
            ),
          ).toEqual(['Doomed']);
        },
        { spaceId },
      );
    }),
  );

  it.effect('works through the Effect Database service (F-1.3)', () =>
    Effect.gen(function* () {
      const people = yield* Effect.gen(function* () {
        yield* Database.add(Obj.make(TestSchema.Person, { name: 'Alice' }));
        return yield* Database.query(Filter.type(TestSchema.Person)).run;
      }).pipe(
        Effect.provide(SqliteDatabase.layer({ types: TYPES }).pipe(Layer.provide(SqliteClient.layer({ filename })))),
      );
      expect(people.map((person) => person.name)).toEqual(['Alice']);
    }),
  );

  it.effect('rejects unsupported operations and clauses (F-1.4, F-4.8)', () =>
    session(async (db) => {
      expect(() => db.add(TestSchema.Person as never)).toThrow();
      expect(db.listBranches('x')).toEqual(['main']);
      await expect(db.createBranch()).rejects.toBeInstanceOf(UnsupportedOperationError);
      expect(() => db.retainObjects([])).toThrow(UnsupportedOperationError);
      expect(() => db.getChanges(Obj.make(TestSchema.Person, {}))).toThrow(UnsupportedOperationError);
      expect(() => db.query(Filter.key('com.example.key', { version: '^1.0.0' }))).toThrow(UnsupportedQueryError);
      expect(() => db.query(Filter.key('com.example.key', { version: '1.0.0' }))).not.toThrow();
      expect(() => db.query(Filter.text('alice', { type: 'vector' }))).toThrow(UnsupportedQueryError);
    }),
  );
});
