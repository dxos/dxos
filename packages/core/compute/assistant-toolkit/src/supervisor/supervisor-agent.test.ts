//
// Copyright 2026 DXOS.org
//

// Live smoke test (no memoization): exercises the supervisor running a real agent turn that
// delegates via DelegateTask. Skipped unless ALLOW_LLM_GENERATION is set; moon does not propagate
// that env to test workers, so it is always skipped under `moon run` (CI-safe). Run on demand with
// credentials via vitest directly:
//   ALLOW_LLM_GENERATION=1 npx vitest run src/supervisor/supervisor-agent.test.ts
// Deterministic coverage of the loop lives in supervisor.test.ts.

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Schema from 'effect/Schema';

import { AiContext } from '@dxos/assistant';
import { Blueprint, Operation, OperationHandlerSet } from '@dxos/compute';
import { ProcessManager } from '@dxos/compute-runtime';
import { Database, Feed, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { AssistantTestLayer } from '@dxos/functions-runtime/testing';
import { DXN, EntityId } from '@dxos/keys';
import { Text } from '@dxos/schema';
import { Message } from '@dxos/types';

import { DelegationBlueprint, DelegationHandlers } from '../blueprints/delegation';
import { AgentBlueprintHandlers, AgentWorker } from '../blueprints/project';
import { Agent, Chat, Plan } from '../types';
import { makeSupervisor } from './supervisor';

EntityId.dangerouslyDisableRandomness();

// Stand-in for AgentPrompt: the sub-agent that performs the delegated work.
const RunWork = Operation.make({
  meta: { key: DXN.make('org.dxos.test.supervisor.runWork'), name: 'Run work' },
  input: Schema.Struct({ title: Schema.String }),
  output: Schema.String,
});

const RunWorkHandlers = OperationHandlerSet.make(
  RunWork.pipe(
    Operation.withHandler(
      Effect.fn(function* ({ title }) {
        return `completed: ${title}`;
      }),
    ),
  ),
);

const TestLayer = AssistantTestLayer({
  aiServicePreset: 'edge-remote',
  operationHandlers: [AgentBlueprintHandlers, DelegationHandlers, RunWorkHandlers],
  types: [
    Agent.Agent,
    Plan.Plan,
    Chat.Chat,
    Chat.CompanionTo,
    Blueprint.Blueprint,
    Feed.Feed,
    Text.Text,
    Message.Message,
    AiContext.Binding,
  ],
  blueprints: [DelegationBlueprint.make()],
  disableLlmMemoization: true,
});

describe.skipIf(!process.env.ALLOW_LLM_GENERATION)('supervisor (live agent turn)', () => {
  it.scoped(
    'a user turn that delegates results in a completed task',
    Effect.fnUntraced(
      function* ({ expect }) {
        const agent = yield* Agent.makeInitialized(
          { name: 'Supervisor', instructions: 'You delegate work to sub-agents using the available tools.' },
          DelegationBlueprint.make(),
        );
        yield* Database.flush();

        const completed: { taskId: string; output: string }[] = [];

        const supervisor = makeSupervisor({
          agent,
          childOperation: RunWork,
          // Real turn: run the main agent against the AI; the LLM should call DelegateTask.
          runTurn: (input) =>
            Operation.invoke(AgentWorker, { agent: Ref.make(agent), prompt: input }).pipe(Effect.orDie),
          toChildInput: (task) => Effect.succeed({ title: task.title }),
          onComplete: (taskId, exit) =>
            Effect.sync(() => {
              if (Exit.isSuccess(exit)) {
                completed.push({ taskId, output: exit.value });
              }
            }),
        });

        const manager = yield* ProcessManager.Service;
        const handle = yield* manager.spawn(supervisor);
        yield* handle.submitInput(
          'Delegate a task titled "Research widgets" to a sub-agent to work on in the background.',
        );

        yield* Effect.promise(() => expect.poll(() => completed.length, { timeout: 20_000 }).toBeGreaterThanOrEqual(1));

        const plan = yield* Database.load(agent.plan);
        const done = plan.tasks.filter((task) => task.status === 'done');
        expect(done.length).toBeGreaterThanOrEqual(1);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 240_000, tags: ['llm'] },
  );
});
