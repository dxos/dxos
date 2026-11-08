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

import { Database, Filter, Obj, Query, Ref, Type } from '@dxos/echo';
import { SqliteDatabase } from '@dxos/echo-sqlite';
import { SOURCE } from '@dxos/echo-worker';
import * as EffectEx from '@dxos/effect/EffectEx';

import { Event, Organization, Person, types } from '../schema.ts';
import { createRecord, findRecords, linkRecords } from './handlers.ts';

let dir: string;
let filename: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'echo-sqlite-demo-'));
  filename = join(dir, `${randomUUID()}.db`);
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

/** The graph the assistant works in, on a file of its own. */
const graph = <A>(body: (db: SqliteDatabase) => Promise<A>): Effect.Effect<A, unknown> =>
  Effect.scoped(
    Effect.gen(function* () {
      const db = yield* SqliteDatabase.open({ types: [...types] });
      return yield* Effect.promise(() => body(db));
    }),
  ).pipe(Effect.provide(SqliteClient.layer({ filename })));

/** A handler, run against that graph: the tools take `Database.Service` and nothing else. */
const run = <A>(db: SqliteDatabase, effect: Effect.Effect<A, unknown, Database.Service>): Promise<A> =>
  EffectEx.runPromise(effect.pipe(Effect.provide(Database.layer(db)))) as Promise<A>;

describe('the assistant’s tools over the demo’s graph', () => {
  it.effect('creates a record of each type', () =>
    graph(async (db) => {
      await run(db, createRecord.handler({ typename: Type.getTypename(Organization)!, values: { name: 'Acme' } }));
      await run(
        db,
        createRecord.handler({
          typename: Type.getTypename(Person)!,
          values: { name: 'Alice', email: ['alice@example.com'] },
        }),
      );

      const organizations = await db.query(Filter.type(Organization)).run();
      const people = await db.query(Filter.type(Person)).run();
      expect(organizations.map((org) => org.name)).toEqual(['Acme']);
      expect(people.map((person) => person.name)).toEqual(['Alice']);
      // Without a foreign key an object cannot be correlated with another peer's copy, so it would
      // never sync; the tool mints one as the form does.
      expect(Obj.getKeys(people[0], SOURCE).length).toBe(1);
    }),
  );

  it.effect('refuses a type the graph does not hold', () =>
    graph(async (db) => {
      await expect(run(db, createRecord.handler({ typename: 'com.example.type.nope', values: {} }))).rejects.toThrow(
        /No such type/,
      );
    }),
  );

  it.effect('finds records by type and by text', () =>
    graph(async (db) => {
      db.add(Obj.make(Organization, { name: 'Cyberdyne' }));
      db.add(Obj.make(Person, { name: 'Sarah', email: ['sarah@example.com'] }));
      await db.flush();

      const organizations = await run(db, findRecords.handler({ typename: Type.getTypename(Organization)! }));
      expect(organizations).toHaveLength(1);

      const matches = await run(db, findRecords.handler({ text: 'Sarah' }));
      expect(matches).toHaveLength(1);
    }),
  );

  it.effect('links a person to an employer and an attendee to an event', () =>
    graph(async (db) => {
      const acme = db.add(Obj.make(Organization, { name: 'Acme' }));
      const alice = db.add(Obj.make(Person, { name: 'Alice', email: [] }));
      const standup = db.add(Obj.make(Event, { title: 'Standup', attendees: [] }));
      await db.flush();

      await run(db, linkRecords.handler({ source: alice.id, property: 'employer', target: acme.id }));
      await run(db, linkRecords.handler({ source: standup.id, property: 'attendees', target: alice.id }));

      const [person] = await db.query(Query.select(Filter.id(alice.id))).run();
      const [event] = await db.query(Query.select(Filter.id(standup.id))).run();
      expect(Ref.isRef(person.employer) && person.employer.target?.id).toBe(acme.id);
      expect(event.attendees).toHaveLength(1);
    }),
  );
});
