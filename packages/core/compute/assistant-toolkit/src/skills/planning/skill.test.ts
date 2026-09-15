//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AgentService } from '@dxos/agent-runtime';
import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { LanguageModelFixture } from '@dxos/ai/testing';
import { AiContext } from '@dxos/assistant';
import * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
import * as Skill from '@dxos/compute/Skill';
import { Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { DXN, EntityId } from '@dxos/keys';
import { Text } from '@dxos/schema';
import { Message, Outline, Task } from '@dxos/types';

import { PlanningHandlers } from './operations/index.ts';
import PlanningSkill from './skill.ts';

EntityId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  model: DXN.make('com.anthropic.model.claude-sonnet-5.default'),
  operationHandlers: PlanningHandlers,
  skills: [PlanningSkill.make()],
  types: [
    Agent.Agent,
    Outline.Outline,
    Task.Task,
    Text.Text,
    Chat.Chat,
    Skill.Skill,
    Feed.Feed,
    Message.Message,
    AiContext.Binding,
  ],
  tracing: 'pretty',
});

/** Text the end-request hook enqueues; matching it proves the reminder reached the host's queue. */
const REMINDER = 'Your checklist still has unchecked items';

const TASKS = ['Write a haiku about rain', 'Write a haiku about snow', 'Write a haiku about fog'];

const timeout = (base: number) => ({ timeout: LanguageModelFixture.isUpdateEnabled() ? base * 4 : base });

/**
 * The end-request hook is the planning skill's continuation mechanism: it fires after the turn the
 * model considers finished, so a test that asserts on a single turn cannot see it. Both cases here
 * seed the same three-item checklist and differ only in the user's prompt, which is what the hook's
 * ephemeral stop/continue check reads — that is the branch under test.
 */
describe('Planning skill', { tags: ['model-fixture'] }, () => {
  it.effect(
    'reminds the agent to continue while the checklist has open items',
    Effect.fnUntraced(
      function* (_) {
        const { agent, chat } = yield* setupChatWithChecklist();

        // "One task per turn" makes the first turn end with items still open, which is the state the
        // hook exists for. Without the reminder the process would simply succeed here.
        yield* agent.submitPrompt('Work through the checklist, completing one task per turn.');
        // One call spans the continuation: the hook enqueues from inside the turn handler and arms
        // the next alarm before it returns, so the process is never idle between turns.
        yield* agent.waitForCompletion();

        const messages = yield* Feed.query(agent.feed, Filter.type(Message.Message)).run;
        expect(messages.some((message) => Message.extractText(message).includes(REMINDER))).toBe(true);

        // The reminder is only worth firing if it actually drives the plan to completion.
        const tasks = yield* Chat.loadTasks(chat);
        expect(tasks.map((task) => task.title)).toEqual(TASKS);
        expect(tasks.filter(Chat.isOpenTask)).toEqual([]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    timeout(60_000),
  );

  it.effect(
    'stays silent when the user asked for only part of the checklist',
    Effect.fnUntraced(
      function* (_) {
        const { agent, chat } = yield* setupChatWithChecklist();

        yield* agent.submitPrompt(`Do only the first task ("${TASKS[0]}"), then stop. Leave the rest for later.`);
        yield* agent.waitForCompletion();

        // A deterministic reminder would trap this agent in an unbreakable re-prompt loop: the user
        // scoped the request, so open items are not a reason to continue. Asserting the silence needs
        // no settle window — the hook decides inside the turn handler, so completion is past it, and
        // the sibling case above is the control that proves completion does not precede the hook.

        const messages = yield* Feed.query(agent.feed, Filter.type(Message.Message)).run;
        expect(messages.some((message) => Message.extractText(message).includes(REMINDER))).toBe(false);

        const tasks = yield* Chat.loadTasks(chat);
        expect(tasks.filter(Chat.isOpenTask).map((task) => task.title)).toEqual(TASKS.slice(1));
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    timeout(60_000),
  );
});

/**
 * A session whose chat holds a seeded checklist — the chat the process runs on, which both the hook
 * and update-tasks reach through `Harness.getChat`. Seeding the items rather than having the model
 * author them keeps the two cases differing only in the prompt.
 */
const setupChatWithChecklist = Effect.fnUntraced(function* () {
  const agent = yield* AgentService.createSession({ skills: [PlanningSkill.make()] });
  // The checklist goes on the session's own chat — the one the harness resolves for the
  // conversation. A second chat on the same feed would be invisible to the planning tools.
  const chat = yield* Database.resolve(Obj.getURI(agent.chat), Chat.Chat);
  const { db } = yield* Database.Service;
  for (const title of TASKS) {
    Chat.addTask(db, chat, title, { status: 'todo' });
  }
  yield* Database.flush();
  yield* agent.addContext([Ref.make(chat)]);

  return { agent, chat };
});
