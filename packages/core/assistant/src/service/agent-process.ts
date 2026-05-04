//
// Copyright 2026 DXOS.org
//

import * as Tool from '@effect/ai/Tool';
import * as Toolkit from '@effect/ai/Toolkit';
import * as Array from 'effect/Array';
import * as Cause from 'effect/Cause';
import * as Deferred from 'effect/Deferred';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Function from 'effect/Function';
import * as Layer from 'effect/Layer';
import * as Match from 'effect/Match';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { AiService, OpaqueToolkit, type ModelName } from '@dxos/ai';
import { Routine, Template } from '@dxos/compute';
import { Trace } from '@dxos/compute';
import { Operation, OperationRegistry } from '@dxos/compute';
import { Database, DXN, Feed, Obj, Ref } from '@dxos/echo';
import { acquireReleaseResource } from '@dxos/effect';
import { Process, ProcessManager, StorageService } from '@dxos/functions-runtime';
import { log } from '@dxos/log';
import { trim } from '@dxos/util';

import { type McpServerConfig, AiSession } from '../conversation';
import { RoutineError } from '../errors';
import { getOperationFromTool, makeToolExecutionService, makeToolResolverFromOperations } from '../functions';
import { AgentRequestBegin, AgentRequestEnd } from '../tracing';

interface AgentProcessOptions {
  systemPrompt?: string;
  model?: ModelName;

  /**
   * Provider for space-level MCP server configs, called on each turn.
   */
  getMcpServers?: () => McpServerConfig[];
}

export const AGENT_PROCESS_KEY = 'org.dxos.testing.process.agent';

export const RoutineRunInput = Schema.Struct({
  routineDxn: Schema.String,
  feedDxn: Schema.String,
  input: Schema.optional(Schema.Any),
  systemInstructions: Schema.optional(Schema.String),
  model: Schema.optional(Schema.String),
});
export type RoutineRunInput = Schema.Schema.Type<typeof RoutineRunInput>;

const RoutineRunOutput = Schema.Union(
  Schema.TaggedStruct('success', { value: Schema.Any }),
  Schema.TaggedStruct('failure', {
    message: Schema.String,
    description: Schema.optional(Schema.String),
  }),
);
export type RoutineRunOutput = Schema.Schema.Type<typeof RoutineRunOutput>;

/**
 * Hosts a persistent, suspendible AiAgent that can process a number of prompts.
 * Also handles one-shot routine execution when the input is a JSON-encoded {@link RoutineRunInput}.
 * The process target is a queue DXN string.
 */
export const AgentProcess = (options: AgentProcessOptions) =>
  Process.make(
    {
      key: AGENT_PROCESS_KEY,
      input: Schema.String,
      output: RoutineRunOutput,
      services: [
        Database.Service,
        OpaqueToolkit.OpaqueToolkitProvider,
        Operation.Service,
        OperationRegistry.Service,
        StorageService.StorageService,
        Feed.FeedService,
        ProcessManager.ProcessOperationInvoker.Service,
        AiService.AiService,
      ],
    },
    (ctx) =>
      Effect.gen(function* () {
        const feedDxn = ctx.params.target;
        if (feedDxn == null) {
          return yield* Effect.die(new Error('Agent executable requires spawn options.target set to a queue DXN.'));
        }
        const feed = yield* Database.resolve(DXN.parse(feedDxn), Feed.Feed).pipe(Effect.orDie);
        const runtime = yield* Effect.runtime<Feed.FeedService>();
        const session = yield* acquireReleaseResource(() => new AiSession({ feed, runtime }));
        let inputQueue: AgentEvent[] = [...(yield* AgentEventsKey.get)];
        const storageService = yield* StorageService.StorageService;
        const toolCallManager = new ToolCallManager(storageService);
        yield* toolCallManager.load();

        return {
          onInput: Effect.fnUntraced(function* (input: string) {
            // Detect routine mode: try to decode as RoutineRunInput.
            const routineInput = yield* Schema.decodeUnknown(Schema.parseJson(RoutineRunInput))(input).pipe(
              Effect.option,
            );
            if (Option.isSome(routineInput)) {
              yield* runRoutineInput(ctx, session, feed, routineInput.value, options);
              return;
            }

            // Agent mode: queue prompt for alarm-driven processing.
            log('agent onInput received', { promptLength: input.length, backlog: inputQueue.length });
            inputQueue.push({ _tag: 'prompt', content: input });
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
              log('trace agent request begin');
              yield* Trace.write(AgentRequestBegin, {});
              yield* session
                .createRequest({
                  prompt,
                  // TODO(dmaretskyi): Polling currently broken, agent relies on completion notifications being delivered.
                  // toolkit: AsynchronousExectionToolkit,
                  system: options.systemPrompt,
                  mcpServers: options.getMcpServers?.(),
                })
                .pipe(Effect.ensuring(Trace.write(AgentRequestEnd, {})));
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
                AsynchronousExectionToolkitLayer,
                AiService.model(options.model ?? '@anthropic/claude-opus-4-6'),
              ).pipe(Layer.orDie),
            ),
          ),
          onChildEvent: Effect.fnUntraced(function* (event) {
            log('childEvent', { event });
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

//
// Routine execution.
//

type RoutineCtx = Process.ProcessContext<string, RoutineRunOutput>;

const runRoutineInput = (
  ctx: RoutineCtx,
  session: AiSession,
  feed: Feed.Feed,
  runInput: RoutineRunInput,
  options: AgentProcessOptions,
) => {
  const run = Effect.gen(function* () {
    log.info('routine input: received', { routineDxn: runInput.routineDxn });

    const routine = yield* Database.resolve(DXN.parse(runInput.routineDxn), Routine.Routine).pipe(
      Effect.mapError((err) => new RoutineError('Failed to resolve routine.', { description: String(err) })),
    );

    const blueprintResults = yield* Effect.forEach(routine.blueprints, Database.loadOption);
    const blueprints = blueprintResults.flatMap((opt, i) => {
      if (Option.isNone(opt)) {
        log.warn('routine: blueprint not found, skipping', {
          routineDxn: runInput.routineDxn,
          ref: routine.blueprints[i],
        });
        return [];
      }
      return [opt.value];
    });

    const objectResults = yield* Effect.forEach(routine.context, Database.loadOption);
    const objects = objectResults.flatMap((opt, i) => {
      if (Option.isNone(opt)) {
        log.warn('routine: context object not found, skipping', {
          routineDxn: runInput.routineDxn,
          ref: routine.context[i],
        });
        return [];
      }
      return [opt.value];
    });

    const promptInstructions = yield* Database.load(routine.instructions.source).pipe(
      Effect.mapError((err) => new RoutineError('Failed to load routine instructions.', { description: String(err) })),
    );
    let promptText = Template.process(promptInstructions.content, runInput.input);
    if (runInput.input !== undefined) {
      promptText += `\n<input>${JSON.stringify(runInput.input)}</input>`;
    }

    let systemText = trim`
      You are an agent running in the non-interactive mode.
      The user is unable to see what you are doing, and cannot answer any questions.
      Do not ask questions.
      Complete the task before you, and at the end call [completeJob] with the output.
      If you are unable to complete the task, call [completeJob] with the failure reason.
      If no output is required, call [completeJob] with an empty object: {}
      Do not stop until you call [completeJob].
    `;
    if (runInput.systemInstructions) {
      systemText += `\n\n${runInput.systemInstructions}`;
    }

    const modelLayer = AiService.model((runInput.model as ModelName) ?? '@anthropic/claude-opus-4-6');

    yield* Effect.promise(() =>
      session.context.bind({
        blueprints: blueprints.map((blueprint) => Ref.make(blueprint)),
        objects: objects.map((object) => Ref.make(object as Obj.Unknown)),
      }),
    );

    const resultSink = yield* Deferred.make<unknown, RoutineError>();
    const completeJobToolkit = makeCompleteJobToolkit({ resultSink });

    const runRequest = (prompt: string) =>
      session
        .createRequest({
          prompt,
          system: systemText,
          toolkit: completeJobToolkit,
          mcpServers: options.getMcpServers?.(),
        })
        .pipe(
          Effect.provide(
            Layer.mergeAll(modelLayer, RoutineToolExecutionService({ feed }), makeToolResolverFromOperations()),
          ),
        );

    yield* runRequest(promptText);

    const pollResult = yield* Deferred.poll(resultSink);

    if (Option.isNone(pollResult)) {
      yield* runRequest('You must signal task completion by calling [completeJob] with the output or failure reason.');
      const retryResult = yield* Deferred.poll(resultSink);
      if (Option.isNone(retryResult)) {
        ctx.submitOutput({ _tag: 'failure', message: 'Agent did not signal task completion.' });
        ctx.succeed();
        return;
      }
      yield* emitRoutineResult(ctx, retryResult.value);
      return;
    }

    yield* emitRoutineResult(ctx, pollResult.value);
  });

  return run.pipe(
    Effect.mapError((err) => (err instanceof RoutineError ? err : new RoutineError(String(err)))),
    Effect.catchAll((err) => emitRoutineResult(ctx, Effect.fail(err))),
    Effect.catchAllCause((cause) =>
      emitRoutineResult(
        ctx,
        Effect.fail(new RoutineError('Routine process failed.', { description: Cause.pretty(cause) })),
      ),
    ),
    Effect.scoped,
  );
};

const emitRoutineResult = (
  ctx: RoutineCtx,
  resultEffect: Effect.Effect<unknown, RoutineError, never>,
): Effect.Effect<void> =>
  resultEffect.pipe(
    Effect.matchEffect({
      onFailure: (err) =>
        Effect.sync(() => {
          ctx.submitOutput({
            _tag: 'failure',
            message: err.message,
            description: err.context?.description as string | undefined,
          });
          ctx.succeed();
        }),
      onSuccess: (value) =>
        Effect.sync(() => {
          ctx.submitOutput({ _tag: 'success', value });
          ctx.succeed();
        }),
    }),
  );

const makeCompleteJobToolkit = (options: { resultSink: Deferred.Deferred<unknown, RoutineError> }) => {
  class CompleteJobToolkit extends Toolkit.make(
    Tool.make('completeJob', {
      parameters: {
        success: Schema.optional(Schema.Any),
        failure: Schema.optional(
          Schema.Struct({
            message: Schema.String.annotations({ description: 'Short message describing the error.' }),
            description: Schema.optional(Schema.String).annotations({
              description: 'Optional longer message describing in detail what went wrong',
            }),
          }),
        ),
      },
    }),
  ) {}

  const layer = CompleteJobToolkit.toLayer({
    completeJob: Effect.fnUntraced(function* (result) {
      if (result.failure) {
        yield* Deferred.fail(
          options.resultSink,
          new RoutineError(result.failure.message, { description: result.failure.description }),
        );
      } else {
        yield* Deferred.succeed(options.resultSink, result.success);
      }
    }),
  });

  return OpaqueToolkit.make(CompleteJobToolkit, layer);
};

interface RoutineToolExecutionOptions {
  feed: Feed.Feed;
}

const RoutineToolExecutionService = ({ feed }: RoutineToolExecutionOptions) =>
  Layer.unwrapEffect(
    Effect.gen(function* () {
      const operationInvoker = yield* Operation.Service;
      return makeToolExecutionService({
        invoke: (tool, input) =>
          Effect.gen(function* () {
            const operationDef = getOperationFromTool(tool).pipe(Option.getOrThrow);
            log('invoking operation', { operationDef, input });
            const result = yield* operationInvoker
              .invoke(operationDef, input, {
                conversation: Obj.getDXN(feed).toString(),
              })
              .pipe(Effect.orDie);
            log('result', { result });
            return result;
          }),
      });
    }),
  );

//
// Agent-mode helpers.
//

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
              traceMeta: {
                conversationId: feed.id,
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
