//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { Database, DXN, Feed, Obj, Ref, Type } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { Text } from '@dxos/schema';

import * as AiContext from './AiContext';

const TypeA = Type.makeObject(DXN.make('org.dxos.type.a', '0.1.0'))(Schema.Struct({}));
const TypeB = Type.makeObject(DXN.make('org.dxos.type.b', '0.1.0'))(Schema.Struct({}));

describe('AiContext.Binder', () => {
  const TestLayer = TestDatabaseLayer({ types: [Feed.Feed, TypeA, TypeB, Skill.Skill, Text.Text] });

  // A skill the user authored in a space has no registry key; it used to be dropped on the way in,
  // which made the picker's toggle a silent no-op (DX-1248).
  test.for([
    ['keyed', () => Skill.make({ key: 'org.dxos.skill.local', name: 'Local' })],
    ['keyless', () => Obj.make(Skill.Skill, { name: 'Local', instructions: Template.make(), tools: [] })],
  ] as const)('binds a %s skill stored in the space DB', async ([, makeSkill], { expect }) => {
    await Effect.gen(function* () {
      const feed = yield* Database.add(Feed.make());
      const runtime = yield* Effect.context<Database.Service>();

      const skill = yield* Database.add(makeSkill());

      const binder = new AiContext.Binder({ feed, runtime });
      yield* Effect.promise(() => binder.open());
      yield* Effect.promise(() => binder.bind({ skills: [Ref.make(skill)] }));
      const afterBind = binder.getSkills();
      yield* Effect.promise(() => binder.sync());
      const afterSync = binder.getSkills();
      yield* Effect.promise(() => binder.close());

      const reader = new AiContext.Binder({ feed, runtime });
      yield* Effect.promise(() => reader.open());
      const afterReopen = reader.getSkills();
      yield* Effect.promise(() => reader.close());

      expect(afterBind.map((bound) => Obj.getURI(bound))).toEqual([Obj.getURI(skill)]);
      expect(afterSync.map((bound) => Obj.getURI(bound))).toEqual([Obj.getURI(skill)]);
      expect(afterReopen.map((bound) => Obj.getURI(bound))).toEqual([Obj.getURI(skill)]);
    })
      .pipe(Effect.provide(TestLayer))
      .pipe(Effect.runPromise);
  });

  test('reopened binder resolves all distinct bound objects', async ({ expect }) => {
    await Effect.gen(function* () {
      const feed = yield* Database.add(Feed.make());
      const runtime = yield* Effect.context<Database.Service>();

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
      const runtime = yield* Effect.context<Database.Service>();

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
