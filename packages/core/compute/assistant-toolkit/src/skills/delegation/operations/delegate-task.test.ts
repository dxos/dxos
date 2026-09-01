//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import * as Operation from '@dxos/compute/Operation';
import * as Project from '@dxos/compute/Project';
import * as Skill from '@dxos/compute/Skill';
import { Database, Feed, Obj } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { invariant } from '@dxos/invariant';
import { EntityId } from '@dxos/keys';
import { Text } from '@dxos/schema';
import { Outline, Task } from '@dxos/types';

import { Agent, Chat } from '../../../types/index.ts';
import DelegationSkill from '../skill.ts';
import { DelegateTask } from './definitions.ts';
import { DelegationSkillHandlers } from './index.ts';

EntityId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  operationHandlers: DelegationSkillHandlers,
  types: [Agent.Agent, Outline.Outline, Task.Task, Text.Text, Chat.Chat, Skill.Skill, Feed.Feed, Project.Project],
  skills: [DelegationSkill.make()],
  disableLlmMemoization: true,
});

/**
 * A project conversation. Delegation records the task on the CHAT's checklist either way — the
 * project parent is here so the tests cover the shape the app actually runs.
 */
const makeProjectAgent = Effect.gen(function* () {
  const agent = yield* Agent.makeInitialized({ name: 'Supervisor', instructions: 'Test.' }, DelegationSkill.make());
  const project = yield* Database.add(Project.make({ name: 'Test project' }));
  // The agent is parented, not its chat: the chat reaches the project through the agent, and
  // `Agent.loadChat` finds the chat by ITS parent edge.
  Obj.setParent(agent, project);
  yield* Database.flush();
  return { agent, project };
});

const invokeDelegateTask = (input: { title: string }, chatFeed: Feed.Feed) =>
  Operation.invoke(DelegateTask, input).pipe(
    Effect.provide(Operation.withInvocationOptions({ conversation: Obj.getURI(chatFeed) })),
  );

describe('DelegateTask', () => {
  it.effect(
    'promotes delegated work to a durable queued agent task',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { agent, project } = yield* makeProjectAgent;

        const agentChat = yield* Agent.loadChat(agent);
        const chatFeed = agentChat?.feed?.target;
        invariant(chatFeed, 'Agent chat feed not found.');

        yield* invokeDelegateTask({ title: 'Research widgets' }, chatFeed);

        // The durable task lands on the chat's checklist with an agent assignee.
        const chat = yield* Agent.loadChat(agent);
        invariant(chat, 'Agent chat not found.');
        const tasks = yield* Chat.loadTasks(chat);
        expect(tasks).toHaveLength(1);
        expect(tasks[0]).toMatchObject({
          title: 'Research widgets',
          status: 'todo',
          assignee: { role: 'assistant' },
        });
        // The project's own ledger is untouched: a conversation's checklist is its own.
        invariant(project.taskSet, 'Project task set not materialized.');
        const taskSet = yield* Database.load(project.taskSet);
        expect(taskSet.tasks).toHaveLength(0);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'appends every delegation to the same checklist, in order',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { agent } = yield* makeProjectAgent;

        const agentChat = yield* Agent.loadChat(agent);
        const chatFeed = agentChat?.feed?.target;
        invariant(chatFeed, 'Agent chat feed not found.');

        yield* invokeDelegateTask({ title: 'Research widgets' }, chatFeed);
        yield* invokeDelegateTask({ title: 'Summarize findings' }, chatFeed);

        const chat = yield* Agent.loadChat(agent);
        invariant(chat, 'Agent chat not found.');
        const tasks = yield* Chat.loadTasks(chat);
        expect(tasks.map((task) => task.title)).toEqual(['Research widgets', 'Summarize findings']);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'files onto the checklist outside a project',
    Effect.fnUntraced(
      function* ({ expect }) {
        // No project parent: the checklist is the chat's own either way, so delegation still promotes.
        const agent = yield* Agent.makeInitialized(
          { name: 'Supervisor', instructions: 'Test.' },
          DelegationSkill.make(),
        );
        yield* Database.flush();

        const agentChat = yield* Agent.loadChat(agent);
        const chatFeed = agentChat?.feed?.target;
        invariant(chatFeed, 'Agent chat feed not found.');

        yield* invokeDelegateTask({ title: 'Research widgets' }, chatFeed);

        const chat = yield* Agent.loadChat(agent);
        invariant(chat, 'Agent chat not found.');
        expect(yield* Chat.loadTasks(chat)).toHaveLength(1);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'fails on an empty title',
    Effect.fnUntraced(
      function* ({ expect }) {
        const agent = yield* Agent.makeInitialized(
          { name: 'Supervisor', instructions: 'Test.' },
          DelegationSkill.make(),
        );
        yield* Database.flush();

        const agentChat = yield* Agent.loadChat(agent);
        const chatFeed = agentChat?.feed?.target;
        invariant(chatFeed, 'Agent chat feed not found.');

        const exit = yield* invokeDelegateTask({ title: '' }, chatFeed).pipe(Effect.exit);
        expect(exit._tag).toBe('Failure');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
