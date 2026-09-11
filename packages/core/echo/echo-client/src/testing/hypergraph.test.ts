//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import { expect } from 'vitest';

import { Database, Filter, Hypergraph, Obj, Query } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { SpaceId } from '@dxos/keys';

import { TestDatabaseLayer } from './test-database-layer';

// Exercised against a real peer rather than a stand-in graph: the service exists so that work which
// cannot name a space can still reach one, and only a real graph can be asked whether it holds it.

const types = [TestSchema.Person];

describe('Hypergraph.Service', () => {
  it.effect('TestDatabaseLayer provides the graph alongside the database', () =>
    Effect.gen(function* () {
      const { db } = yield* Database.Service;
      const { graph } = yield* Hypergraph.Service;
      expect(graph).toBe(db.graph);
    }).pipe(Effect.provide(TestDatabaseLayer({ types }))),
  );

  it.effect('queries across the graph without being given a space', () =>
    Effect.gen(function* () {
      const { db } = yield* Database.Service;
      const person = db.add(Obj.make(TestSchema.Person, { name: 'Ada' }));
      yield* Effect.promise(() => db.flush());

      const { graph } = yield* Hypergraph.Service;
      // `from` is required: a graph query is not implicitly scoped, and the planner rejects one that
      // names no source rather than guessing at which spaces were meant.
      const found = yield* Effect.promise(() =>
        graph.query(Query.select(Filter.type(TestSchema.Person)).from('all-accessible-spaces')).run(),
      );
      expect([...found].map((row) => row.id)).toContain(person.id);
    }).pipe(Effect.provide(TestDatabaseLayer({ types }))),
  );

  it.effect('getDatabase reaches a space by id, and answers undefined for one it does not hold', () =>
    Effect.gen(function* () {
      const { db } = yield* Database.Service;
      const { graph } = yield* Hypergraph.Service;
      expect(graph.getDatabase(db.spaceId)).toBe(db);
      expect(graph.getDatabase(SpaceId.random())).toBeUndefined();
    }).pipe(Effect.provide(TestDatabaseLayer({ types }))),
  );
});

describe('Hypergraph.withDatabase', () => {
  it.effect('narrows the graph to one space, and that database is the space it named', () =>
    Effect.gen(function* () {
      const { db } = yield* Database.Service;
      const scoped = yield* Effect.provide(
        Effect.map(Database.Service, ({ db }) => db),
        Hypergraph.withDatabase(db.spaceId),
      );
      expect(scoped).toBe(db);
    }).pipe(Effect.provide(TestDatabaseLayer({ types }))),
  );

  it.effect('a write through the narrowed database lands in that space', () =>
    Effect.gen(function* () {
      const { db } = yield* Database.Service;
      const person = yield* Effect.provide(
        Effect.gen(function* () {
          const added = yield* Database.add(Obj.make(TestSchema.Person, { name: 'Grace' }));
          yield* Database.flush();
          return added;
        }),
        Hypergraph.withDatabase(db.spaceId),
      );

      const found = yield* Effect.promise(() => db.query(Query.select(Filter.type(TestSchema.Person))).run());
      expect([...found].map((row) => row.id)).toContain(person.id);
    }).pipe(Effect.provide(TestDatabaseLayer({ types }))),
  );

  it.effect('fails with SpaceNotFoundError when the graph holds no such space', () =>
    Effect.gen(function* () {
      // Resolved when the layer is built, so the failure surfaces here rather than at a later query.
      const error = yield* Effect.flip(Effect.provide(Database.Service, Hypergraph.withDatabase(SpaceId.random())));
      expect(error).toBeInstanceOf(Hypergraph.SpaceNotFoundError);
    }).pipe(Effect.provide(TestDatabaseLayer({ types }))),
  );
});
