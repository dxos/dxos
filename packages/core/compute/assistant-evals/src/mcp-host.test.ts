//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';
import { describe, test } from 'vitest';

import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { Database } from '@dxos/echo';
import { makeRegistry } from '@dxos/echo-client';
import { EffectEx } from '@dxos/effect';
import { DXN, SpaceId } from '@dxos/keys';
import { McpToolkit } from '@dxos/mcp-client';

import { startMcpHost } from './mcp-host.ts';
import * as McpLatency from './McpLatency.ts';

const SPACE = SpaceId.random();

const KEY = 'com.example.operation.tasks.createTask';

const CreateTask = Operation.make({
  meta: { key: DXN.make(KEY), name: 'Create Task', description: 'Creates a task.' },
  input: Schema.Struct({ title: Schema.String }),
  output: Schema.Struct({ id: Schema.String }),
  services: [Database.Service],
}).pipe(Operation.mutation('write'));

const definition: Skill.Definition = {
  key: 'com.example.skill.tasks',
  operations: [CreateTask],
  make: () =>
    Skill.make({
      key: 'com.example.skill.tasks',
      name: 'Tasks',
      description: 'Task ledger workflow.',
      mcpPrompt: true,
      instructions: Template.make({ source: 'Create tasks with the create verb.' }),
      tools: Skill.toolDefinitions({ operations: [CreateTask] }),
    }),
};

/** Records what reached the invoke seam; the transport is the subject, not the operation. */
const stubInvoker = () => {
  const invocations: { key: string; input: unknown; spaceId?: string }[] = [];
  const service: Operation.OperationService = {
    invoke: <I, O>(
      op: Operation.Definition<I, O>,
      ...args: void extends I
        ? [input?: I, options?: Operation.InvokeOptions]
        : [input: I, options?: Operation.InvokeOptions]
    ) => {
      const [input, options] = args;
      invocations.push({ key: String(op.meta.key), input, spaceId: options?.spaceId });
      return Effect.succeed({ id: 'T-1' } as O);
    },
    schedule: () => Effect.void,
    invokePromise: () => Promise.resolve({}),
  };
  return { invocations, context: Context.make(Operation.Service, service) };
};

/**
 * The in-process host an eval's agent dials, exercised by the same MCP client `AiSession` uses.
 *
 * Deterministic and offline — no model, no harness — because what can break here is the transport:
 * effect's RPC layer answers a single request with a one-element batch, and a client that receives
 * the array lists no tools at all (see `McpServer.normalizeResponse`).
 */
describe('startMcpHost', () => {
  test('serves the projected surface to an MCP client and dispatches to the invoker', async ({ expect }) => {
    const { invocations, context } = stubInvoker();

    await EffectEx.runPromise(
      Effect.gen(function* () {
        // A registry of this test's own; the eval harness passes its client's instead.
        const registry = makeRegistry({
          initial: [...Operation.serializable([CreateTask]), definition.make()],
        });
        const { url } = yield* startMcpHost({
          skills: [definition],
          spaceIds: [SPACE],
          context: () => context,
          registry: () => registry,
        });
        const toolkit = yield* McpToolkit.make({ url, protocol: 'http' });

        expect(Object.keys(toolkit.toolkit.tools).sort()).to.deep.equal([
          'invokeOperation',
          'loadSkill',
          'queryOperations',
        ]);

        // The handlers are what the MCP client built, so calling one drives a real request over
        // the transport — the same path a model's tool call takes.
        const handlers = yield* toolkit.toolkit.pipe(Effect.provide(toolkit.layer));
        const results = yield* handlers
          .handle('invokeOperation', { key: KEY, input: { title: 'Ship' }, spaceId: SPACE })
          .pipe(Effect.provide(toolkit.layer));
        yield* Stream.runDrain(results);

        expect(invocations).to.deep.equal([{ key: `dxn:${KEY}`, input: { title: 'Ship' }, spaceId: SPACE }]);
      }).pipe(Effect.scoped),
    );
  });

  test('the latency probe times the same surface from the outside', async ({ expect }) => {
    const { context } = stubInvoker();

    await EffectEx.runPromise(
      Effect.gen(function* () {
        const registry = makeRegistry({ initial: [...Operation.serializable([CreateTask]), definition.make()] });
        const { url } = yield* startMcpHost({
          skills: [definition],
          spaceIds: [SPACE],
          context: () => context,
          registry: () => registry,
        });

        const report = yield* Effect.promise(() =>
          McpLatency.probe({
            target: 'local',
            url,
            probes: [
              { tool: 'queryOperations', args: { query: 'task' } },
              { tool: 'invokeOperation', args: { key: KEY, input: { title: 'Ship' }, spaceId: SPACE } },
            ],
            iterations: 2,
            warmup: 1,
          }),
        );

        // Two probes at two timed iterations each, and the warm-up excluded — the shape of the
        // report is the contract; the numbers themselves are whatever the machine gives.
        expect(report.samples.length).to.equal(4);
        expect(report.stats['*'].errors).to.equal(0);
        expect(report.stats.queryOperations.count).to.equal(2);
        // Keyed by the operation, not by the tool: every verb goes through `invokeOperation`, so a
        // row named after the tool would average them into one meaningless figure.
        expect(report.stats[`invokeOperation:${KEY}`].count).to.equal(2);
        expect(report.stats['*'].p95).to.be.at.least(0);
      }).pipe(Effect.scoped),
    );
  });
});
