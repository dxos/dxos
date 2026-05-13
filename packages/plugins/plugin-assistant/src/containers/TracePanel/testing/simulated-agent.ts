//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { AgentRequestBegin, AgentRequestEnd, CompleteBlock } from '@dxos/assistant';
import { Process, Trace } from '@dxos/compute';
import { ObjectId } from '@dxos/keys';

export interface AgentScenario {
  readonly prompt: string;
  readonly tools: readonly string[];
}

/** Probability that any given run aborts with a simulated tool failure. */
const FAILURE_PROBABILITY = 0.1;

export const agentScenarios: readonly AgentScenario[] = [
  {
    prompt: 'Create an organization called "Cyberdyne Systems"',
    tools: ['list-schemas', 'create-object'],
  },
  {
    prompt: 'Search for all organizations and persons',
    tools: ['list-schemas', 'query', 'query'],
  },
  {
    prompt: 'Create a person named "John Connor"',
    tools: ['create-object'],
  },
];

const delay = (ms: number) => Effect.promise(() => new Promise<void>((resolve) => setTimeout(resolve, ms)));

/**
 * Write a trace event and yield to the event loop so FeedTraceSink flushes it to ECHO before continuing.
 */
const writeAndFlush = <T>(eventType: Trace.EventType<T>, payload: T) =>
  Effect.gen(function* () {
    yield* Trace.write(eventType, payload);
    yield* Effect.promise(() => new Promise((resolve) => setTimeout(resolve, 100)));
  });

/**
 * Storybook fixture: a {@link Process} that emits a deterministic stream of agent trace events
 * (request begin/end, user message, sequential tool calls with simulated latency).
 *
 * Input is a scenario index into {@link agentScenarios} (modulo the array length).
 */
export const SimulatedAgent = Process.make(
  {
    key: 'org.dxos.testing.process.agent',
    input: Schema.Number,
    output: Schema.Void,
    services: [Trace.TraceService],
  },
  (ctx) =>
    Effect.succeed({
      onInput: (index: number) =>
        Effect.gen(function* () {
          const messageId = ObjectId.random();
          const scenario = agentScenarios[index % agentScenarios.length];

          // Decide upfront whether this run will fail (and at which tool) so the trace shows a partial sequence.
          const failAtToolIndex =
            Math.random() < FAILURE_PROBABILITY ? Math.floor(Math.random() * scenario.tools.length) : -1;

          // Agent begins processing.
          yield* writeAndFlush(AgentRequestBegin, {});

          // User message.
          yield* writeAndFlush(CompleteBlock, {
            messageId,
            role: 'user',
            block: { _tag: 'text', text: scenario.prompt },
          });

          // Simulate tool calls sequentially with delays.
          for (const [index, toolName] of scenario.tools.entries()) {
            const toolCallId = ObjectId.random();

            // Tool call event.
            yield* writeAndFlush(CompleteBlock, {
              messageId,
              role: 'assistant',
              block: { _tag: 'toolCall', toolCallId, name: toolName, input: '{}', providerExecuted: false },
            });

            // Simulate tool execution time.
            yield* delay(1_000 + Math.random() * 3_000);

            if (index === failAtToolIndex) {
              ctx.fail(new Error(`Simulated failure in tool '${toolName}'`));
              return;
            }

            // Tool result event.
            yield* writeAndFlush(CompleteBlock, {
              messageId,
              role: 'assistant',
              block: { _tag: 'toolResult', toolCallId, name: toolName, providerExecuted: false },
            });
          }

          // Agent completes.
          yield* writeAndFlush(AgentRequestEnd, {});
          ctx.succeed();
        }).pipe(Effect.orDie),
      onAlarm: () => Effect.void,
      onChildEvent: () => Effect.void,
    }),
);
