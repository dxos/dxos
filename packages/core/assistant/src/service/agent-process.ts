//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { AiService, GenericToolkit, type ModelName } from '@dxos/ai';
import { Database, DXN } from '@dxos/echo';
import { QueueService, TracingService } from '@dxos/functions';
import { Process, ProcessManager, StorageService } from '@dxos/functions-runtime';
import { Operation, OperationRegistry } from '@dxos/operation';
import { Message } from '@dxos/types';

import { trim } from '@dxos/util';
import * as Tool from '@effect/ai/Tool';
import * as Toolkit from '@effect/ai/Toolkit';
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
import { log } from '@dxos/log';
import * as Match from 'effect/Match';
import * as Cause from 'effect/Cause';

interface AgentProcessOptions {
  systemPrompt?: string;
  model?: ModelName;
}

/**
 * Hosts a persistent, suspendible AiAgent that can process a number of prompts.
 * The process target is a queue DXN string.
 */
export const AgentProcess = (options: AgentProcessOptions) =>
  Process.make(
    {
      key: 'org.dxos.testing.process.agent',
      input: Schema.String,
      output: Schema.Void,
      services: [
        Database.Service,
        GenericToolkit.GenericToolkitProvider,
        Operation.Service,
        OperationRegistry.Service,
        StorageService.StorageService,
        QueueService,
        ProcessManager.ProcessOperationInvoker.Service,
        AiService.AiService,

        TracingService,
      ],
    },
    (ctx) =>
      Effect.gen(function* () {
        const queueDxnStr = ctx.params.target;
        if (queueDxnStr == null) {
          return yield* Effect.die(new Error('Agent executable requires spawn options.target set to a queue DXN.'));
        }
        const queueDxn = DXN.parse(queueDxnStr);
        const queue = yield* QueueService.getQueue<Message.Message | ContextBinding>(queueDxn);
        const conversation = yield* acquireReleaseResource(() => new AiConversation({ queue }));
        let inputQueue: AgentEvent[] = [...(yield* loadEvents)];

        return {
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
                Match.tag('tool_result', (item) =>
                  item.isError
                    ? toolErrorResponse(item.pid, item.result as string)
                    : toolResultResponse(item.pid, item.result),
                ),
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
              const operationInvoker = yield* ProcessManager.ProcessOperationInvoker.Service;
              const fiber = yield* operationInvoker.attachFiber(event.pid).pipe(Effect.orDie);
              const result = yield* fiber.await.pipe(Effect.orDie).pipe(
                Effect.map(
                  Exit.match({
                    onSuccess: (value): AgentEvent => ({
                      _tag: 'tool_result',
                      pid: event.pid,
                      result: value,
                      isError: false,
                    }),
                    onFailure: (cause): AgentEvent => ({
                      _tag: 'tool_result',
                      pid: event.pid,
                      result: Cause.pretty(cause),
                      isError: true,
                    }),
                  }),
                ),
              );
              inputQueue.push(result);
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
  Schema.TaggedStruct('tool_result', {
    pid: Process.ID,
    result: Schema.Unknown,
    isError: Schema.Boolean,
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
      const operationInvoker = yield* ProcessManager.ProcessOperationInvoker.Service;
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
    const invoker = yield* ProcessManager.ProcessOperationInvoker.Service;
    return {
      'poll-tools': ({ ids, wait, timeout = 10_000 }) =>
        Effect.gen(function* () {
          return yield* Effect.forEach(ids, (pid) =>
            invoker.attachFiber<unknown>(Process.ID.make(pid)).pipe(
              Effect.flatMap((_) => _.await),
              Effect.timeout(Duration.millis(timeout)),
              Effect.flatMap(
                Exit.match({
                  onSuccess: (value) => Effect.succeed(toolResultResponse(pid, value)),
                  onFailure: (cause) => Effect.succeed(toolErrorResponse(pid, Cause.pretty(cause))),
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

/**
 * Instructs model that the tool is running in the background.
 */
const toolIsRunningInBackgroundResponse = (pid: Process.ID) =>
  `Tool is running in the background id=${pid}; use ${AsynchronousExectionToolkit.tools['poll-tools'].name} to get the result.`;

const toolResultResponse = (pid: string, value: unknown) => `<result pid=${pid}>${JSON.stringify(value)}</result>`;

const toolErrorResponse = (pid: string, cause: string) => `<error pid=${pid}>${cause}</error>`;
