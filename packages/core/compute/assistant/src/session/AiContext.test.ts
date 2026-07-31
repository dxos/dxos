//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { Database, DXN, Feed, Obj, Ref, Type } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';

import * as AiContext from './AiContext';

const TypeA = Type.makeObject(DXN.make('org.dxos.type.a', '0.1.0'))(Schema.Struct({}));
const TypeB = Type.makeObject(DXN.make('org.dxos.type.b', '0.1.0'))(Schema.Struct({}));

describe('AiContext.Binder', () => {
  const TestLayer = TestDatabaseLayer({ types: [Feed.Feed, TypeA, TypeB] });

  test('reopened binder resolves all distinct bound objects', async ({ expect }) => {
    await Effect.gen(function* () {
      const feed = yield* Database.add(Feed.make());
      const runtime = yield* Effect.runtime<Database.Service>();

      const a = yield* Database.add(Obj.make(TypeA, {}));
      const b = yield* Database.add(Obj.make(TypeB, {}));

      // Bind two distinct objects across two separate bindings (as the chat + companion do).
      const writer = new AiContext.Binder({ feed, runtime });
      yield* Effect.promise(() => writer.open());
      yield* Effect.promise(() => writer.bind({ objects: [Ref.make(a)] }));
      yield* Effect.promise(() => writer.bind({ objects: [Ref.make(b)] }));
      yield* Effect.promise(() => writer.close());

      // Reopen over the same feed (the path ContextModule takes): bindings are re-read via _reduce.
      const reader = new AiContext.Binder({ feed, runtime });
      yield* Effect.promise(() => reader.open());
      const objects = reader.getObjects();
      yield* Effect.promise(() => reader.close());

      expect(objects.map((obj) => Obj.getURI(obj)).sort()).toEqual([Obj.getURI(a), Obj.getURI(b)].sort());
    })
      .pipe(Effect.provide(TestLayer))
      .pipe(Effect.runPromise);
  });

  test('should handle bind with Ref', async () => {
    await Effect.gen(function* () {
      const feed = yield* Database.add(Feed.make());
      const runtime = yield* Effect.runtime<Database.Service>();

      const TestSchema = Type.makeObject(DXN.make('org.dxos.type.example', '0.1.0'))(Schema.Struct({}));

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
