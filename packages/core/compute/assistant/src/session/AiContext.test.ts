//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { DXN, Database, Feed, Obj, Ref, Type } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';

import * as AiContext from './AiContext';

describe('AiContext.Binder', () => {
  const TestLayer = TestDatabaseLayer({ types: [Feed.Feed] });

  test('should handle bind with Ref', async () => {
    await Effect.gen(function* () {
      const feed = yield* Database.add(Feed.make());
      const runtime = yield* Effect.runtime<Database.Service>();

      const TestSchema = Schema.Struct({}).pipe(Type.makeObject(DXN.make('org.dxos.type.example', '0.1.0')));

      const obj = Obj.make(TestSchema, {});
      const ref = Ref.make(obj);

      const binder = new AiContext.Binder({ feed, runtime });

      yield* Effect.promise(() =>
        binder.bind({
          skills: [],
          objects: [ref],
        }),
      );
    })
      .pipe(Effect.provide(TestLayer))
      .pipe(Effect.runPromise);
  });
});
