//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AiContext } from '@dxos/assistant';
import { Operation } from '@dxos/compute';
import { Database, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { invariant } from '@dxos/invariant';
import { EntityId } from '@dxos/keys';

import { OperationTestLayer } from '../../../testing';
import { AgentChat, Chat, Plan } from '../../../types';
import AgentSkillDef from '../skill';
import * as AgentSkillOperations from './definitions';

EntityId.dangerouslyDisableRandomness();

describe('GetContext', () => {
  it.effect(
    'reports the bound agent name and instructions',
    Effect.fnUntraced(
      function* (_) {
        const { agent, conversation } = yield* setupBoundAgent();

        const context = yield* Operation.invoke(AgentSkillOperations.GetContext, {}).pipe(Effect.provide(conversation));

        expect(context.id).toBe(agent.id);
        expect(context.name).toBe('Test Agent');
        expect(context.instructions).toBe('A test agent for context.');
        expect(context.plan).toBe('No plan found.');
      },
      Effect.provide(OperationTestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'formats the chat plan once one exists',
    Effect.fnUntraced(
      function* (_) {
        const { agent, conversation } = yield* setupBoundAgent();
        const chat = yield* AgentChat.loadChat(agent);
        invariant(chat, 'Agent chat not found.');
        const plan = yield* Chat.ensurePlan(chat);
        Obj.update(plan, (plan) => {
          plan.tasks.push({ id: Plan.TaskId.make('task-0'), title: 'Buy eggs', status: 'todo' });
        });
        yield* Database.flush();

        const context = yield* Operation.invoke(AgentSkillOperations.GetContext, {}).pipe(Effect.provide(conversation));

        expect(context.plan).toContain('Buy eggs');
      },
      Effect.provide(OperationTestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});

// Creates an agent and binds it to its own chat feed so the harness-scoped operation resolves it.
const setupBoundAgent = Effect.fnUntraced(function* () {
  const agent = yield* AgentChat.makeInitialized(
    { name: 'Test Agent', instructions: 'A test agent for context.' },
    AgentSkillDef.make(),
  );
  yield* Database.flush();

  const chat = yield* AgentChat.loadChat(agent);
  const chatFeed = chat?.feed?.target;
  invariant(chatFeed, 'Agent chat feed not found.');
  const runtime = yield* Effect.runtime<Database.Service>();
  const binder = new AiContext.Binder({ feed: chatFeed, runtime });
  yield* Effect.promise(() => binder.bind({ objects: [Ref.make(agent)] }));

  return { agent, conversation: Operation.withInvocationOptions({ conversation: Obj.getURI(chatFeed) }) };
});
