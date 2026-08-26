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
import { Outline, Task, TaskSet } from '@dxos/types';

import { Agent, Chat } from '../../../types';
import DelegationSkill from '../skill';
import { DelegateTask } from './definitions';
import { DelegationSkillHandlers } from './index';

EntityId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  operationHandlers: DelegationSkillHandlers,
  types: [
    Agent.Agent,
    Outline.Outline,
    Task.Task,
    TaskSet.TaskSet,
    Text.Text,
    Chat.Chat,
    Skill.Skill,
    Feed.Feed,
    Project.Project,
  ],
  skills: [DelegationSkill.make()],
  disableLlmMemoization: true,
});

/**
 * A project conversation: delegation files into the project's task set; a standalone chat files
 * into its own lazily created set (see the standalone test below).
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

        // The durable task is parented to the project's task set with an agent assignee.
        const taskSet = yield* Database.load(project.taskSet!);
        const tasks = TaskSet.resolveTasks(taskSet);
        expect(tasks).toHaveLength(1);
        expect(tasks[0]).toMatchObject({
          title: 'Research widgets',
          status: 'todo',
          assignee: { role: 'assistant' },
        });
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'files every delegation into the project task set',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { agent, project } = yield* makeProjectAgent;

        const agentChat = yield* Agent.loadChat(agent);
        const chatFeed = agentChat?.feed?.target;
        invariant(chatFeed, 'Agent chat feed not found.');

        yield* invokeDelegateTask({ title: 'Research widgets' }, chatFeed);
        yield* invokeDelegateTask({ title: 'Summarize findings' }, chatFeed);

        const taskSet = yield* Database.load(project.taskSet!);
        const tasks = TaskSet.resolveTasks(taskSet);
        expect(tasks).toHaveLength(2);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    "files into the chat's own task set outside a project",
    Effect.fnUntraced(
      function* ({ expect }) {
        // No project parent: the chat lazily owns its own ledger, so delegation still promotes.
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
        invariant(chat?.taskSet, 'Chat task set not created.');
        const taskSet = yield* Database.load(chat.taskSet);
        expect(TaskSet.resolveTasks(taskSet)).toHaveLength(1);
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
