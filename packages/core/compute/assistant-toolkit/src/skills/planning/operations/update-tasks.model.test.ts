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

import PlanningSkill from '../skill.ts';
import { PlanningHandlers } from './index.ts';

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

const timeout = (base: number) => ({ timeout: LanguageModelFixture.isUpdateEnabled() ? base * 4 : base });

/**
 * Both cases start from tasks that exist outside the conversation — a project's task borrowed by a
 * chat — which is where a title-keyed tool used to duplicate work. Resolving a title to a URI
 * belongs to the Database skill, so the prompts name the URI directly.
 */
describe('UpdateTasks skill', { tags: ['model-fixture'] }, () => {
  it.effect(
    'starts an existing task by ref rather than recreating it',
    Effect.fnUntraced(
      function* (_) {
        const { agent, chat } = yield* setupChat();
        const existing = yield* Database.add(Task.make({ title: 'Renew the domain', status: 'todo' }));
        yield* Database.flush();

        // Only the status move is asked for: left open-ended, the model reasonably asks how to renew a
        // domain it cannot reach, and a question blocks the task this test expects to see started.
        yield* agent.submitPrompt(
          `Mark the existing task ${Obj.getURI(existing)} as started. That is all for now — do not ask anything.`,
        );
        yield* agent.waitForCompletion();

        const tasks = yield* Chat.loadTasks(chat);
        expect(tasks.map((task) => task.id)).toEqual([existing.id]);
        expect(existing.status).toEqual('started');
        expect(existing.assignee?.subject?.target?.id).toEqual(chat.id);
        // No copy was made alongside it.
        const titled = yield* Database.query(Filter.type(Task.Task, { title: 'Renew the domain' })).run;
        expect(titled).toHaveLength(1);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    timeout(60_000),
  );

  it.effect(
    'unassigns a task without deleting it',
    Effect.fnUntraced(
      function* (_) {
        const { agent, chat } = yield* setupChat();
        const kept = yield* Database.add(Task.make({ title: 'Renew the domain', status: 'todo' }));
        const dropped = yield* Database.add(Task.make({ title: 'Rotate the API keys', status: 'todo' }));
        Chat.assignTasks(chat, [Ref.make(kept), Ref.make(dropped)]);
        yield* Database.flush();

        yield* agent.submitPrompt(
          `Take the task ${Obj.getURI(dropped)} off my checklist — I am not working on it here.`,
        );
        yield* agent.waitForCompletion();

        const tasks = yield* Chat.loadTasks(chat);
        expect(tasks.map((task) => task.title)).toEqual([kept.title]);
        expect(dropped.assignee).toBeUndefined();
        // Unassigning leaves the task for whoever else holds it.
        expect(Obj.isDeleted(dropped)).toBe(false);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    timeout(60_000),
  );
});

/** A session and the chat it runs on — the one `Harness.getChat` resolves for the conversation. */
const setupChat = Effect.fnUntraced(function* () {
  const agent = yield* AgentService.createSession({ skills: [PlanningSkill.make()] });
  // The session's own chat, not a second one on the same feed: the harness resolves the
  // conversation's chat, so a chat created beside it would be invisible to the planning tools.
  const chat = yield* Database.resolve(Obj.getURI(agent.chat), Chat.Chat);
  yield* Database.flush();
  yield* agent.addContext([Ref.make(chat)]);
  return { agent, chat };
});
