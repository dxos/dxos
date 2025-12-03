//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Filter, Obj, Query, Type } from '@dxos/echo';
import { Database } from '@dxos/echo';
import { Person } from '@dxos/types';

import { TestDatabaseLayer, testStoragePath } from './layer';

describe('TestDatabaseLayer', { timeout: 600_000 }, () => {
  it.effect(
    'persist database to disk',
    Effect.fnUntraced(function* (_) {
      const DbLayer = TestDatabaseLayer({
        storagePath: testStoragePath({ name: `feed-test-${Date.now()}` }),
      });

      yield* Effect.gen(function* () {
        yield* Database.Service.add(Obj.make(Type.Expando, { label: 'test' }));
        yield* Database.Service.flush({ indexes: true });
      }).pipe(Effect.provide(DbLayer));

      yield* Effect.gen(function* () {
        const objects = yield* Database.Service.runQuery(Query.select(Filter.everything()));
        expect(objects[0]?.label).toEqual('test');
      }).pipe(Effect.provide(DbLayer));
    }),
  );

  it.effect(
    'reload database -- save index before restart',
    Effect.fnUntraced(function* (_) {
      const NUM_OBJECTS = 500;
      const DbLayer = TestDatabaseLayer({
        types: [Person.Person],
        storagePath: testStoragePath({ name: `reload-test-${Date.now()}` }),
      });

      yield* Effect.gen(function* () {
        for (let i = 0; i < NUM_OBJECTS; i++) {
          yield* Database.Service.add(Obj.make(Person.Person, { nickname: `Person ${i}` }));
        }
        yield* Database.Service.flush({ indexes: true });
      }).pipe(Effect.provide(DbLayer));

      yield* Effect.gen(function* () {
        const objects = yield* Database.Service.runQuery(Query.select(Filter.type(Person.Person)));
        expect(objects.length).toEqual(NUM_OBJECTS);
      }).pipe(Effect.provide(DbLayer));
    }),
  );

  it.effect.skip(
    'reload database -- save index before restart [manual]',
    Effect.fnUntraced(
      function* (_) {
        const NUM_OBJECTS = 500;

        {
          const objects = yield* Database.Service.runQuery(Query.select(Filter.type(Person.Person)));
          console.log({ count: objects.length });
        }

        for (let i = 0; i < NUM_OBJECTS; i++) {
          yield* Database.Service.add(Obj.make(Person.Person, { nickname: `Person ${i}` }));
        }
        yield* Database.Service.flush({ indexes: true });

        {
          const objects = yield* Database.Service.runQuery(Query.select(Filter.type(Person.Person)));
          console.log({ count: objects.length });
        }
      },
      Effect.provide(
        TestDatabaseLayer({
          types: [Person.Person],
          storagePath: testStoragePath({ name: `reload-test` }),
        }),
      ),
    ),
  );
});
