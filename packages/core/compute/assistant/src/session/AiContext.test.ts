//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { describe, test, vi } from 'vitest';

import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { Database, DXN, Feed, Obj, Query, Ref, Type } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import * as RuntimeProvider from '@dxos/effect/RuntimeProvider';
import { Text } from '@dxos/schema';

import * as AiContext from './AiContext.ts';

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

  test('a binder over an unstored feed stores it and writes its bindings only when flushed', async ({ expect }) => {
    await Effect.gen(function* () {
      const feed = Feed.make();
      const runtime = yield* Effect.context<Database.Service>();
      const a = yield* Database.add(Obj.make(TypeA, {}));
      const b = yield* Database.add(Obj.make(TypeB, {}));

      const binder = new AiContext.Binder({ feed, runtime });
      yield* Effect.promise(() => binder.open());
      yield* Effect.promise(() => binder.bind({ objects: [Ref.make(a), Ref.make(b)] }));
      yield* Effect.promise(() => binder.unbind({ objects: [Ref.make(b)] }));
      const held = binder.getObjects();

      const storedBeforeFlush = Obj.getDatabase(feed) !== undefined;
      yield* Effect.promise(() => binder.flush());
      yield* Effect.promise(() => binder.close());

      const reader = new AiContext.Binder({ feed, runtime });
      yield* Effect.promise(() => reader.open());
      const reopened = reader.getObjects();
      yield* Effect.promise(() => reader.close());

      expect(held.map((obj) => Obj.getURI(obj))).toEqual([Obj.getURI(a)]);
      expect(storedBeforeFlush).toBe(false);
      expect(reopened.map((obj) => Obj.getURI(obj))).toEqual([Obj.getURI(a)]);
    })
      .pipe(Effect.provide(TestLayer))
      .pipe(Effect.runPromise);
  });

  // Run between agent turns: a rejected re-read used to fail the whole agent process.
  test('a sync whose query fails keeps the current bindings', async ({ expect }) => {
    await Effect.gen(function* () {
      const feed = yield* Database.add(Feed.make());
      const runtime = yield* Effect.context<Database.Service>();
      const a = yield* Database.add(Obj.make(TypeA, {}));

      const binder = new AiContext.Binder({ feed, runtime });
      yield* Effect.promise(() => binder.open());
      yield* Effect.promise(() => binder.bind({ objects: [Ref.make(a)] }));

      // The binder's query is private; any query result shares its prototype, which is where `run` lives.
      const probe = yield* Effect.promise(() =>
        RuntimeProvider.runPromise(Effect.succeed(runtime))(Feed.query(feed, Query.type(AiContext.Binding))),
      );
      const run = vi
        .spyOn(Object.getPrototypeOf(probe), 'run')
        .mockRejectedValueOnce(new Error('Timeout [20,000ms]: index query'));
      yield* Effect.promise(() => binder.sync());
      const failedReads = run.mock.calls.length;
      run.mockRestore();
      const objects = binder.getObjects();
      yield* Effect.promise(() => binder.close());

      expect(failedReads).toBe(1);
      expect(objects.map((obj) => Obj.getURI(obj))).toEqual([Obj.getURI(a)]);
    })
      .pipe(Effect.provide(TestLayer))
      .pipe(Effect.runPromise);
  });

  test('sync re-reads only after a binding is written in this realm, and then sees it', async ({ expect }) => {
    await Effect.gen(function* () {
      const feed = yield* Database.add(Feed.make());
      const runtime = yield* Effect.context<Database.Service>();
      const a = yield* Database.add(Obj.make(TypeA, {}));

      const agent = new AiContext.Binder({ feed, runtime });
      yield* Effect.promise(() => agent.open());

      const probe = yield* Effect.promise(() =>
        RuntimeProvider.runPromise(Effect.succeed(runtime))(Feed.query(feed, Query.type(AiContext.Binding))),
      );
      const run = vi.spyOn(Object.getPrototypeOf(probe), 'run');
      yield* Effect.promise(() => agent.sync());
      const idleReads = run.mock.calls.length;

      // Another binder over the same feed stands in for a tool binding into the agent's chat.
      const tool = new AiContext.Binder({ feed, runtime });
      yield* Effect.promise(() => tool.open());
      yield* Effect.promise(() => tool.bind({ objects: [Ref.make(a)] }));
      yield* Effect.promise(() => tool.close());
      run.mockClear();
      yield* Effect.promise(() => agent.sync());
      const writeReads = run.mock.calls.length;
      run.mockRestore();
      const objects = agent.getObjects();
      yield* Effect.promise(() => agent.close());

      expect(idleReads).toBe(0);
      expect(writeReads).toBe(1);
      expect(objects.map((obj) => Obj.getURI(obj))).toEqual([Obj.getURI(a)]);
    })
      .pipe(Effect.provide(TestLayer))
      .pipe(Effect.runPromise);
  });

  // `bindChatContext` re-binds on every companion open; a ref whose target does not resolve here (a
  // registry skill bound by URI) used to read as new each time and append a duplicate binding.
  test('re-binding an unchanged ref appends nothing', async ({ expect }) => {
    await Effect.gen(function* () {
      const feed = yield* Database.add(Feed.make());
      const runtime = yield* Effect.context<Database.Service>();
      const a = yield* Database.add(Obj.make(TypeA, {}));
      const skill: Ref.Ref<Skill.Skill> = Ref.fromURI(Skill.registryURI('org.dxos.skill.unresolved'));
      const props = () => ({ skills: [skill], objects: [Ref.make(a)] });

      for (let round = 0; round < 3; round++) {
        const binder = new AiContext.Binder({ feed, runtime });
        yield* Effect.promise(() => binder.use((binder: AiContext.Binder) => binder.bind(props())));
      }

      const binder = new AiContext.Binder({ feed, runtime });
      yield* Effect.promise(() => binder.open());
      yield* Effect.promise(() => binder.bind(props()));
      yield* Effect.promise(() => binder.bind(props()));
      yield* Effect.promise(() => binder.close());

      const bindings = yield* Feed.query(feed, Query.type(AiContext.Binding)).run;
      expect(bindings).toHaveLength(1);
    })
      .pipe(Effect.provide(TestLayer))
      .pipe(Effect.runPromise);
  });

  test('re-binding after an unbind appends again', async ({ expect }) => {
    await Effect.gen(function* () {
      const feed = yield* Database.add(Feed.make());
      const runtime = yield* Effect.context<Database.Service>();
      const skill: Ref.Ref<Skill.Skill> = Ref.fromURI(Skill.registryURI('org.dxos.skill.unresolved'));

      const binder = new AiContext.Binder({ feed, runtime });
      yield* Effect.promise(() => binder.open());
      yield* Effect.promise(() => binder.bind({ skills: [skill] }));
      yield* Effect.promise(() => binder.unbind({ skills: [skill] }));
      yield* Effect.promise(() => binder.bind({ skills: [skill] }));
      yield* Effect.promise(() => binder.close());

      const bindings = yield* Feed.query(feed, Query.type(AiContext.Binding)).run;
      expect(bindings).toHaveLength(3);
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
