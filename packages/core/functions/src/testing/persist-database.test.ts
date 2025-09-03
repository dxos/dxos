//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import { Effect } from 'effect';
import { TestDatabaseLayer, testStoragePath } from './layer';
import { DatabaseService } from '../services';
import { DataType } from '@dxos/schema';
import { Filter, Obj, Query, Type } from '@dxos/echo';

describe('TestDatabaseLayer', { timeout: 600_000 }, () => {
  it.effect(
    'persist database to disk',
    Effect.fnUntraced(function* ({ expect: _ }) {
      const DbLayer = TestDatabaseLayer({
        storagePath: testStoragePath({ name: `feed-test-${Date.now()}` }),
      });

      yield* Effect.gen(function* () {
        yield* DatabaseService.add(Obj.make(Type.Expando, { label: 'test' }));
        yield* DatabaseService.flush({ indexes: true });
      }).pipe(Effect.provide(DbLayer));

      yield* Effect.gen(function* () {
        const { objects } = yield* DatabaseService.runQuery(Query.select(Filter.everything()));
        expect(objects[0]?.label).toEqual('test');
      }).pipe(Effect.provide(DbLayer));
    }),
  );
});
