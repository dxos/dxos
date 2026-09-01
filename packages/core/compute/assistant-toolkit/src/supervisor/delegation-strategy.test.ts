//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AssistantTestLayer, collectEphemeral, messageTextIncludes, waitForMessage } from '@dxos/agent-runtime/testing';
import { ScriptedLanguageModel } from '@dxos/ai/testing';
import { AiContext } from '@dxos/assistant';
import { getSession } from '@dxos/compute/AgentService';
import * as Operation from '@dxos/compute/Operation';
import * as Project from '@dxos/compute/Project';
import { Database, Obj } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { invariant } from '@dxos/invariant';
import { EntityId } from '@dxos/keys';
import { Text } from '@dxos/schema';
import { Message, Outline, Task } from '@dxos/types';

import { AgentHandlers } from '../operations/index.ts';
import { DelegateTask } from '../skills/delegation/operations/definitions.ts';
import { DelegationSkill, DelegationSkillHandlers } from '../skills/index.ts';
import { Agent, Chat } from '../types/index.ts';
import { makeDelegationStrategy } from './delegation-strategy.ts';

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
          parts: [text('On it — delegating.'), toolCall(Operation.toolName(DelegateTask), { title: TASK_TITLE })],
        },
        {
          parts: [text('Delegated. I will report back when it completes.')],
        },
      ],
    },
  ]),
  operationHandlers: [DelegationSkillHandlers, AgentHandlers],
  skills: [DelegationSkill.make()],
  types: [
    Agent.Agent,
    Outline.Outline,
    Task.Task,
    Chat.Chat,
    AiContext.Binding,
    Text.Text,
    Message.Message,
    Project.Project,
  ],
});

const FAILURE_MESSAGE = 'Model refused politely.';

// Same routing as `TestLayer`, but the sub-agent reports failure via `completeJob`.
const FailingTestLayer = AssistantTestLayer({
  agent: { delegationStrategy: makeDelegationStrategy() },
  aiService: scriptedAiService([
    {
      name: 'sub-agent',
      match: promptIncludes('non-interactive mode'),
      turns: [
        {
          parts: [toolCall('completeJob', { success: null, failure: { message: FAILURE_MESSAGE, description: null } })],
        },
        { parts: [text('Done.')] },
      ],
    },
    {
      name: 'supervisor',
      match: () => true,
      turns: [
        {
          parts: [text('On it — delegating.'), toolCall(Operation.toolName(DelegateTask), { title: TASK_TITLE })],
        },
        {
          parts: [text('Delegated. I will report back when it completes.')],
        },
      ],
    },
  ]),
  operationHandlers: [DelegationSkillHandlers, AgentHandlers],
  skills: [DelegationSkill.make()],
  types: [
    Agent.Agent,
    Outline.Outline,
    Task.Task,
    Chat.Chat,
    AiContext.Binding,
    Text.Text,
    Message.Message,
    Project.Project,
  ],
});

describe('makeDelegationStrategy', () => {
  it.effect(
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
        // Parented like the app runs it — the agent, not its chat — even though the delegated task
        // is recorded on the chat's own checklist.
        const project = yield* Database.add(Project.make({ name: 'Test project' }));
        Obj.setParent(agent, project);
        yield* Database.flush();
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

        // DelegateTask promoted the work to a durable agent task on the chat's checklist.
        const tasks = yield* Chat.loadTasks(chat);
        expect(tasks).toHaveLength(1);
        expect(tasks[0]).toMatchObject({ title: TASK_TITLE, assignee: { role: 'assistant' } });

        // The post-turn reconcile spawned the sub-agent; its exit drives onComplete, which posts
        // the fold-back message to the conversation feed out of band.
        const notification = yield* waitForMessage(feed, messageTextIncludes('The sub-agent completed'));
        expect(Message.extractText(notification)).toContain(TASK_TITLE);
        expect(Message.extractText(notification)).toContain('3628800');

        // ...and marked the durable task done — the checklist is the working surface.
        expect(tasks[0].status).toEqual('done');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 30_000 },
  );

  it.effect(
    'posts a concise failure message without a stack trace when the sub-agent fails',
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
        const project = yield* Database.add(Project.make({ name: 'Test project' }));
        Obj.setParent(agent, project);
        yield* Database.flush();
        const feed = yield* Database.load(chat.feed);

        const session = yield* getSession(feed);
        yield* session.submitPrompt('Delegate a task to a sub-agent to compute 10 factorial.');
        yield* session.waitForCompletion();

        const notification = yield* waitForMessage(feed, messageTextIncludes('The sub-agent failed to complete'));
        const messageText = Message.extractText(notification);
        expect(messageText).toContain(TASK_TITLE);
        expect(messageText).toContain(FAILURE_MESSAGE);
        // The full cause (with stack frames) belongs to the log, not the conversation.
        expect(messageText).not.toMatch(/\bat .*[/(]/);

        expect((yield* Chat.loadTasks(chat))[0]?.status).toEqual('failed');
      },
      Effect.provide(FailingTestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 30_000 },
  );
});
