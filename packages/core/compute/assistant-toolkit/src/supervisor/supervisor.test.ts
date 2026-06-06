//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Schema from 'effect/Schema';

import { Blueprint, Operation, OperationHandlerSet, Process } from '@dxos/compute';
import { ProcessManager } from '@dxos/compute-runtime';
import { Database, Feed, Obj } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { AssistantTestLayer } from '@dxos/functions-runtime/testing';
import { DXN, EntityId } from '@dxos/keys';

import { DelegationBlueprint } from '../blueprints/delegation';
import { Agent, Chat, Plan } from '../types';
import { makeSupervisor } from './supervisor';

EntityId.dangerouslyDisableRandomness();

// Toy child operation standing in for AgentPrompt in the deterministic loop test.
const RunWork = Operation.make({
  meta: { key: DXN.make('org.dxos.test.supervisor.runWork'), name: 'Run work' },
  input: Schema.Struct({ title: Schema.String }),
  output: Schema.String,
});

const FailingWork = Operation.make({
  meta: { key: DXN.make('org.dxos.test.supervisor.failingWork'), name: 'Failing work' },
  input: Schema.Struct({ title: Schema.String }),
  output: Schema.String,
});

const handlers = OperationHandlerSet.make(
  RunWork.pipe(
    Operation.withHandler(
      Effect.fn(function* ({ title }) {
        return `done: ${title}`;
      }),
    ),
  ),
  FailingWork.pipe(
    Operation.withHandler(
      Effect.fn(function* () {
        return yield* Effect.die('sub-agent failed');
      }),
    ),
  ),
);

const TestLayer = AssistantTestLayer({
  operationHandlers: handlers,
  types: [Agent.Agent, Plan.Plan, Chat.Chat, Chat.CompanionTo, Blueprint.Blueprint, Feed.Feed],
  blueprints: [DelegationBlueprint.make()],
  disableLlmMemoization: true,
});

describe('supervisor', () => {
  it.scoped(
    'reconciles in-progress tasks by running child operations to completion',
    Effect.fnUntraced(
      function* ({ expect }) {
        const agent = yield* Agent.makeInitialized(
          { name: 'Supervisor', instructions: 'Test.' },
          DelegationBlueprint.make(),
        );
        yield* Database.flush();

        const completed: { taskId: string; output: string }[] = [];

        const supervisor = makeSupervisor({
          agent,
          childOperation: RunWork,
          // Stand-in for the AiSession turn: directly records delegated work as an in-progress task.
          runTurn: (input) =>
            Effect.gen(function* () {
              const plan = yield* Database.load(agent.plan).pipe(Effect.orDie);
              Obj.update(plan, (plan) => {
                Plan.addTasks(plan, [{ title: input, status: 'in-progress' }]);
              });
            }),
          toChildInput: (task) => ({ title: task.title }),
          onComplete: (taskId, exit) =>
            Effect.sync(() => {
              if (Exit.isSuccess(exit)) {
                completed.push({ taskId, output: exit.value });
              }
            }),
        });

        const manager = yield* ProcessManager.Service;
        const handle = yield* manager.spawn(supervisor);
        yield* handle.submitInput('Research widgets');

        yield* Effect.promise(() => expect.poll(() => completed.length, { timeout: 10_000 }).toBe(1));
        expect(completed[0]!.output).toBe('done: Research widgets');

        const plan = yield* Database.load(agent.plan);
        expect(plan.tasks).toHaveLength(1);
        expect(plan.tasks[0]!.status).toBe('done');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.scoped(
    'marks a task failed when its sub-agent fails',
    Effect.fnUntraced(
      function* ({ expect }) {
        const agent = yield* Agent.makeInitialized(
          { name: 'Supervisor', instructions: 'Test.' },
          DelegationBlueprint.make(),
        );
        yield* Database.flush();

        const failures: string[] = [];

        const supervisor = makeSupervisor({
          agent,
          childOperation: FailingWork,
          runTurn: (input) =>
            Effect.gen(function* () {
              const plan = yield* Database.load(agent.plan).pipe(Effect.orDie);
              Obj.update(plan, (plan) => {
                Plan.addTasks(plan, [{ title: input, status: 'in-progress' }]);
              });
            }),
          toChildInput: (task) => ({ title: task.title }),
          onComplete: (taskId, exit) =>
            Effect.sync(() => {
              if (Exit.isFailure(exit)) {
                failures.push(taskId);
              }
            }),
        });

        const manager = yield* ProcessManager.Service;
        const handle = yield* manager.spawn(supervisor);
        yield* handle.submitInput('Doomed work');

        yield* Effect.promise(() => expect.poll(() => failures.length, { timeout: 10_000 }).toBe(1));

        const plan = yield* Database.load(agent.plan);
        expect(plan.tasks[0]!.status).toBe('failed');
        // Supervisor itself stays alive.
        expect(handle.status.state).not.toBe(Process.State.FAILED);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
