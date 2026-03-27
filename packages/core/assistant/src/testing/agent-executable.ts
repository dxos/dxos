//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { AiService, GenericToolkit } from '@dxos/ai';
import { QueueService, TracingService } from '@dxos/functions';
import { Process, ProcessOperationInvoker, StorageService } from '@dxos/functions-runtime';
import { Operation, OperationRegistry } from '@dxos/operation';
import { Feed } from '@dxos/echo';
import { Message } from '@dxos/types';

import * as Layer from 'effect/Layer';
import {
  functionInvocationServiceFromOperations,
  getOperationFromTool,
  makeToolExecutionService,
  makeToolResolverFromOperations,
} from '../functions';
import { AiConversation, type ContextBinding } from '../conversation';
import * as Option from 'effect/Option';
import * as Duration from 'effect/Duration';
import * as Toolkit from '@effect/ai/Toolkit';
import * as Tool from '@effect/ai/Tool';
import { trim } from '@dxos/util';
import { todo } from '@dxos/debug';
import * as Exit from 'effect/Exit';
import * as Cause from 'effect/Cause';

interface AgentExecutableOptions {
  feed: Feed.Feed;
}

/**
 * Hosts a presistant, suspendible AiAgent that can process a number of prompts.
 */
export const makeAgentExecutable = (options: AgentExecutableOptions) =>
  Process.makeExecutable(
    {
      input: Schema.String,
      output: Schema.Void,
      services: [
        GenericToolkit.Provider,
        Operation.Service,
        OperationRegistry.Service,
        StorageService.StorageService,
        QueueService,
        ProcessOperationInvoker.Service,
        AiService.AiService,

        TracingService,
      ],
    },
    (ctx) =>
      Effect.gen(function* () {
        const queue = yield* QueueService.getQueue<Message.Message | ContextBinding>(Feed.getQueueDxn(options.feed)!);
        const conversation = new AiConversation({ queue });

        return {
          init: () => Effect.void,
          handleInput: (prompt: string) =>
            Effect.gen(function* () {
              yield* conversation
                .createRequest({
                  prompt,
                  toolkit: AsynchronousExectionToolkit,
                })
                .pipe(Effect.orDie);
            }).pipe(
              Effect.provide(
                Layer.mergeAll(
                  toolServices,
                  AsynchronousExectionToolkitLayer,
                  AiService.model('@anthropic/claude-opus-4-6'),
                ).pipe(Layer.orDie),
              ),
            ),
          alarm: () => Effect.void,
          childEvent: () => Effect.void,
        };
      }),
  );
interface ToolExecutionServiceOptions {
  /**
   * Threshold after which the tool execution is placed in the background.
   */
  // TODO(dmaretskyi): Tool annotation to never run in background.
  backgroundThreshold?: Duration.Duration;
}

const ToolExecutionService = ({ backgroundThreshold = Duration.seconds(1) }: ToolExecutionServiceOptions = {}) =>
  Layer.unwrapEffect(
    Effect.gen(function* () {
      const operationInvoker = yield* ProcessOperationInvoker.Service;
      return makeToolExecutionService({
        invoke: (tool, input) =>
          Effect.gen(function* () {
            const operationDef = getOperationFromTool(tool).pipe(Option.getOrThrow);
            const fiber = yield* operationInvoker.invokeFiber(operationDef, input);

            return yield* fiber.await.pipe(
              Effect.timeout(backgroundThreshold),
              Effect.catchTag('TimeoutException', () => Effect.succeed(toolIsRunningInBackgroundResponse(fiber.pid))),
            );
          }),
      });
    }),
  );

/**
 * Instructs model that the tool is running in the background.
 */
const toolIsRunningInBackgroundResponse = (pid: Process.ID) =>
  `Tool is running in the background id=${pid}; use ${AsynchronousExectionToolkit.tools['poll-tools'].name} to get the result.`;

// Services to brige tool execution to runtime.
const toolServices = Layer.mergeAll(
  makeToolResolverFromOperations(),
  ToolExecutionService(),
  functionInvocationServiceFromOperations,
);

class AsynchronousExectionToolkit extends Toolkit.make(
  Tool.make('poll-tools', {
    description: trim`
      Poll tool calls running in the background.
      Set wait to true to wait for the tool call to complete before returning.
      Only set wait to true if you dont have other tasks to perform in parallel.
      Set an appropriate timeout to avoid waiting forever.
      You will also be notified about the job completion separatelly, so you do not always need to inspect the job if you dont need the result right now.
    `,
    parameters: {
      ids: Schema.Array(Schema.String).annotations({
        description: 'The IDs of the jobs to inspect.',
      }),
      wait: Schema.optional(Schema.Boolean).annotations({
        description: 'Whether to wait for the job to complete before returning.',
        default: false,
      }),
      timeout: Schema.optional(Schema.Number).annotations({
        description:
          'Maximum time to wait for the job to complete. If the job does not complete within the timeout, the current state is returned.',
        default: 10_000,
      }),
    },
  }),
) {}

const AsynchronousExectionToolkitLayer = AsynchronousExectionToolkit.toLayer(
  Effect.gen(function* () {
    const invoker = yield* ProcessOperationInvoker.Service;
    return {
      'poll-tools': ({ ids, wait, timeout = 10_000 }) =>
        Effect.gen(function* () {
          return yield* Effect.forEach(ids, (pid) =>
            Effect.gen(function* () {
              const x = invoker.attachFiber<unknown>(Process.ID.make(pid)).pipe(
                Effect.flatMap((_) => _.await),
                Effect.timeout(Duration.millis(timeout)),
                Effect.flatMap(
                  Exit.match({
                    onSuccess: (value) => Effect.succeed(`<result pid=${pid}>${JSON.stringify(value)}</result>`),
                    onFailure: (cause) => Effect.succeed(`<error pid=${pid}>${Cause.pretty(cause)}</error>`),
                  }),
                ),
                Effect.catchTag('ProcessNotFoundError', () => Effect.succeed(`Process not found: ${pid}`)),
                Effect.catchTag('TimeoutException', () => Effect.succeed(`Process still running: ${pid}`)),
              );
              return todo() as any;
            }),
          );
        }),
    };
  }),
);
