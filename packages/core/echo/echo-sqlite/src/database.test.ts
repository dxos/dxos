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

import { Blob, Database, Entity, Filter, Obj, Order, Query, Ref, Relation, Type } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { DXN, SpaceId } from '@dxos/keys';
import { SqlMigrations } from '@dxos/sql-sqlite';

import { type OpenOptions, SqliteDatabase, UnsupportedOperationError } from './database.ts';
import init from './migrations/0001_init.sql?raw';

const TYPES = [
  TestSchema.Person,
  TestSchema.Organization,
  TestSchema.Task,
  TestSchema.EmployedBy,
  TestSchema.HasManager,
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
const session = <A, E>(
  body: (db: SqliteDatabase) => Effect.Effect<A, E, SqlClient.SqlClient>,
  options: OpenOptions = {},
): Effect.Effect<A, unknown> =>
  Effect.scoped(
    Effect.gen(function* () {
      const db = yield* SqliteDatabase.open({ types: TYPES, ...options });
      return yield* body(db);
    }),
  ).pipe(Effect.provide(SqliteClient.layer({ filename })));

const promise = <A>(fn: () => Promise<A>) => Effect.promise(fn);

describe('SqliteDatabase', () => {
  it.effect('implements the Database interface', () =>
    session((db) =>
      Effect.sync(() => {
        expect(Database.isDatabase(db)).toBe(true);
        expect(db.graph.getDatabase(db.spaceId)).toBe(db);
      }),
    ),
  );

  it.effect('adds, queries, updates and removes objects', () =>
    session((db) =>
      Effect.gen(function* () {
        const alice = db.add(Obj.make(TestSchema.Person, { name: 'Alice', age: 30 }));
        const bob = db.add(Obj.make(TestSchema.Person, { name: 'Bob', age: 40 }));
        db.add(Obj.make(TestSchema.Organization, { name: 'DXOS' }));

        expect(Obj.getDatabase(alice)).toBe(db);
        expect(db.query(Filter.type(TestSchema.Person)).runSync()).toHaveLength(2);
        expect(yield* promise(() => db.query(Filter.everything()).run())).toHaveLength(3);
        expect(db.query(Filter.id(bob.id)).runSync()).toEqual([bob]);

        Obj.update(alice, (alice) => {
          alice.age = 31;
        });
        expect(db.query(Filter.type(TestSchema.Person, { age: Filter.gt(35) })).runSync()).toEqual([bob]);

        db.remove(bob);
        expect(Obj.isDeleted(bob)).toBe(true);
        expect(db.query(Filter.type(TestSchema.Person)).runSync()).toEqual([alice]);
        expect(db.query(Query.select(Filter.type(TestSchema.Person)).options({ deleted: 'only' })).runSync()).toEqual([
          bob,
        ]);
        expect(db.getObjectById(bob.id)).toBeUndefined();
        expect(db.getObjectById(bob.id, { deleted: true })).toBe(bob);

        // Re-adding a removed object restores it.
        db.add(bob);
        expect(Obj.isDeleted(bob)).toBe(false);
        expect(db.query(Filter.type(TestSchema.Person)).runSync()).toHaveLength(2);
      }),
    ),
  );

  it.effect('persists objects, updates and deletions across reopen', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      const ids = yield* session(
        (db) =>
          Effect.gen(function* () {
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
            yield* promise(() => db.flush());
            return { alice: alice.id, bob: bob.id };
          }),
        { spaceId },
      );

      yield* session(
        (db) =>
          Effect.sync(() => {
            const [alice] = db.query(Filter.type(TestSchema.Person)).runSync();
            expect(alice.id).toBe(ids.alice);
            expect(alice.name).toBe('Alice');
            expect(alice.address?.city).toBe('Paris');
            expect(alice.fields).toEqual([{ label: 'role', value: 'engineer' }]);
            expect(Obj.getMeta(alice).keys).toEqual([{ source: 'example.com', id: 'alice' }]);
            expect(Obj.getDatabase(alice)).toBe(db);
            expect(Obj.getTypename(alice)).toBe(Type.getTypename(TestSchema.Person));

            const bob = db.getObjectById(ids.bob, { deleted: true });
            expect(bob && Obj.isDeleted(bob)).toBe(true);

            // Hydrated objects are live: mutations notify and persist.
            let notified = 0;
            Obj.subscribe(alice, () => notified++);
            Obj.update(alice, (alice) => {
              alice.name = 'Alice II';
            });
            expect(notified).toBe(1);
          }),
        { spaceId },
      );

      yield* session(
        (db) =>
          Effect.sync(() => {
            expect(
              db
                .query(Filter.type(TestSchema.Person))
                .runSync()
                .map((person) => person.name),
            ).toEqual(['Alice II']);
          }),
        { spaceId },
      );
    }),
  );

  it.effect('flushes pending writes when the scope closes', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      yield* session(
        (db) =>
          Effect.sync(() => {
            // No explicit flush.
            db.add(Obj.make(TestSchema.Organization, { name: 'DXOS' }));
          }),
        { spaceId },
      );
      yield* session(
        (db) =>
          Effect.sync(() => {
            expect(
              db
                .query(Filter.type(TestSchema.Organization))
                .runSync()
                .map((org) => org.name),
            ).toEqual(['DXOS']);
          }),
        { spaceId },
      );
    }),
  );

  it.effect('isolates spaces sharing one file', () =>
    Effect.gen(function* () {
      const [space1, space2] = [SpaceId.random(), SpaceId.random()];
      yield* session((db) => Effect.sync(() => db.add(Obj.make(TestSchema.Organization, { name: 'One' }))), {
        spaceId: space1,
      });
      yield* session((db) => Effect.sync(() => db.add(Obj.make(TestSchema.Organization, { name: 'Two' }))), {
        spaceId: space2,
      });
      yield* session(
        (db) =>
          Effect.sync(() => {
            expect(
              db
                .query(Filter.everything())
                .runSync()
                .map((org) => Obj.getLabel(org) ?? ''),
            ).toHaveLength(1);
            expect(db.query(Filter.type(TestSchema.Organization)).runSync()[0].name).toBe('One');
          }),
        { spaceId: space1 },
      );
    }),
  );

  it.effect('persists and resolves references', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      yield* session(
        (db) =>
          Effect.sync(() => {
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
            expect(db.query(Filter.type(TestSchema.Task)).runSync()).toHaveLength(2);
          }),
        { spaceId },
      );

      yield* session(
        (db) =>
          Effect.gen(function* () {
            const [person] = db.query(Filter.type(TestSchema.Person)).runSync();
            expect(person.employer?.target?.name).toBe('DXOS');
            const [task] = yield* promise(() => Promise.all(person.tasks!.map((ref) => ref.load())));
            expect(task.title).toBe('Write tests');
            expect(task.previous?.target?.title).toBe('Ship it');
            expect(task.assignee?.target).toBe(person);

            // `makeRef` hydrates a ref against this database.
            const ref = db.makeRef<TestSchema.Person>(Obj.getURI(person));
            expect(ref.target).toBe(person);
            expect(yield* Database.load(ref).pipe(Effect.provide(Database.layer(db)))).toBe(person);

            // Traversals.
            expect(db.query(Query.select(Filter.id(person.id)).reference('employer')).runSync()).toEqual([
              person.employer?.target,
            ]);
            expect(
              db
                .query(Query.select(Filter.type(TestSchema.Organization)).referencedBy(TestSchema.Person, 'employer'))
                .runSync(),
            ).toEqual([person]);
          }),
        { spaceId },
      );
    }),
  );

  it.effect('persists relations and traverses them', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      yield* session(
        (db) =>
          Effect.sync(() => {
            const alice = Obj.make(TestSchema.Person, { name: 'Alice' });
            const org = Obj.make(TestSchema.Organization, { name: 'DXOS' });
            // Endpoints are added with the relation.
            db.add(
              Relation.make(TestSchema.EmployedBy, { [Relation.Source]: alice, [Relation.Target]: org, role: 'CTO' }),
            );
            expect(db.query(Filter.everything()).runSync()).toHaveLength(3);
          }),
        { spaceId },
      );

      yield* session(
        (db) =>
          Effect.sync(() => {
            const [relation] = db.query(Filter.type(TestSchema.EmployedBy)).runSync();
            expect(relation.role).toBe('CTO');
            expect(Relation.getSource(relation).name).toBe('Alice');
            expect(Relation.getTarget(relation).name).toBe('DXOS');

            const employers = db
              .query(Query.select(Filter.type(TestSchema.Person)).sourceOf(TestSchema.EmployedBy).target())
              .runSync();
            expect(employers.map((org) => org.name)).toEqual(['DXOS']);

            const employees = db
              .query(Query.select(Filter.type(TestSchema.Organization)).targetOf(TestSchema.EmployedBy).source())
              .runSync();
            expect(employees.map((person) => person.name)).toEqual(['Alice']);
          }),
        { spaceId },
      );
    }),
  );

  it.effect('persists the parent hierarchy', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      yield* session(
        (db) =>
          Effect.sync(() => {
            const org = db.add(Obj.make(TestSchema.Organization, { name: 'DXOS' }));
            db.add(Obj.make(TestSchema.Task, { [Obj.Parent]: org, title: 'Child' }));
          }),
        { spaceId },
      );

      yield* session(
        (db) =>
          Effect.sync(() => {
            const [task] = db.query(Filter.type(TestSchema.Task)).runSync();
            const [org] = db.query(Filter.type(TestSchema.Organization)).runSync();
            expect(Obj.getParent(task)).toBe(org);
            expect(db.query(Query.select(Filter.id(org.id)).children()).runSync()).toEqual([task]);
            expect(db.query(Query.select(Filter.id(task.id)).parent()).runSync()).toEqual([org]);
            expect(db.query(Filter.childOf(org)).runSync()).toEqual([task]);
          }),
        { spaceId },
      );
    }),
  );

  it.effect('orders, limits and combines queries', () =>
    session((db) =>
      Effect.sync(() => {
        for (const [name, age] of [
          ['Carol', 25],
          ['Alice', 35],
          ['Bob', 30],
        ] as const) {
          db.add(Obj.make(TestSchema.Person, { name, age }));
        }

        const byName = db
          .query(Query.select(Filter.type(TestSchema.Person)).orderBy(Order.property('name', 'asc')))
          .runSync()
          .map((person) => person.name);
        expect(byName).toEqual(['Alice', 'Bob', 'Carol']);

        const oldest = db
          .query(Query.select(Filter.type(TestSchema.Person)).orderBy(Order.property('age', 'desc')).limit(2))
          .runSync()
          .map((person) => person.name);
        expect(oldest).toEqual(['Alice', 'Bob']);

        const either = db
          .query(
            Filter.or(
              Filter.type(TestSchema.Person, { name: 'Alice' }),
              Filter.type(TestSchema.Person, { name: 'Bob' }),
            ),
          )
          .runSync();
        expect(either).toHaveLength(2);

        const notBob = db
          .query(Filter.and(Filter.type(TestSchema.Person), Filter.not(Filter.props({ name: 'Bob' }))))
          .runSync();
        expect(notBob.map((person) => person.name).sort()).toEqual(['Alice', 'Carol']);

        const without = db
          .query(
            Query.without(
              Query.select(Filter.type(TestSchema.Person)),
              Query.select(Filter.type(TestSchema.Person, { name: 'Carol' })),
            ),
          )
          .runSync();
        expect(without).toHaveLength(2);

        expect(
          db
            .query(Filter.text('carol'))
            .runSync()
            .map((person) => Obj.getLabel(person)),
        ).toHaveLength(1);
        expect(db.query(Filter.created({ after: new Date(Date.now() - 60_000) })).runSync()).toHaveLength(3);
      }),
    ),
  );

  it.effect('notifies query subscribers when results change', () =>
    session((db) =>
      Effect.gen(function* () {
        const query = db.query(Filter.type(TestSchema.Person, { age: Filter.gt(18) }));
        const seen: number[] = [];
        const unsubscribe = query.subscribe((result) => seen.push(result.results.length));

        const alice = db.add(Obj.make(TestSchema.Person, { name: 'Alice', age: 30 }));
        yield* promise(() => db.flush());
        db.add(Obj.make(TestSchema.Organization, { name: 'Unrelated' }));
        yield* promise(() => db.flush());
        Obj.update(alice, (alice) => {
          alice.age = 10;
        });
        yield* promise(() => db.flush());

        unsubscribe();
        expect(seen).toEqual([1, 0]);
      }),
    ),
  );

  it.effect('persists dynamic types and objects of them', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      class Note extends Type.makeObject<Note>(DXN.make('com.example.type.note', '0.1.0'))(
        Schema.Struct({ title: Schema.String, body: Schema.optional(Schema.String) }),
      ) {}

      yield* session(
        (db) =>
          Effect.gen(function* () {
            const persisted = yield* promise(() => db.addType(Note));
            expect(Type.isType(persisted)).toBe(true);
            expect(yield* promise(() => db.addType(Note))).toBe(persisted);
            db.add(Obj.make(Note, { title: 'Hello' }));
          }),
        { spaceId },
      );

      // Reopened without registering `Note`: its schema comes from the stored type.
      yield* session(
        (db) =>
          Effect.sync(() => {
            const types = db.query(Filter.type(Type.Type)).runSync();
            expect(types.map((type) => Type.getTypename(type))).toEqual(['com.example.type.note']);
            expect(db.graph.registry.getByURI('dxn:com.example.type.note:0.1.0')).toBe(types[0]);

            const [note] = db.query(Filter.type(DXN.make('com.example.type.note', '0.1.0'))).runSync();
            expect(note).toBeDefined();
            expect(Obj.getTypename(note)).toBe('com.example.type.note');
            expect(Entity.toJSON(note)).toMatchObject({ title: 'Hello' });
          }),
        { spaceId, types: [] },
      );
    }),
  );

  it.effect('retries a failed write instead of dropping it', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      yield* session(
        (db) =>
          Effect.gen(function* () {
            const sql = yield* SqlClient.SqlClient;
            const doomed = db.add(Obj.make(TestSchema.Organization, { name: 'Doomed' }));
            yield* promise(() => db.flush());

            // Break the store so the next batch fails.
            yield* sql`DROP TABLE echo_objects`;
            db.add(Obj.make(TestSchema.Organization, { name: 'Added' }));
            db.remove(doomed);
            const error = yield* Effect.flip(Effect.tryPromise(() => db.flush()));
            expect(error).toBeDefined();

            // Once the store recovers, the next flush writes the requeued batch.
            yield* SqlMigrations.apply(init);
            yield* promise(() => db.flush());
          }),
        { spaceId },
      );
      yield* session(
        (db) =>
          Effect.sync(() => {
            expect(
              db
                .query(Filter.type(TestSchema.Organization))
                .runSync()
                .map((org) => org.name),
            ).toEqual(['Added']);
            expect(
              db
                .query(Query.select(Filter.type(TestSchema.Organization)).options({ deleted: 'only' }))
                .runSync()
                .map((org) => org.name),
            ).toEqual(['Doomed']);
          }),
        { spaceId },
      );
    }),
  );

  it.effect('builds data URLs for maximum-size inline blobs', () =>
    session((db) =>
      Effect.gen(function* () {
        const bytes = new Uint8Array(Blob.MAX_INLINE_SIZE).fill(7);
        const blob = yield* promise(() => db.createBlob(bytes));
        const url = yield* promise(() => db.getBlobUrl(blob));
        const decoded = Buffer.from((url ?? '').split(',')[1] ?? '', 'base64');
        expect(Buffer.compare(decoded, bytes)).toBe(0);
      }),
    ),
  );

  it.effect('stores inline blobs', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      const bytes = new Uint8Array([1, 2, 3, 4]);
      yield* session(
        (db) =>
          Effect.gen(function* () {
            const blob = yield* promise(() => db.createBlob(bytes, { type: 'application/octet-stream' }));
            db.add(blob);
          }),
        { spaceId, types: [Blob.Blob] },
      );
      yield* session(
        (db) =>
          Effect.gen(function* () {
            const [blob] = db.query(Filter.type(Blob.Blob)).runSync();
            expect(yield* promise(() => db.readBlob(blob))).toEqual(bytes);
            expect(yield* promise(() => db.getBlobUrl(blob))).toBe('data:application/octet-stream;base64,AQIDBA==');
          }),
        { spaceId, types: [Blob.Blob] },
      );
    }),
  );

  it.effect('garbage-collects deleted objects', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      yield* session(
        (db) =>
          Effect.gen(function* () {
            const keep = db.add(Obj.make(TestSchema.Organization, { name: 'Keep' }));
            db.remove(db.add(Obj.make(TestSchema.Organization, { name: 'Drop' })));
            expect((yield* promise(() => db.stats())).objects).toEqual({ alive: 1, deleted: 1 });
            const report = yield* promise(() => db.runGarbageCollection());
            expect(report.unlinkedObjects).toBe(1);
            expect((yield* promise(() => db.stats())).objects).toEqual({ alive: 1, deleted: 0 });
            expect(db.getObjectById(keep.id)).toBe(keep);
          }),
        { spaceId },
      );
      yield* session(
        (db) =>
          Effect.gen(function* () {
            const sql = yield* SqlClient.SqlClient;
            const rows = yield* sql<{ count: number }>`SELECT COUNT(*) AS count FROM echo_objects`;
            expect(Number(rows[0].count)).toBe(1);
            expect(db.query(Query.select(Filter.everything()).options({ deleted: 'include' })).runSync()).toHaveLength(
              1,
            );
          }),
        { spaceId },
      );
    }),
  );

  it.effect('works through the Effect Database service', () =>
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

  it.effect('rejects unsupported operations', () =>
    session((db) =>
      Effect.gen(function* () {
        expect(() => db.add(TestSchema.Person as never)).toThrow();
        expect(db.listBranches('x')).toEqual(['main']);
        const error = yield* Effect.flip(Effect.tryPromise(() => db.createBranch()));
        expect(error.cause).toBeInstanceOf(UnsupportedOperationError);
      }),
    ),
  );
});
