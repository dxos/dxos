//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { Operation, Skill } from '@dxos/compute';
import { Database, Feed, Filter, Obj, Query } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { invariant } from '@dxos/invariant';
import { EntityId } from '@dxos/keys';
import { Text } from '@dxos/schema';
import { Outline, Task, TaskSet } from '@dxos/types';

import { Agent, Chat } from '../../../types';
import DelegationSkill from '../skill';
import { DelegateTask } from './delegate-task';
import { DelegationHandlers } from './index';

EntityId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  operationHandlers: DelegationHandlers,
  types: [
    Agent.Agent,
    Outline.Outline,
    Task.Task,
    TaskSet.TaskSet,
    Text.Text,
    Chat.Chat,
    Chat.CompanionTo,
    Skill.Skill,
    Feed.Feed,
  ],
  skills: [DelegationSkill.make()],
  disableLlmMemoization: true,
});

const invokeDelegateTask = (input: { title: string }, chatFeed: Feed.Feed) =>
  Operation.invoke(DelegateTask, input).pipe(
    Effect.provide(Operation.withInvocationOptions({ conversation: Obj.getURI(chatFeed) })),
  );

describe('DelegateTask', () => {
  it.scoped(
    'promotes delegated work to a durable in-progress agent task',
    Effect.fnUntraced(
      function* ({ expect }) {
        const agent = yield* Agent.makeInitialized(
          { name: 'Supervisor', instructions: 'Test.' },
          DelegationSkill.make(),
        );
        yield* Database.flush();

        const agentChat = yield* Agent.loadChat(agent);
        const chatFeed = agentChat?.feed?.target;
        invariant(chatFeed, 'Agent chat feed not found.');

        yield* invokeDelegateTask({ title: 'Research widgets' }, chatFeed);

        // The durable task is parented to the outline's task set with an agent assignee.
        const chat = yield* Agent.loadChat(agent);
        invariant(chat, 'Agent chat not found.');
        const outline = yield* Database.load(chat.outline!);
        const taskSet = yield* Database.load(outline.taskSet!);
        const children = yield* Database.query(Query.select(Filter.id(taskSet.id)).children()).run;
        const tasks = children.filter((child): child is Task.Task => Obj.instanceOf(Task.Task, child));
        expect(tasks).toHaveLength(1);
        expect(tasks[0]).toMatchObject({
          title: 'Research widgets',
          status: 'in-progress',
          assignee: { role: 'assistant' },
        });

        // The checklist mirrors the item, unchecked until the sub-agent completes.
        const text = yield* Database.load(outline.content);
        expect(Outline.parseChecklist(text.content)).toEqual([{ title: 'Research widgets', done: false }]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.scoped(
    'reuses the outline task set across delegations',
    Effect.fnUntraced(
      function* ({ expect }) {
        const agent = yield* Agent.makeInitialized(
          { name: 'Supervisor', instructions: 'Test.' },
          DelegationSkill.make(),
        );
        yield* Database.flush();

        const agentChat = yield* Agent.loadChat(agent);
        const chatFeed = agentChat?.feed?.target;
        invariant(chatFeed, 'Agent chat feed not found.');

        yield* invokeDelegateTask({ title: 'Research widgets' }, chatFeed);
        yield* invokeDelegateTask({ title: 'Summarize findings' }, chatFeed);

        const chat = yield* Agent.loadChat(agent);
        invariant(chat, 'Agent chat not found.');
        const outline = yield* Database.load(chat.outline!);
        const taskSet = yield* Database.load(outline.taskSet!);
        const children = yield* Database.query(Query.select(Filter.id(taskSet.id)).children()).run;
        const tasks = children.filter((child): child is Task.Task => Obj.instanceOf(Task.Task, child));
        expect(tasks).toHaveLength(2);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.scoped(
    'fails on an empty title',
    Effect.fnUntraced(
      function* ({ expect }) {
        const agent = yield* Agent.makeInitialized(
          { name: 'Supervisor', instructions: 'Test.' },
          DelegationSkill.make(),
        );
        yield* Database.flush();

        const agentChat = yield* Agent.loadChat(agent);
        const chatFeed = agentChat?.feed?.target;
        invariant(chatFeed, 'Agent chat feed not found.');

        const exit = yield* invokeDelegateTask({ title: '' }, chatFeed).pipe(Effect.exit);
        expect(exit._tag).toBe('Failure');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
