//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Blueprint, Operation } from '@dxos/compute';
import { Database, Feed, Obj } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { AssistantTestLayer } from '@dxos/functions-runtime/testing';
import { invariant } from '@dxos/invariant';
import { EntityId } from '@dxos/keys';

import { Agent, Chat, Plan } from '../../../types';
import DelegationBlueprint from '../blueprint';
import { DelegateTask } from './delegate-task';
import { DelegationHandlers } from './index';

EntityId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  operationHandlers: DelegationHandlers,
  types: [Agent.Agent, Plan.Plan, Chat.Chat, Chat.CompanionTo, Blueprint.Blueprint, Feed.Feed],
  blueprints: [DelegationBlueprint.make()],
  disableLlmMemoization: true,
});

describe('DelegateTask', () => {
  it.scoped(
    'adds an in-progress task to the agent plan for delegated work',
    Effect.fnUntraced(
      function* ({ expect }) {
        const agent = yield* Agent.makeInitialized({ name: 'Supervisor', instructions: 'Test.' }, DelegationBlueprint.make());
        yield* Database.flush();

        const chatFeed = agent.chat?.target?.feed?.target;
        invariant(chatFeed, 'Agent chat feed not found.');

        yield* Operation.invoke(DelegateTask, { title: 'Research widgets' }).pipe(
          Effect.provide(Operation.withInvocationOptions({ conversation: Obj.getURI(chatFeed) })),
        );

        const plan = yield* Database.load(agent.plan);
        expect(plan.tasks).toHaveLength(1);
        expect(plan.tasks[0]).toMatchObject({ title: 'Research widgets', status: 'in-progress' });
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
