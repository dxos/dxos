//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { AiService, GenericToolkit, type ModelName } from '@dxos/ai';
import { Feed } from '@dxos/echo';
import { QueueService, TracingService } from '@dxos/functions';
import { Process, ProcessOperationInvoker, StorageService } from '@dxos/functions-runtime';
import { Operation, OperationRegistry } from '@dxos/operation';
import { Message } from '@dxos/types';

import { raise, todo } from '@dxos/debug';
import { trim } from '@dxos/util';
import * as Tool from '@effect/ai/Tool';
import * as Toolkit from '@effect/ai/Toolkit';
import * as Cause from 'effect/Cause';
import * as Duration from 'effect/Duration';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import { AiConversation, type ContextBinding } from '../conversation';
import {
  functionInvocationServiceFromOperations,
  getOperationFromTool,
  makeToolExecutionService,
  makeToolResolverFromOperations,
} from '../functions';
import { acquireReleaseResource } from '@dxos/effect';
import { dbg, log } from '@dxos/log';
import { Match } from 'effect';

interface AgentExecutableOptions {
  feed: Feed.Feed;
  systemPrompt?: string;
  model?: ModelName;
}

/**
 * Hosts a presistant, suspendible AiAgent that can process a number of prompts.
 */
export const makeAgentExecutable = (options: AgentExecutableOptions) =>
  Process.makeExecutable(
    {
      // TODO(dmaretskyi): Expand this. Currently prompts that are fed to the agent.
      input: Schema.String,
      output: Schema.Void,
      services: [
        GenericToolkit.GenericToolkitProvider,
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
        const queue = yield* QueueService.getQueue<Message.Message | ContextBinding>(
          Feed.getQueueDxn(options.feed) ?? raise(new Error('Invalid feed; has it been saved to database?')),
        );
        const conversation = yield* acquireReleaseResource(() => new AiConversation({ queue }));
        let inputQueue: AgentEvent[] = [...(yield* loadEvents)];

        return {
          onSpawn: Effect.fnUntraced(function* () {}),
          onInput: Effect.fnUntraced(function* (prompt: string) {
            inputQueue.push({ _tag: 'prompt', content: prompt });
            yield* storeEvents(inputQueue);
            ctx.setAlarm();
          }),
          onAlarm: Effect.fnUntraced(
            function* () {
              const item = inputQueue.shift();
              if (!item) {
                return;
              }

              const prompt = Match.value(item).pipe(
                Match.tag('prompt', (item) => item.content),
                Match.tag('childExited', (item) => `Process ${item.pid} completed`),
                Match.exhaustive,
              );

              log.info('begin request');
              yield* conversation.createRequest({
                prompt,
                toolkit: AsynchronousExectionToolkit,
                system: options.systemPrompt,
              });
              log.info('end request');
              yield* storeEvents(inputQueue);
              if (inputQueue.length > 0) {
                ctx.setAlarm();
              }
            },
            Effect.orDie,
            Effect.provide(
              Layer.mergeAll(
                toolServices,
                AsynchronousExectionToolkitLayer,
                AiService.model(options.model ?? '@anthropic/claude-opus-4-6'),
              ).pipe(Layer.orDie),
            ),
          ),
          onChildEvent: Effect.fnUntraced(function* (event) {
            log.info('childEvent', { event });
            if (event._tag === 'exited') {
              inputQueue.push({
                _tag: 'prompt',
                content: `Process ${event.pid} exited with result: ${event.result}`,
              });
              yield* storeEvents(inputQueue);
              ctx.setAlarm();
            }
          }),
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

const AgentEvent = Schema.Union(
  Schema.TaggedStruct('prompt', {
    content: Schema.String,
  }),
  Schema.TaggedStruct('childExited', {
    pid: Process.ID,
  }),
);
type AgentEvent = Schema.Schema.Type<typeof AgentEvent>;

const loadEvents = StorageService.get(Schema.parseJson(Schema.Array(AgentEvent)), 'inputQueue').pipe(
  Effect.flatten,
  Effect.catchTag('NoSuchElementException', () => Effect.succeed([] as readonly AgentEvent[])),
);

const storeEvents = (value: AgentEvent[]) =>
  StorageService.set(Schema.parseJson(Schema.Array(AgentEvent)), 'inputQueue', value);

const ToolExecutionService = ({ backgroundThreshold = Duration.seconds(1) }: ToolExecutionServiceOptions = {}) =>
  Layer.unwrapEffect(
    Effect.gen(function* () {
      const operationInvoker = yield* ProcessOperationInvoker.Service;
      return makeToolExecutionService({
        invoke: (tool, input) =>
          Effect.gen(function* () {
            const operationDef = getOperationFromTool(tool).pipe(Option.getOrThrow);
            log('invoking operation', { operationDef, input });
            const fiber = yield* operationInvoker.invokeFiber(operationDef, input);
            log('invoked operation', { operationDef, input, fiber });

            const result = yield* fiber.await.pipe(
              Effect.timeout(backgroundThreshold),
              Effect.catchTag('TimeoutException', () => Effect.succeed(toolIsRunningInBackgroundResponse(fiber.pid))),
            );
            log('result', { result });
            return result;
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
            invoker.attachFiber<unknown>(Process.ID.make(pid)).pipe(
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
            ),
          );
        }),
    };
  }),
);
