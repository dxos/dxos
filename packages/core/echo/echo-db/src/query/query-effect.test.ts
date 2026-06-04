//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import { describe, test } from 'vitest';

import { Event } from '@dxos/async';
import { Database, Filter, Obj, Query } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { runAndForwardErrors } from '@dxos/effect';

import { TestDatabaseLayer } from '../testing';

const TestLayer = TestDatabaseLayer({ types: [TestSchema.Person] });

describe('Database.query (Effect API)', () => {
  test('run returns matching objects', async ({ expect }) => {
    await Effect.gen(function* () {
      const alice = Obj.make(TestSchema.Person, { name: 'alice' });
      const bob = Obj.make(TestSchema.Person, { name: 'bob' });
      yield* Database.add(alice);
      yield* Database.add(bob);
      yield* Database.flush();

      const results = yield* Database.query(Filter.type(TestSchema.Person)).run;
      expect(results).toHaveLength(2);
      expect(results.map((person) => person.name).sort()).toEqual(['alice', 'bob']);
    }).pipe(Effect.provide(TestLayer), runAndForwardErrors);
  });

  test('run accepts Query AST', async ({ expect }) => {
    await Effect.gen(function* () {
      yield* Database.add(Obj.make(TestSchema.Person, { name: 'alice' }));
      yield* Database.flush();

      const results = yield* Database.query(Query.select(Filter.type(TestSchema.Person, { name: 'alice' }))).run;
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('alice');
    }).pipe(Effect.provide(TestLayer), runAndForwardErrors);
  });

  test('first returns Option', async ({ expect }) => {
    await Effect.gen(function* () {
      const alice = Obj.make(TestSchema.Person, { name: 'alice' });
      yield* Database.add(alice);
      yield* Database.flush();

      const first = yield* Database.query(Filter.type(TestSchema.Person, { name: 'alice' })).first;
      expect(Option.isSome(first)).toBe(true);
      expect(Option.getOrThrow(first).name).toBe('alice');

      const missing = yield* Database.query(Filter.type(TestSchema.Person, { name: 'missing' })).first;
      expect(Option.isNone(missing)).toBe(true);
    }).pipe(Effect.provide(TestLayer), runAndForwardErrors);
  });

  test('evaluating the effect yields a QueryResult', async ({ expect }) => {
    await Effect.gen(function* () {
      const alice = Obj.make(TestSchema.Person, { name: 'alice' });
      yield* Database.add(alice);
      yield* Database.flush();

      const queryResult = yield* Database.query(Filter.type(TestSchema.Person));
      const results = queryResult.runSync();
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('alice');
    }).pipe(Effect.provide(TestLayer), runAndForwardErrors);
  });

  test('subscribe fires with current results when fire: true', async ({ expect }) => {
    await Effect.gen(function* () {
      const alice = Obj.make(TestSchema.Person, { name: 'alice' });
      const bob = Obj.make(TestSchema.Person, { name: 'bob' });
      yield* Database.add(alice);
      yield* Database.add(bob);
      yield* Database.flush();

      const queryResult = yield* Database.query(Filter.type(TestSchema.Person));
      const called = new Event();
      const calledOnce = called.waitForCount(1);
      const unsubscribe = queryResult.subscribe(() => called.emit(), { fire: true });

      yield* Effect.promise(() => calledOnce);
      expect(queryResult.results).toHaveLength(2);
      expect(queryResult.results.map((person) => person.name).sort()).toEqual(['alice', 'bob']);
      unsubscribe();
    }).pipe(Effect.provide(TestLayer), runAndForwardErrors);
  });
});
