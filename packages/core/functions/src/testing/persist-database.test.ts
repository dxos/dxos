//
// Copyright 2025 DXOS.org
//

import * as Test from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Filter, Obj, Query, Type } from '@dxos/echo';
import { DataType } from '@dxos/schema';

import { DatabaseService } from '../services';

import { TestDatabaseLayer, testStoragePath } from './layer';

Test.describe('TestDatabaseLayer', { timeout: 600_000 }, () => {
  Test.it.effect(
    'persist database to disk',
    Effect.fnUntraced(function* (_) {
      const DbLayer = TestDatabaseLayer({
        storagePath: testStoragePath({ name: `feed-test-${Date.now()}` }),
      });

      yield* Effect.gen(function* () {
        yield* DatabaseService.add(Obj.make(Type.Expando, { label: 'test' }));
        yield* DatabaseService.flush({ indexes: true });
      }).pipe(Effect.provide(DbLayer));

      yield* Effect.gen(function* () {
        const { objects } = yield* DatabaseService.runQuery(Query.select(Filter.everything()));
        Test.expect(objects[0]?.label).toEqual('test');
      }).pipe(Effect.provide(DbLayer));
    }),
  );

  Test.it.effect(
    'reload database -- save index before restart',
    Effect.fnUntraced(function* (_) {
      const NUM_OBJECTS = 500;
      const DbLayer = TestDatabaseLayer({
        types: [DataType.Person],
        storagePath: testStoragePath({ name: `reload-test-${Date.now()}` }),
      });

      yield* Effect.gen(function* () {
        for (let i = 0; i < NUM_OBJECTS; i++) {
          yield* DatabaseService.add(Obj.make(DataType.Person, { nickname: `Person ${i}` }));
        }
        yield* DatabaseService.flush({ indexes: true });
      }).pipe(Effect.provide(DbLayer));

      yield* Effect.gen(function* () {
        const { objects } = yield* DatabaseService.runQuery(Query.select(Filter.type(DataType.Person)));
        Test.expect(objects.length).toEqual(NUM_OBJECTS);
      }).pipe(Effect.provide(DbLayer));
    }),
  );

  Test.it.effect.skip(
    'reload database -- save index before restart [manual]',
    Effect.fnUntraced(
      function* (_) {
        const NUM_OBJECTS = 500;

        {
          const { objects } = yield* DatabaseService.runQuery(Query.select(Filter.type(DataType.Person)));
          console.log({ count: objects.length });
        }

        for (let i = 0; i < NUM_OBJECTS; i++) {
          yield* DatabaseService.add(Obj.make(DataType.Person, { nickname: `Person ${i}` }));
        }
        yield* DatabaseService.flush({ indexes: true });

        {
          const { objects } = yield* DatabaseService.runQuery(Query.select(Filter.type(DataType.Person)));
          console.log({ count: objects.length });
        }
      },
      Effect.provide(
        TestDatabaseLayer({
          types: [DataType.Person],
          storagePath: testStoragePath({ name: `reload-test` }),
        }),
      ),
    ),
  );
});
