//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AssistantTestLayer, collectEphemeral, messageTextIncludes, waitForMessage } from '@dxos/agent-runtime/testing';
import { ScriptedLanguageModel } from '@dxos/ai/testing';
import { AiContext } from '@dxos/assistant';
import { Plan } from '@dxos/compute';
import { getSession } from '@dxos/compute/AgentService';
import { Database } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { invariant } from '@dxos/invariant';
import { EntityId } from '@dxos/keys';
import { Text } from '@dxos/schema';
import { Message } from '@dxos/types';

import { AgentHandlers } from '../operations';
import { DelegationHandlers, DelegationSkill } from '../skills';
import { Agent, Chat } from '../types';
import { makeDelegationStrategy } from './delegation-strategy';

const { text, toolCall, promptIncludes, scriptedAiService } = ScriptedLanguageModel;

EntityId.dangerouslyDisableRandomness();

const TASK_TITLE = 'Compute 10 factorial';

// Two cooperating sessions share one scripted service: the sub-agent's `RunInstructions` system
// prompt is the discriminator (only sub-agents run in "non-interactive mode"); the supervisor is
// the fallback route. Each route consumes its own cursor, so supervisor turns are unaffected by
// when the sub-agent runs.
const TestLayer = AssistantTestLayer({
  agent: { delegationStrategy: makeDelegationStrategy() },
  aiService: scriptedAiService([
    {
      name: 'sub-agent',
      match: promptIncludes('non-interactive mode'),
      turns: [{ parts: [toolCall('completeJob', { success: '3628800' })] }, { parts: [text('Done.')] }],
    },
    {
      name: 'supervisor',
      match: () => true,
      turns: [
        // Immediate reply + delegation in one turn: the user sees the reply while the work runs.
        {
          parts: [text('On it — delegating.'), toolCall('delegate-task', { title: TASK_TITLE })],
        },
        {
          parts: [text('Delegated. I will report back when it completes.')],
        },
      ],
    },
  ]),
  operationHandlers: [DelegationHandlers, AgentHandlers],
  skills: [DelegationSkill.make()],
  types: [Agent.Agent, Plan.Plan, Chat.Chat, Chat.CompanionTo, AiContext.Binding, Text.Text, Message.Message],
});

describe('makeDelegationStrategy', () => {
  it.scoped(
    'replies immediately, delegates to a sub-agent, and folds the result back',
    Effect.fnUntraced(
      function* ({ expect }) {
        const agent = yield* Agent.makeInitialized(
          {
            name: 'Supervisor',
            instructions: 'You delegate units of work to sub-agents using the available tools.',
          },
          DelegationSkill.make(),
        );
        yield* Database.flush();

        const chat = yield* Agent.loadChat(agent);
        invariant(chat, 'Agent chat not found.');
        const feed = yield* Database.load(chat.feed);

        const session = yield* getSession(feed);
        const ephemeral = yield* collectEphemeral(session);

        yield* session.submitPrompt('Delegate a task to a sub-agent to compute 10 factorial.');
        // Settles on the turn's reply; the delegated child runs in the background.
        yield* session.waitForCompletion();

        // The immediate reply streamed before the sub-agent produced anything.
        const streamedText = ephemeral
          .partialBlocks()
          .map(({ block }) => (block._tag === 'text' ? block.text : ''))
          .join('');
        expect(streamedText).toContain('On it');

        // DelegateTask recorded the work on the session plan.
        const planAfterTurn = chat.plan ? yield* Database.load(chat.plan) : undefined;
        invariant(planAfterTurn, 'Plan not created.');
        expect(planAfterTurn.tasks).toHaveLength(1);
        expect(planAfterTurn.tasks[0]).toMatchObject({ title: TASK_TITLE, delegated: true });

        // The post-turn reconcile spawned the sub-agent; its exit drives onComplete, which posts
        // the fold-back message to the conversation feed out of band.
        const notification = yield* waitForMessage(feed, messageTextIncludes('The sub-agent completed'));
        expect(Message.extractText(notification)).toContain(TASK_TITLE);
        expect(Message.extractText(notification)).toContain('3628800');

        // ...and marked the plan task done.
        expect(planAfterTurn.tasks[0].status).toEqual('done');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 30_000 },
  );
});
