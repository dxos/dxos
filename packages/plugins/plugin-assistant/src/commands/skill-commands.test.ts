//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, expect, test } from 'vitest';

import { AiContext } from '@dxos/assistant';
import * as Chat from '@dxos/assistant/Chat';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { Database, Feed, Obj, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { Text } from '@dxos/schema';

import { makeSkillCommands, runDraftCommand } from './skill-commands.ts';

describe('makeSkillCommands', () => {
  const TestLayer = TestDatabaseLayer({ types: [Chat.Chat, Feed.Feed, Skill.Skill, Text.Text] });

  test('loads the skill and hands the rest back as the prompt', async () => {
    await Effect.gen(function* () {
      const feed = yield* Database.add(Feed.make());
      const chat = yield* Database.add(Chat.make({ feed: Ref.make(feed) }));
      const db = yield* Database.Service;
      const runtime = yield* Effect.context<Database.Service>();
      const binder = new AiContext.Binder({ feed, runtime });
      yield* Effect.promise(() => binder.open());
      const skill = yield* Database.add(
        Obj.make(Skill.Skill, { name: 'Web Search', instructions: Template.make(), tools: [] }),
      );

      const [command] = makeSkillCommands([skill]);
      const result = yield* Effect.promise(() =>
        command.execute('find X\nand Y', { db: db.db, chat, invoke: () => Promise.reject(), binder }),
      );

      expect(result).toEqual({ summary: 'Loaded the Web Search skill.', prompt: 'find X\nand Y' });
      expect(binder.getSkills().map(({ id }) => id)).toEqual([skill.id]);
      yield* Effect.promise(() => binder.close());
    })
      .pipe(Effect.provide(TestLayer))
      .pipe(Effect.runPromise);
  });

  test('a draft runs its leading skill command and sends the rest', async () => {
    await Effect.gen(function* () {
      const feed = yield* Database.add(Feed.make());
      const chat = yield* Database.add(Chat.make({ feed: Ref.make(feed) }));
      const db = yield* Database.Service;
      const runtime = yield* Effect.context<Database.Service>();
      const binder = new AiContext.Binder({ feed, runtime });
      yield* Effect.promise(() => binder.open());
      const skill = yield* Database.add(
        Obj.make(Skill.Skill, { name: 'Web Search', instructions: Template.make(), tools: [] }),
      );
      const commands = makeSkillCommands([skill]);
      const context = { db: db.db, chat, invoke: () => Promise.reject(), binder };

      expect(yield* Effect.promise(() => runDraftCommand('/web-search find X', commands, context))).toBe('find X');
      expect(binder.getSkills().map(({ id }) => id)).toEqual([skill.id]);
      expect(yield* Effect.promise(() => runDraftCommand('/web-search', commands, context))).toBeUndefined();
      expect(yield* Effect.promise(() => runDraftCommand('plain text', commands, context))).toBe('plain text');
      yield* Effect.promise(() => binder.close());
    })
      .pipe(Effect.provide(TestLayer))
      .pipe(Effect.runPromise);
  });
});
