//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { AiContext } from '@dxos/assistant';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Database, Feed, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { invariant } from '@dxos/invariant';
import { EntityId } from '@dxos/keys';
import { Text } from '@dxos/schema';
import { Outline, Task } from '@dxos/types';

import { Agent, Chat } from '../../../types';
import PlanningSkill from '../skill';
import { UpdateTasks } from './definitions';
import { PlanningHandlers } from './index';

EntityId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  operationHandlers: PlanningHandlers,
  types: [Agent.Agent, Outline.Outline, Task.Task, Text.Text, Chat.Chat, Skill.Skill, Feed.Feed],
  skills: [PlanningSkill.make()],
  disableLlmMemoization: true,
});

describe('UpdateTasks', () => {
  it.effect(
    "adds tasks to the chat's checklist",
    Effect.fnUntraced(
      function* ({ expect }) {
        const agent = yield* Agent.makeInitialized({ name: 'Planner', instructions: 'Test.' }, PlanningSkill.make());
        yield* Database.flush();

        const agentChat = yield* Agent.loadChat(agent);
        const chatFeed = agentChat?.feed?.target;
        invariant(chatFeed, 'Agent chat feed not found.');

        yield* Operation.invoke(UpdateTasks, {
          tasks: [{ title: 'Hello', status: 'todo' }],
        }).pipe(Effect.provide(Operation.withInvocationOptions({ conversation: Obj.getURI(chatFeed) })));

        const chat = yield* Agent.loadChat(agent);
        invariant(chat, 'Agent chat not found.');
        const tasks = yield* Chat.loadTasks(chat);
        expect(tasks.map(({ title, status }) => ({ title, status }))).toEqual([{ title: 'Hello', status: 'todo' }]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'adds tasks without an agent, and completes them in place',
    Effect.fnUntraced(
      function* ({ expect }) {
        const feed = yield* Database.add(Feed.make());
        const chat = yield* Database.add(Chat.make({ feed: Ref.make(feed) }));
        expect(chat.tasks).toEqual([]);
        const runtime = yield* Effect.context<Database.Service>();
        const binder = new AiContext.Binder({ feed, runtime });
        yield* Effect.promise(() => binder.bind({ objects: [Ref.make(chat)] }));

        yield* Operation.invoke(UpdateTasks, {
          tasks: [
            { title: 'Hello', status: 'todo' },
            { title: 'World', status: 'started' },
          ],
        }).pipe(Effect.provide(Operation.withInvocationOptions({ conversation: Obj.getURI(feed) })));

        yield* Operation.invoke(UpdateTasks, {
          tasks: [{ title: 'Hello', status: 'done' }],
        }).pipe(Effect.provide(Operation.withInvocationOptions({ conversation: Obj.getURI(feed) })));

        const tasks = yield* Chat.loadTasks(chat);
        expect(tasks.map(({ title, status }) => ({ title, status }))).toEqual([
          { title: 'Hello', status: 'done' },
          { title: 'World', status: 'started' },
        ]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
