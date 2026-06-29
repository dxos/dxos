//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Operation, Skill } from '@dxos/compute';
import { Database, Feed, Obj } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { AssistantTestLayer } from '@dxos/functions-runtime/testing';
import { invariant } from '@dxos/invariant';
import { EntityId } from '@dxos/keys';

import { Agent, Chat, Plan } from '../../../types';
import DelegationSkill from '../skill';
import { DelegateTask } from './delegate-task';
import { DelegationHandlers } from './index';

EntityId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  operationHandlers: DelegationHandlers,
  types: [Agent.Agent, Plan.Plan, Chat.Chat, Chat.CompanionTo, Skill.Skill, Feed.Feed],
  skills: [DelegationSkill.make()],
  disableLlmMemoization: true,
});

const invokeDelegateTask = (input: { id?: Plan.TaskId; title?: string }, chatFeed: Feed.Feed) =>
  Operation.invoke(DelegateTask, input).pipe(
    Effect.provide(Operation.withInvocationOptions({ conversation: Obj.getURI(chatFeed) })),
  );

describe('DelegateTask', () => {
  it.scoped(
    'adds an in-progress task to the agent plan for delegated work',
    Effect.fnUntraced(
      function* ({ expect }) {
        const agent = yield* Agent.makeInitialized(
          { name: 'Supervisor', instructions: 'Test.' },
          DelegationSkill.make(),
        );
        yield* Database.flush();

        const chatFeed = agent.chat?.target?.feed?.target;
        invariant(chatFeed, 'Agent chat feed not found.');

        yield* invokeDelegateTask({ title: 'Research widgets' }, chatFeed);

        const chat = yield* Database.load(agent.chat!);
        const plan = yield* Database.load(chat.plan!);
        expect(plan.tasks).toHaveLength(1);
        expect(plan.tasks[0]).toMatchObject({
          title: 'Research widgets',
          status: 'in-progress',
          delegated: true,
        });
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.scoped(
    'delegates an existing plan task by id without duplicating',
    Effect.fnUntraced(
      function* ({ expect }) {
        const agent = yield* Agent.makeInitialized(
          { name: 'Supervisor', instructions: 'Test.' },
          DelegationSkill.make(),
        );
        const chat = yield* Database.load(agent.chat!);
        const plan = yield* Chat.ensurePlan(chat);
        const taskId = Plan.TaskId.make('1-ab');
        Obj.update(plan, (plan) => {
          plan.tasks.push({ id: taskId, title: 'Research widgets', status: 'todo' });
        });
        yield* Database.flush();

        const chatFeed = agent.chat?.target?.feed?.target;
        invariant(chatFeed, 'Agent chat feed not found.');

        yield* invokeDelegateTask({ id: taskId }, chatFeed);

        const updatedChat = yield* Database.load(agent.chat!);
        const updated = yield* Database.load(updatedChat.plan!);
        expect(updated.tasks).toHaveLength(1);
        expect(updated.tasks[0]).toMatchObject({
          id: taskId,
          title: 'Research widgets',
          status: 'in-progress',
          delegated: true,
        });
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.scoped(
    'fails when both id and title are provided',
    Effect.fnUntraced(
      function* ({ expect }) {
        const agent = yield* Agent.makeInitialized(
          { name: 'Supervisor', instructions: 'Test.' },
          DelegationSkill.make(),
        );
        yield* Database.flush();

        const chatFeed = agent.chat?.target?.feed?.target;
        invariant(chatFeed, 'Agent chat feed not found.');

        const exit = yield* invokeDelegateTask({ id: Plan.TaskId.make('1-ab'), title: 'New task' }, chatFeed).pipe(
          Effect.exit,
        );
        expect(exit._tag).toBe('Failure');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
