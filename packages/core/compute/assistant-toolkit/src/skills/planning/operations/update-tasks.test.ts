//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AiContext } from '@dxos/assistant';
import { Blueprint, Operation } from '@dxos/compute';
import { Database, Feed, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { AssistantTestLayer } from '@dxos/functions-runtime/testing';
import { invariant } from '@dxos/invariant';
import { EntityId } from '@dxos/keys';

import { Agent, Chat, Plan } from '../../../types';
import PlanningBlueprint from '../blueprint';
import { UpdateTasks } from './definitions';
import { PlanningHandlers } from './index';

EntityId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  operationHandlers: PlanningHandlers,
  types: [Agent.Agent, Plan.Plan, Chat.Chat, Chat.CompanionTo, Blueprint.Blueprint, Feed.Feed],
  blueprints: [PlanningBlueprint.make()],
  disableLlmMemoization: true,
});

describe('UpdateTasks', () => {
  it.scoped(
    'adds tasks to the plan',
    Effect.fnUntraced(
      function* ({ expect }) {
        const agent = yield* Agent.makeInitialized(
          { name: 'Planner', instructions: 'Test.' },
          PlanningBlueprint.make(),
        );
        yield* Database.flush();

        const chatFeed = agent.chat?.target?.feed?.target;
        invariant(chatFeed, 'Agent chat feed not found.');

        yield* Operation.invoke(UpdateTasks, {
          tasks: [{ id: Plan.TaskId.make('task-1'), title: 'Hello', status: 'todo' }],
        }).pipe(Effect.provide(Operation.withInvocationOptions({ conversation: Obj.getURI(chatFeed) })));

        const chat = yield* Database.load(agent.chat!);
        expect(chat.plan).toBeDefined();
        const plan = yield* Database.load(chat.plan!);
        expect(plan.tasks).toHaveLength(1);
        expect(plan.tasks[0]).toMatchObject({ id: 'task-1', title: 'Hello', status: 'todo' });
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.scoped(
    'adds tasks to the plan without an agent',
    Effect.fnUntraced(
      function* ({ expect }) {
        const feed = yield* Database.add(Feed.make());
        const chat = yield* Database.add(Chat.make({ feed: Ref.make(feed) }));
        expect(chat.plan).toBeUndefined();
        const runtime = yield* Effect.runtime<Database.Service>();
        const binder = new AiContext.Binder({ feed, runtime });
        yield* Effect.promise(() => binder.bind({ objects: [Ref.make(chat)] }));

        yield* Operation.invoke(UpdateTasks, {
          tasks: [{ id: Plan.TaskId.make('task-1'), title: 'Hello', status: 'todo' }],
        }).pipe(Effect.provide(Operation.withInvocationOptions({ conversation: Obj.getURI(feed) })));

        const plan = yield* Database.load(chat.plan!);
        expect(plan.tasks).toHaveLength(1);
        expect(plan.tasks[0]).toMatchObject({ id: 'task-1', title: 'Hello', status: 'todo' });
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
