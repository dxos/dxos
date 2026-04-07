//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { AiService, GenericToolkit, type ModelName } from '@dxos/ai';
import { Database, DXN, Feed, Obj } from '@dxos/echo';
import { TracingService } from '@dxos/functions';
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

export const AGENT_PROCESS_KEY = 'org.dxos.testing.process.agent';

/**
 * Hosts a persistent, suspendible AiAgent that can process a number of prompts.
 * The process target is a queue DXN string.
 */
export const AgentProcess = (options: AgentProcessOptions) =>
  Process.make(
    {
      key: AGENT_PROCESS_KEY,
      input: Schema.String,
      output: Schema.Void,
      services: [
        Database.Service,
        GenericToolkit.GenericToolkitProvider,
        Operation.Service,
        OperationRegistry.Service,
        StorageService.StorageService,
        Feed.FeedService,
        ProcessManager.ProcessOperationInvoker.Service,
        AiService.AiService,
        // @deprecated Required by AiSessionRunRequirements for backward compat with tool handlers.
        TracingService,
      ],
    },
    (ctx) =>
      Effect.gen(function* () {
        const feedDxn = ctx.params.target;
        if (feedDxn == null) {
          return yield* Effect.die(new Error('Agent executable requires spawn options.target set to a queue DXN.'));
        }
        const feed = yield* Database.resolve(DXN.parse(feedDxn), Feed.Feed).pipe(Effect.orDie);
        const feedRuntime = yield* Effect.runtime<Feed.FeedService>();
        const conversation = yield* acquireReleaseResource(() => new AiConversation({ feed, feedRuntime }));
        let inputQueue: AgentEvent[] = [...(yield* AgentEventsKey.get)];
        const storageService = yield* StorageService.StorageService;
        const toolCallManager = new ToolCallManager(storageService);
        yield* toolCallManager.load();

        return {
          onInput: Effect.fnUntraced(function* (prompt: string) {
            log('agent onInput received', { promptLength: prompt.length, backlog: inputQueue.length });
            inputQueue.push({ _tag: 'prompt', content: prompt });
            log('agent onInput persisting queue', { depth: inputQueue.length });
            yield* AgentEventsKey.set(inputQueue);
            log('agent onInput persisted', { depth: inputQueue.length });
            ctx.setAlarm();
            log('agent onInput alarm scheduled');
          }),
          onAlarm: Effect.fnUntraced(
            function* () {
              log('agent onAlarm fired', { pending: inputQueue.length });
              const item = inputQueue.shift();
              if (!item) {
                log('agent onAlarm empty queue', {});
                return;
              }

              if (item._tag === 'tool_result' && toolCallManager.isReported(item.pid)) {
                log.info('skip tool result that was reported synchronously', { pid: item.pid });
                // Ignore tool results that were reported synchronously.
                return;
              }

              log('agent onAlarm handling', { tag: item._tag });

              const prompt = Match.value(item).pipe(
                Match.tag('prompt', (item) => item.content),
                Match.tag('tool_result', (item) =>
                  item.isError
                    ? toolErrorResponse(item.pid, item.result as string)
                    : toolResultResponse(item.pid, item.result),
                ),
                Match.exhaustive,
              );

              log('begin request', { prompt });
              yield* conversation.createRequest({
                prompt,
                // TODO(dmaretskyi): Polling currently broken, agent relies on completion notifications being delivered.
                // toolkit: AsynchronousExectionToolkit,
                system: options.systemPrompt,
              });
              log('end request');
              yield* AgentEventsKey.set(inputQueue);
              if (inputQueue.length > 0) {
                ctx.setAlarm();
              }
            },
            Effect.orDie,
            Effect.provide(
              Layer.mergeAll(
                makeToolResolverFromOperations(),
                ToolExecutionService({
                  toolCallManager,
                  feed,
                }),
                functionInvocationServiceFromOperations,
                AsynchronousExectionToolkitLayer,
                AiService.model(options.model ?? '@anthropic/claude-opus-4-6'),
              ).pipe(Layer.orDie),
            ),
          ),
          onChildEvent: Effect.fnUntraced(function* (event) {
            log.info('childEvent', { event });
            if (event._tag === 'exited') {
              if (!toolCallManager.isToolCall(event.pid)) {
                log.verbose('childEvent ignored non-tool call', { pid: event.pid });
                return;
              }

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
              log('agent onChildEvent persisted tool result', { depth: inputQueue.length, childPid: event.pid });
              yield* AgentEventsKey.set(inputQueue);
              ctx.setAlarm();
              log('agent onChildEvent alarm scheduled', { depth: inputQueue.length });
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

  toolCallManager: ToolCallManager;
  feed: Feed.Feed;
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

const AgentEventsKey = StorageService.key(
  Schema.parseJson(Schema.Array(AgentEvent).pipe(Schema.mutable)),
  'inputQueue',
).pipe(StorageService.withDefault(() => []));

const ToolCallState = Schema.Struct({
  activeCalls: Schema.Array(
    Schema.Struct({
      pid: Process.ID,
      // Whether the result was reported to the agent.
      reported: Schema.Boolean,
    }).pipe(Schema.mutable),
  ).pipe(Schema.mutable),
});
interface ToolCallState extends Schema.Schema.Type<typeof ToolCallState> {}

// Id's of processes who's results were already submitted to the agent.
const ToolCallStateKey = StorageService.key(Schema.parseJson(ToolCallState.pipe(Schema.mutable)), 'toolCallState').pipe(
  StorageService.withDefault(() => ({ activeCalls: [] })),
);

class ToolCallManager {
  #storageService: StorageService.Service;
  #state: ToolCallState = { activeCalls: [] };

  constructor(storageService: StorageService.Service) {
    this.#storageService = storageService;
  }

  load() {
    return Effect.gen(this, function* () {
      this.#state = yield* ToolCallStateKey.get;
    }).pipe(Effect.provideService(StorageService.StorageService, this.#storageService));
  }

  beginCall(pid: Process.ID) {
    return Effect.gen(this, function* () {
      this.#state.activeCalls.push({ pid, reported: false });
      yield* ToolCallStateKey.set(this.#state);
    }).pipe(Effect.provideService(StorageService.StorageService, this.#storageService));
  }

  markAsReported(pid: Process.ID) {
    return Effect.gen(this, function* () {
      const call = this.#state.activeCalls.find((call) => call.pid === pid);
      if (!call) {
        return;
      }
      call.reported = true;
      yield* ToolCallStateKey.set(this.#state);
    }).pipe(Effect.provideService(StorageService.StorageService, this.#storageService));
  }

  isToolCall(pid: Process.ID): boolean {
    return this.#state.activeCalls.some((call) => call.pid === pid);
  }

  isReported(pid: Process.ID) {
    return this.#state.activeCalls.some((call) => call.pid === pid && call.reported);
  }
}

const ToolExecutionService = ({
  backgroundThreshold = Duration.seconds(1),
  toolCallManager,
  feed,
}: ToolExecutionServiceOptions) =>
  Layer.unwrapEffect(
    Effect.gen(function* () {
      const operationInvoker = yield* ProcessManager.ProcessOperationInvoker.Service;
      return makeToolExecutionService({
        invoke: (tool, input) =>
          Effect.gen(function* () {
            const operationDef = getOperationFromTool(tool).pipe(Option.getOrThrow);
            log('invoking operation', { operationDef, input });
            const fiber = yield* operationInvoker.invokeFiber(operationDef, input, {
              environment: {
                conversation: Obj.getDXN(feed).toString(),
              },
            });
            toolCallManager.beginCall(fiber.pid);
            log('invoked operation', { operationDef, input, fiber });

            const result = yield* fiber.await.pipe(
              Effect.tap(() => toolCallManager.markAsReported(fiber.pid)),
              Effect.timeout(backgroundThreshold),
              Effect.catchTag('TimeoutException', () => Effect.succeed(toolIsRunningInBackgroundResponse(fiber.pid))),
            );
            log('result', { result });
            return result;
          }),
      });
    }),
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

// TODO(dmaretskyi): Currently broken: polling a completed process returns interruped error.
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
  `Tool is running in the background id=${pid}; wait for the completion notification to get the result.`;
// `Tool is running in the background id=${pid}; use ${AsynchronousExectionToolkit.tools['poll-tools'].name} to get the result.`;

const toolResultResponse = (pid: string, value: unknown) => `<result pid=${pid}>${JSON.stringify(value)}</result>`;

const toolErrorResponse = (pid: string, cause: string) => `<error pid=${pid}>${cause}</error>`;
