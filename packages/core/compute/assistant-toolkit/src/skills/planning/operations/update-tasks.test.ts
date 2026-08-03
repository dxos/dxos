//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { AiContext } from '@dxos/assistant';
import { Operation, Skill } from '@dxos/compute';
import { Database, Feed, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { invariant } from '@dxos/invariant';
import { EntityId } from '@dxos/keys';
import { Text } from '@dxos/schema';
import { Outline } from '@dxos/types';

import { Agent, Chat } from '../../../types';
import PlanningSkill from '../skill';
import { UpdateTasks } from './definitions';
import { PlanningHandlers } from './index';

EntityId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  operationHandlers: PlanningHandlers,
  types: [Agent.Agent, Outline.Outline, Text.Text, Chat.Chat, Chat.CompanionTo, Skill.Skill, Feed.Feed],
  skills: [PlanningSkill.make()],
  disableLlmMemoization: true,
});

describe('UpdateTasks', () => {
  it.scoped(
    'adds items to the checklist',
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
        expect(chat.outline).toBeDefined();
        const outline = yield* Database.load(chat.outline!);
        const text = yield* Database.load(outline.content);
        expect(Outline.parseChecklist(text.content)).toEqual([{ title: 'Hello', done: false }]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.scoped(
    'adds items to the checklist without an agent, and checks off completed ones',
    Effect.fnUntraced(
      function* ({ expect }) {
        const feed = yield* Database.add(Feed.make());
        const chat = yield* Database.add(Chat.make({ feed: Ref.make(feed) }));
        expect(chat.outline).toBeUndefined();
        const runtime = yield* Effect.runtime<Database.Service>();
        const binder = new AiContext.Binder({ feed, runtime });
        yield* Effect.promise(() => binder.bind({ objects: [Ref.make(chat)] }));

        yield* Operation.invoke(UpdateTasks, {
          tasks: [
            { title: 'Hello', status: 'todo' },
            { title: 'World', status: 'in-progress' },
          ],
        }).pipe(Effect.provide(Operation.withInvocationOptions({ conversation: Obj.getURI(feed) })));

        yield* Operation.invoke(UpdateTasks, {
          tasks: [{ title: 'Hello', status: 'done' }],
        }).pipe(Effect.provide(Operation.withInvocationOptions({ conversation: Obj.getURI(feed) })));

        const outline = yield* Database.load(chat.outline!);
        const text = yield* Database.load(outline.content);
        expect(Outline.parseChecklist(text.content)).toEqual([
          { title: 'Hello', done: true },
          { title: 'World', done: false },
        ]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
