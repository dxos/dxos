//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Skill, Operation } from '@dxos/compute';
import { Database, Feed, Obj } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { AssistantTestLayer } from '@dxos/functions-runtime/testing';
import { invariant } from '@dxos/invariant';
import { EntityId } from '@dxos/keys';

import { Agent, Chat, Plan } from '../../../types';
import PlanningSkill from '../skill';
import { PlanningHandlers } from './index';
import { UpdateTasks } from './update-tasks';

EntityId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  operationHandlers: PlanningHandlers,
  types: [Agent.Agent, Plan.Plan, Chat.Chat, Chat.CompanionTo, Skill.Skill, Feed.Feed],
  skills: [PlanningSkill.make()],
  disableLlmMemoization: true,
});

describe('UpdateTasks', () => {
  it.scoped(
    'adds tasks to the plan',
    Effect.fnUntraced(
      function* ({ expect }) {
        const agent = yield* Agent.makeInitialized({ name: 'Planner', instructions: 'Test.' }, PlanningSkill.make());
        yield* Database.flush();

        const chatFeed = agent.chat?.target?.feed?.target;
        invariant(chatFeed, 'Agent chat feed not found.');

        yield* Operation.invoke(UpdateTasks, {
          tasks: [{ id: Plan.TaskId.make('task-1'), title: 'Hello', status: 'todo' }],
        }).pipe(Effect.provide(Operation.withInvocationOptions({ conversation: Obj.getURI(chatFeed) })));

        const plan = yield* Database.load(agent.plan);
        expect(plan.tasks).toHaveLength(1);
        expect(plan.tasks[0]).toMatchObject({ id: 'task-1', title: 'Hello', status: 'todo' });
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
