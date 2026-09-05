//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { AgentRequestBegin, AgentRequestEnd, CompleteBlock } from '@dxos/assistant';
import { type ProcessManager } from '@dxos/compute-runtime';
import * as Process from '@dxos/compute/Process';
import * as Trace from '@dxos/compute/Trace';
import { EntityId } from '@dxos/keys';

/**
 * One simulated operation. Rendered as a child process in the tree and as an `operation.start`/
 * `operation.end` span on the timeline.
 */
export interface SimulatedTool {
  readonly key: string;
  readonly name: string;
  readonly icon?: string;
  readonly durationMs: number;
  /** Nested operations, spawned under this one so the tree exercises more than one level. */
  readonly children?: readonly SimulatedTool[];
  /** Run `children` concurrently, producing parallel lanes on the timeline. */
  readonly concurrent?: boolean;
  /** End with `outcome: 'failure'` and fail the process. */
  readonly fail?: boolean;
}

export interface AgentScenario {
  readonly name: string;
  readonly prompt: string;
  readonly tools: readonly SimulatedTool[];
}

export const agentScenarios: readonly AgentScenario[] = [
  {
    name: 'Create organization',
    prompt: 'Create an organization called "Cyberdyne Systems"',
    tools: [
      { key: 'list-schemas', name: 'List Schemas', icon: 'ph--list--regular', durationMs: 800 },
      {
        key: 'create-object',
        name: 'Create Object',
        icon: 'ph--plus-circle--regular',
        durationMs: 1_600,
        children: [{ key: 'validate', name: 'Validate', icon: 'ph--check--regular', durationMs: 600 }],
      },
    ],
  },
  {
    name: 'Research',
    prompt: 'Search for all organizations and persons',
    tools: [
      { key: 'list-schemas', name: 'List Schemas', icon: 'ph--list--regular', durationMs: 700 },
      {
        key: 'delegate',
        name: 'Delegate Research',
        icon: 'ph--users-three--regular',
        durationMs: 2_400,
        concurrent: true,
        children: [
          { key: 'query', name: 'Query Organizations', icon: 'ph--magnifying-glass--regular', durationMs: 1_800 },
          { key: 'query', name: 'Query Persons', icon: 'ph--magnifying-glass--regular', durationMs: 1_200 },
        ],
      },
      { key: 'summarize', name: 'Summarize', icon: 'ph--article--regular', durationMs: 900 },
    ],
  },
  {
    name: 'Failing run',
    prompt: 'Create a person named "John Connor"',
    tools: [
      { key: 'list-schemas', name: 'List Schemas', icon: 'ph--list--regular', durationMs: 600 },
      { key: 'create-object', name: 'Create Object', icon: 'ph--plus-circle--regular', durationMs: 1_200, fail: true },
    ],
  },
];

const delay = (ms: number) => Effect.promise(() => new Promise<void>((resolve) => setTimeout(resolve, ms)));

/**
 * Write a trace event and yield to the event loop so FeedTraceSink flushes it to ECHO before continuing.
 */
const writeAndFlush = <T>(eventType: Trace.EventType<T>, payload: T) =>
  Effect.gen(function* () {
    yield* Trace.write(eventType, payload);
    yield* delay(100);
  });

//
// Agent.
//

const AgentStep = Schema.Union([
  Schema.Struct({ _tag: Schema.Literal('begin'), prompt: Schema.String }),
  Schema.Struct({ _tag: Schema.Literal('toolCall'), toolCallId: Schema.String, name: Schema.String }),
  Schema.Struct({ _tag: Schema.Literal('toolResult'), toolCallId: Schema.String, name: Schema.String }),
  Schema.Struct({ _tag: Schema.Literal('end'), status: Schema.Literals(['success', 'error']) }),
]);

type AgentStep = Schema.Schema.Type<typeof AgentStep>;

/**
 * Storybook fixture: a {@link Process} standing in for a conversational agent. Each input advances
 * it one step, so the caller can interleave the agent's own trace events with the child operation
 * processes that {@link runScenario} spawns beneath it.
 */
export const SimulatedAgent = Process.make(
  {
    key: 'org.dxos.testing.process.agent',
    input: AgentStep,
    output: Schema.Void,
    services: [Trace.TraceService],
  },
  (ctx) =>
    Effect.gen(function* () {
      // One message id spans the whole turn, so every block groups under a single message.
      const messageId = EntityId.random();

      return {
        onInput: (step: AgentStep) =>
          Effect.gen(function* () {
            switch (step._tag) {
              case 'begin': {
                yield* writeAndFlush(AgentRequestBegin, {});
                yield* writeAndFlush(CompleteBlock, {
                  messageId,
                  role: 'user',
                  block: { _tag: 'text', text: step.prompt },
                });
                break;
              }

              case 'toolCall': {
                yield* writeAndFlush(CompleteBlock, {
                  messageId,
                  role: 'assistant',
                  block: {
                    _tag: 'toolCall',
                    toolCallId: step.toolCallId,
                    name: step.name,
                    input: '{}',
                    providerExecuted: false,
                  },
                });
                break;
              }

              case 'toolResult': {
                yield* writeAndFlush(CompleteBlock, {
                  messageId,
                  role: 'assistant',
                  block: {
                    _tag: 'toolResult',
                    toolCallId: step.toolCallId,
                    name: step.name,
                    providerExecuted: false,
                  },
                });
                break;
              }

              case 'end': {
                yield* writeAndFlush(AgentRequestEnd, { status: step.status });
                if (step.status === 'error') {
                  ctx.fail(new Error('Simulated agent failure'));
                } else {
                  ctx.succeed();
                }
                break;
              }
            }
          }).pipe(Effect.orDie),
        onAlarm: () => Effect.void,
        onChildEvent: () => Effect.void,
      };
    }),
);

//
// Operation.
//

const OperationInput = Schema.Struct({
  key: Schema.String,
  name: Schema.String,
  icon: Schema.optional(Schema.String),
  durationMs: Schema.Number,
  fail: Schema.optional(Schema.Boolean),
});

type OperationInput = Schema.Schema.Type<typeof OperationInput>;

/**
 * Storybook fixture: a {@link Process} that emits the `operation.start`/`operation.end` pair a real
 * operation process emits, with a simulated execution time in between.
 */
export const SimulatedOperation = Process.make(
  {
    key: 'org.dxos.testing.process.operation',
    input: OperationInput,
    output: Schema.Void,
    services: [Trace.TraceService],
  },
  (ctx) =>
    Effect.succeed({
      onInput: ({ key, name, icon, durationMs, fail }: OperationInput) =>
        Effect.gen(function* () {
          yield* writeAndFlush(Trace.OperationStart, { key, name, icon });
          yield* delay(durationMs);
          yield* writeAndFlush(Trace.OperationEnd, {
            key,
            name,
            icon,
            outcome: fail ? 'failure' : 'success',
            error: fail ? `Simulated failure in '${name}'` : undefined,
          });

          if (fail) {
            ctx.fail(new Error(`Simulated failure in '${name}'`));
          } else {
            ctx.succeed();
          }
        }).pipe(Effect.orDie),
      onAlarm: () => Effect.void,
      onChildEvent: () => Effect.void,
    }),
);

//
// Orchestration.
//

/**
 * Spawns one simulated operation (and its children) beneath `parentProcessId`.
 * A process cannot spawn its own children, so the tree is assembled from the caller's side.
 */
const runTool = (
  manager: ProcessManager.Manager,
  tool: SimulatedTool,
  parentProcessId: Process.ID,
  environment: Process.Environment,
): Effect.Effect<void> =>
  Effect.gen(function* () {
    const handle = yield* manager.spawn(SimulatedOperation, { parentProcessId, name: tool.name, environment });
    yield* handle.submitInput({
      key: tool.key,
      name: tool.name,
      icon: tool.icon,
      durationMs: tool.durationMs,
      fail: tool.fail,
    });

    const children = tool.children ?? [];
    if (children.length > 0) {
      const effects = children.map((child) => runTool(manager, child, handle.pid, environment));
      yield* tool.concurrent ? Effect.all(effects, { concurrency: 'unbounded' }) : Effect.all(effects);
    }

    // A failing operation surfaces as a defect, which `Effect.ignore` would not catch; the scenario
    // only needs the trace it wrote, and carries on to close out the agent.
    yield* Effect.exit(handle.runToCompletion());
  }).pipe(Effect.orDie);

/**
 * Runs one {@link agentScenarios} entry end to end: an agent process with a child operation process
 * per tool, so the panel has both a populated process tree and a timeline with nested spans.
 */
export const runScenario = (
  manager: ProcessManager.Manager,
  index: number,
  environment: Process.Environment,
): Effect.Effect<void> =>
  Effect.gen(function* () {
    const scenario = agentScenarios[index % agentScenarios.length];
    const agent = yield* manager.spawn(SimulatedAgent, { name: `Agent (${scenario.name})`, environment });
    yield* agent.submitInput({ _tag: 'begin', prompt: scenario.prompt });

    let failed = false;
    for (const tool of scenario.tools) {
      const toolCallId = EntityId.random();
      yield* agent.submitInput({ _tag: 'toolCall', toolCallId, name: tool.key });
      yield* runTool(manager, tool, agent.pid, environment);
      if (tool.fail) {
        failed = true;
        break;
      }
      yield* agent.submitInput({ _tag: 'toolResult', toolCallId, name: tool.key });
    }

    yield* agent.submitInput({ _tag: 'end', status: failed ? 'error' : 'success' });
  }).pipe(Effect.orDie);
