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
import { Database, Feed, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { DXN, EntityId } from '@dxos/keys';
import { Text } from '@dxos/schema';
import { Message, Outline, Task } from '@dxos/types';

import PlanningSkill from '../skill';
import { PlanningHandlers } from './index';

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
 * `assign-tasks` moves membership only, so both cases start from tasks that exist outside the
 * conversation — the shape the tool exists for (a project's task borrowed by a chat). Resolving a
 * title to a URI belongs to the Database skill, so the prompts name the URI directly.
 */
describe('AssignTasks skill', { tags: ['model-fixture'] }, () => {
  it.effect(
    'assigns tasks that already exist to the conversation',
    Effect.fnUntraced(
      function* (_) {
        const { agent, chat } = yield* setupChat();
        const first = yield* Database.add(Task.make({ title: 'Renew the domain', status: 'todo' }));
        const second = yield* Database.add(Task.make({ title: 'Rotate the API keys', status: 'todo' }));
        yield* Database.flush();

        yield* agent.submitPrompt(
          `Put these two existing tasks on my checklist: ${Obj.getURI(first)} and ${Obj.getURI(second)}.`,
        );
        yield* agent.waitForCompletion();

        const tasks = yield* Chat.loadTasks(chat);
        expect(tasks.map((task) => task.title)).toEqual(['Renew the domain', 'Rotate the API keys']);
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

        // Addressed by URI, not by title: the rendered checklist carries ordinals and titles only,
        // so the model has no way to reach a task's reference from the conversation alone.
        yield* agent.submitPrompt(
          `Take the task ${Obj.getURI(dropped)} off my checklist — I am not working on it here.`,
        );
        yield* agent.waitForCompletion();

        const tasks = yield* Chat.loadTasks(chat);
        expect(tasks.map((task) => task.title)).toEqual([kept.title]);
        // Membership-only: whoever else holds the task still has it.
        expect(Obj.isDeleted(dropped)).toBe(false);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    timeout(60_000),
  );
});

/** A session whose feed carries a Chat bound as context — how `Chat.getFromContext` finds it. */
const setupChat = Effect.fnUntraced(function* () {
  const agent = yield* AgentService.createSession({ skills: [PlanningSkill.make()] });
  const chat = yield* Database.add(Chat.make({ feed: Ref.make(agent.feed) }));
  yield* Database.flush();
  yield* agent.addContext([Ref.make(chat)]);
  return { agent, chat };
});
