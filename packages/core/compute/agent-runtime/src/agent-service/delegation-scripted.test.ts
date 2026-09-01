//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Schema from 'effect/Schema';
import { expect } from 'vitest';

import { ScriptedLanguageModel } from '@dxos/ai/testing';
import { ProcessManager } from '@dxos/compute-runtime';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import { TestHelpers } from '@dxos/effect/testing';
import { DXN, EntityId } from '@dxos/keys';

import { AssistantTestLayer } from '../testing/index.ts';
import * as AgentService from './AgentService.ts';
import { type DelegationStrategy } from './delegation-strategy.ts';

const { text, scriptedAiService } = ScriptedLanguageModel;

EntityId.dangerouslyDisableRandomness();

/**
 * Trivial child operation the stub strategy spawns as a sub-agent. Returns a derived string
 * synchronously so the delegation lifecycle is exercised without any model turn on the child.
 */
const DelegatedWork = Operation.make({
  meta: {
    key: DXN.make('com.example.operation.delegatedWork'),
    name: 'Delegated work',
    description: 'Performs a delegated unit of work',
  },
  input: Schema.String,
  output: Schema.String,
});

const handlers = OperationHandlerSet.make(
  DelegatedWork.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* (input) {
        return `done: ${input}`;
      }),
    ),
  ),
);

interface DelegationHarness {
  /** Work the stub strategy delegates on the next reconcile (keyed by a stable id). */
  pending: { id: string; input: string }[];
  /** Completions observed via the strategy's `onComplete` callback. */
  completed: { id: string; exit: Exit.Exit<unknown> }[];
}

const delegationHarness: DelegationHarness = { pending: [], completed: [] };

/**
 * Stub {@link DelegationStrategy} driven by {@link delegationHarness}: each reconcile delegates the
 * pending work not already in flight and records completions, so the test can assert the
 * reconcile → spawn → onChildEvent → onComplete loop in isolation from any plan/chat semantics
 * (the real strategy is covered by `assistant-toolkit/src/supervisor/delegation-strategy.test.ts`).
 */
const StubDelegationStrategy: DelegationStrategy = {
  reconcile: (_feed, activeIds) =>
    Effect.succeed(
      delegationHarness.pending
        .filter((work) => !activeIds.has(work.id))
        .map((work) => ({
          id: work.id,
          spawn: Effect.gen(function* () {
            const invoker = yield* ProcessManager.ProcessOperationInvoker.Service;
            const fiber = yield* invoker.invokeFiber(DelegatedWork, work.input);
            return fiber.pid;
          }),
        })),
    ),
  onComplete: (_feed, id, exit) =>
    Effect.sync(() => {
      delegationHarness.completed.push({ id, exit });
      delegationHarness.pending = delegationHarness.pending.filter((work) => work.id !== id);
    }),
};

// The stub strategy delegates regardless of the model output, so a single text turn is all the
// supervisor needs; the child operation runs no model at all.
const TestLayer = AssistantTestLayer({
  agent: { delegationStrategy: StubDelegationStrategy },
  aiService: scriptedAiService([{ parts: [text('Working on it.')] }]),
  operationHandlers: [handlers],
});

describe('AgentProcess delegation lifecycle (scripted)', () => {
  it.effect(
    'delegates work to a sub-agent and folds the result back on completion',
    Effect.fnUntraced(
      function* (_) {
        delegationHarness.pending = [{ id: 'task-1', input: 'forty-two' }];
        delegationHarness.completed = [];

        const session = yield* AgentService.createSession();
        yield* session.submitPrompt('Please do the pending work.');
        // Settles on the turn's reply; the delegated child runs in the background (not awaited here).
        yield* session.waitForCompletion();

        // The post-turn reconcile spawned a linked child; its exit drives onChildEvent → onComplete.
        yield* Effect.promise(async () => {
          await expect.poll(() => delegationHarness.completed.length, { timeout: 5_000 }).toBe(1);
        });

        const [completion] = delegationHarness.completed;
        expect(completion.id).toBe('task-1');
        expect(Exit.isSuccess(completion.exit)).toBe(true);
        if (Exit.isSuccess(completion.exit)) {
          expect(completion.exit.value).toBe('done: forty-two');
        }
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 15_000 },
  );
});
