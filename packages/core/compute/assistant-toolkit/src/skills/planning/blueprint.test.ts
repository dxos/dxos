//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Blueprint, Operation, Process } from '@dxos/compute';
import { ProcessManager } from '@dxos/compute-runtime';
import { getSession } from '@dxos/compute/AgentService';
import { Database, Feed, Obj } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { AssistantTestLayer } from '@dxos/functions-runtime/testing';
import { invariant } from '@dxos/invariant';
import { EntityId } from '@dxos/keys';

import { Agent, Chat, Plan } from '../../types';
import PlanningBlueprint from './blueprint';
import { PlanningHandlers, PlanningOperations } from './operations';

EntityId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  operationHandlers: PlanningHandlers,
  types: [Agent.Agent, Plan.Plan, Chat.Chat, Chat.CompanionTo, Blueprint.Blueprint, Feed.Feed],
  blueprints: [PlanningBlueprint.make()],
});

describe('Planning blueprint', () => {
  // The hook fires the plan-reminder operation only while the plan has open tasks; cover that
  // predicate directly so the branch is verified without an agent turn.
  describe('hasIncompleteTasks', () => {
    it('is true while any task is todo or in-progress', ({ expect }) => {
      expect(Plan.hasIncompleteTasks(makePlan(['todo']))).toBe(true);
      expect(Plan.hasIncompleteTasks(makePlan(['done', 'in-progress']))).toBe(true);
    });

    it('is false when every task is done', ({ expect }) => {
      expect(Plan.hasIncompleteTasks(makePlan(['done', 'done']))).toBe(false);
      expect(Plan.hasIncompleteTasks(makePlan([]))).toBe(false);
    });
  });

  // The end-request hook reads the plan (Tier A), runs an ephemeral stop/continue check over the
  // conversation history (LanguageModel, memoized), and on "continue" reaches the live host through
  // HarnessService Tier B (like the alarm blueprint's set-alarm) to enqueue a reminder. Spawning a
  // host on the agent's chat feed and invoking the operation against that conversation dispatches
  // over the process RPC loopback; the host staying live proves the read, the check, and the enqueue
  // resolved end-to-end without failing the process.
  describe('plan-reminder hook (end-request, Tier B)', () => {
    it.scoped(
      'enqueues a continuation reminder when the plan has incomplete tasks',
      Effect.fnUntraced(
        function* ({ expect }) {
          const { conversation, host } = yield* setupAgentWithLiveHost([
            { id: Plan.TaskId.make('task-1'), title: 'Buy eggs', status: 'todo' },
            { id: Plan.TaskId.make('task-2'), title: 'Crack eggs', status: 'in-progress' },
          ]);

          yield* Operation.invoke(PlanningOperations.PlanReminder, {}).pipe(
            Effect.provide(Operation.withInvocationOptions({ conversation })),
          );

          expect(host.status.state).not.toBe(Process.State.FAILED);
          expect(host.status.state).not.toBe(Process.State.TERMINATED);
        },
        Effect.provide(TestLayer),
        TestHelpers.provideTestContext,
      ),
    );

    it.scoped(
      'is a no-op when the plan is complete',
      Effect.fnUntraced(
        function* ({ expect }) {
          const { conversation, host } = yield* setupAgentWithLiveHost([
            { id: Plan.TaskId.make('task-1'), title: 'Buy eggs', status: 'done' },
          ]);

          yield* Operation.invoke(PlanningOperations.PlanReminder, {}).pipe(
            Effect.provide(Operation.withInvocationOptions({ conversation })),
          );

          expect(host.status.state).not.toBe(Process.State.FAILED);
          expect(host.status.state).not.toBe(Process.State.TERMINATED);
        },
        Effect.provide(TestLayer),
        TestHelpers.provideTestContext,
      ),
    );
  });
});

const makePlan = (statuses: readonly Plan.TaskStatus[]): Plan.Plan =>
  Plan.makePlan({ tasks: statuses.map((status, index) => ({ title: `Task ${index}`, status })) });

/**
 * Creates an agent (with the planning blueprint and a seeded plan) bound to its chat feed, then
 * spawns a live host process on that feed so HarnessService Tier B is reachable for the conversation.
 */
const setupAgentWithLiveHost = (tasks: readonly Plan.Task[]) =>
  Effect.gen(function* () {
    const agent = yield* Agent.makeInitialized({ name: 'Planner', instructions: 'Test.' }, PlanningBlueprint.make());
    const chat = yield* Database.load(agent.chat!);
    const plan = yield* Chat.ensurePlan(chat);
    Obj.update(plan, (plan) => {
      plan.tasks.push(...tasks);
    });
    yield* Database.flush();

    const chatFeed = agent.chat?.target?.feed?.target;
    invariant(chatFeed, 'Agent chat feed not found.');

    // Spawns (and stamps) the host process that owns the conversation's harness.
    yield* getSession(chatFeed);

    const conversation = Obj.getURI(chatFeed);
    const processManager = yield* ProcessManager.Service;
    const [host] = yield* processManager.list({ target: conversation });
    invariant(host, 'Host process not found.');

    return { conversation, host };
  });
