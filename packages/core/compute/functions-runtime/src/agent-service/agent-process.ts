//
// Copyright 2026 DXOS.org
//

import * as Tool from '@effect/ai/Tool';
import * as Toolkit from '@effect/ai/Toolkit';
import * as Cause from 'effect/Cause';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Either from 'effect/Either';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as Match from 'effect/Match';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { AiService, OpaqueToolkit, type ModelName } from '@dxos/ai';
import {
  AiSession,
  AgentRequestBegin,
  AgentRequestEnd,
  getOperationFromTool,
  makeToolExecutionService,
  makeToolResolverFromOperations,
} from '@dxos/assistant';
import { Credential, McpServer, Operation, Trace } from '@dxos/compute';
import { Process } from '@dxos/compute';
import { ProcessManager } from '@dxos/compute-runtime';
import * as StorageService from '@dxos/compute/StorageService';
import { Database, Feed, Obj, Registry } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';
import { ContentBlock } from '@dxos/types';
import { trim } from '@dxos/util';

import { type DelegationStrategy } from './delegation-strategy';

interface AgentProcessOptions {
  systemPrompt?: string;
  model?: ModelName;

  /**
   * Provider for space-level MCP server configs, called on each turn.
   */
  getMcpServers?: () => McpServer.McpServer[];

  /**
   * If true, long-running tool calls are moved to the background after `backgroundThreshold`
   * and the agent is notified asynchronously when they complete.
   *
   * Currently unstable — disabled by default.
   *
   * @default false
   */
  enableToolBackgrounding?: boolean;

  /**
   * When provided, the agent acts as a supervisor: after each turn it delegates outstanding work to
   * linked child processes and folds their results back into the conversation on completion. Absent
   * (the default) the process behaves as a plain conversational agent.
   */
  delegationStrategy?: DelegationStrategy;
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
        OpaqueToolkit.OpaqueToolkitProvider,
        Operation.Service,
        Registry.Service,
        StorageService.StorageService,
        Feed.FeedService,
        ProcessManager.ProcessOperationInvoker.Service,
        AiService.AiService,
        // Needed in the fiber's context — `Header.byokLayer`'s per-request callback reads it.
        Credential.CredentialsService,
      ],
    },
    (ctx) =>
      Effect.gen(function* () {
        const feedDxn = ctx.params.target;
        if (feedDxn == null) {
          return yield* Effect.die(new Error('Agent executable requires spawn options.target set to a queue DXN.'));
        }
        const feed = yield* Database.resolve(feedDxn, Feed.Feed).pipe(Effect.orDie);
        const runtime = yield* Effect.runtime<Feed.FeedService>();
        const session = yield* EffectEx.acquireReleaseResource(() => new AiSession.Session({ feed, runtime }));
        let inputQueue: AgentEvent[] = [...(yield* AgentEventsKey.get)];
        const storageService = yield* StorageService.StorageService;
        const toolCallManager = new ToolCallManager(storageService);
        yield* toolCallManager.load();

        // Read time from the ambient Effect Clock so alarm scheduling and the due-check stay
        // consistent (and both honor a TestClock under tests).
        const clock = yield* Effect.clock;
        const alarmManager = new AlarmManager({
          storageService,
          setAlarm: (timeout) => ctx.setAlarm(timeout),
          now: () => clock.unsafeCurrentTimeMillis(),
        });
        yield* alarmManager.load();
        const alarmToolkit = makeAlarmToolkit(alarmManager);
        // Queued tool results were never consumed by onAlarm — reported flags from the synchronous
        // execution path are stale after reload and would cause onAlarm to drop them.
        yield* toolCallManager.reconcileWithInputQueue(inputQueue);

        // Optional supervisor behaviour: when a strategy is provided, the agent reconciles
        // outstanding work into linked child processes after each turn and folds their results back
        // into the conversation on completion. Absent (the default), the process behaves as a plain
        // conversational agent.
        const strategy = Option.fromNullable(options.delegationStrategy);
        let delegations: Delegation[] = [...(yield* DelegationsKey.get)];

        return {
          onInput: Effect.fnUntraced(function* (prompt: string) {
            log('agent onInput received', { promptLength: prompt.length, backlog: inputQueue.length });
            inputQueue.push({ _tag: 'prompt', content: prompt });
            log('agent onInput persisting queue', { depth: inputQueue.length });
            yield* AgentEventsKey.set(inputQueue);
            log('agent onInput persisted', { depth: inputQueue.length });
            alarmManager.reconcile(true);
            log('agent onInput alarm scheduled');
          }),
          onAlarm: Effect.fnUntraced(
            function* () {
              log('agent onAlarm fired', { pending: inputQueue.length });

              // If the agent scheduled a self-wake that has come due, enqueue a wake-up prompt.
              const firedAt = yield* alarmManager.takeFiredAlarm();
              if (firedAt != null) {
                log('agent onAlarm self-wake', { firedAt });
                inputQueue.push({ _tag: 'alarm', firedAt });
                yield* AgentEventsKey.set(inputQueue);
              }

              // Skip reported tool results at head of queue (stale after reload).
              while (inputQueue.length > 0) {
                const head = inputQueue[0];
                if (head._tag === 'tool_result' && toolCallManager.isReported(head.pid)) {
                  inputQueue.shift();
                  log.info('skip tool result that was reported synchronously', { pid: head.pid });
                  continue;
                }
                break;
              }

              const item = inputQueue.shift();
              if (!item) {
                log('agent onAlarm empty queue', {});
                alarmManager.reconcile(false);
                yield* AgentEventsKey.set(inputQueue);
                return;
              }

              log('agent onAlarm handling', { tag: item._tag });

              const prompt: ContentBlock.Any[] = Match.value(item).pipe(
                Match.tag('prompt', (item) => [ContentBlock.Text.make({ text: item.content })]),
                Match.tag('tool_result', (item) =>
                  item.isError
                    ? [
                        ContentBlock.Text.make({
                          text: toolErrorResponse(item.pid, item.result as string),
                          disposition: 'synthetic',
                        }),
                      ]
                    : [
                        ContentBlock.Text.make({
                          text: toolResultResponse(item.pid, item.result),
                          disposition: 'synthetic',
                        }),
                      ],
                ),
                Match.tag('alarm', (item) => [
                  ContentBlock.Text.make({ text: wakeUpPrompt(item.firedAt), disposition: 'synthetic' }),
                ]),
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
                  toolkit: alarmToolkit,
                  system: options.systemPrompt,
                  mcpServers: options.getMcpServers?.(),
                })
                .pipe(
                  Effect.onExit((exit) =>
                    Trace.write(AgentRequestEnd, {
                      status: Exit.isSuccess(exit) ? 'success' : Exit.isInterrupted(exit) ? 'interrupted' : 'error',
                      error: Exit.isFailure(exit) ? Cause.pretty(exit.cause) : undefined,
                    }),
                  ),
                );
              log('end request');
              yield* AgentEventsKey.set(inputQueue);

              // Reconcile outstanding work into linked child processes (supervisor behaviour). The
              // children are linked, so their exits wake `onChildEvent` below.
              if (Option.isSome(strategy)) {
                const activeIds = new Set(delegations.map((delegation) => delegation.id));
                const pending = yield* strategy.value.reconcile(feed, activeIds);
                for (const delegation of pending) {
                  const pid = yield* delegation.spawn;
                  delegations.push({ pid, id: delegation.id });
                  log('delegated work', { pid, id: delegation.id });
                }
                if (pending.length > 0) {
                  yield* DelegationsKey.set(delegations);
                }
              }

              // Reconcile so a pending agent self-wake (or remaining queue work) is rescheduled.
              alarmManager.reconcile(inputQueue.length > 0);
            },
            Effect.orDie,
            Effect.provide(
              Layer.mergeAll(
                makeToolResolverFromOperations(),
                ToolExecutionService({
                  toolCallManager,
                  feed,
                  enableBackgrounding: options.enableToolBackgrounding ?? false,
                }),
                AsynchronousExectionToolkitLayer,
                AiService.model(options.model ?? 'ai.claude.model.claude-opus-4-8'),
              ).pipe(Layer.orDie),
            ),
          ),
          onChildEvent: Effect.fnUntraced(function* (event) {
            log('childEvent', { event });
            if (event._tag === 'exited') {
              // A delegated sub-agent finished: read its result and hand it to the strategy (which
              // updates the work item and notifies the user). Unlike tool results, this does not
              // re-enter the turn — the supervisor folds it in out of band.
              const delegation = delegations.find((delegation) => delegation.pid === event.pid);
              if (delegation) {
                delegations = delegations.filter((other) => other.pid !== event.pid);
                yield* DelegationsKey.set(delegations);
                const operationInvoker = yield* ProcessManager.ProcessOperationInvoker.Service;
                const fiber = yield* operationInvoker.attachFiber(event.pid).pipe(Effect.orDie);
                const exit = yield* fiber.await;
                if (Option.isSome(strategy)) {
                  yield* strategy.value.onComplete(feed, delegation.id, exit);
                }
                log('delegated work completed', { pid: event.pid, id: delegation.id, success: Exit.isSuccess(exit) });
                // alarmManager.reconcile(true);
              } else if (toolCallManager.isToolCall(event.pid)) {
                const operationInvoker = yield* ProcessManager.ProcessOperationInvoker.Service;
                const attachExit = yield* operationInvoker.attachFiber(event.pid).pipe(Effect.exit);
                if (Exit.isFailure(attachExit)) {
                  // Completed tool children are not rehydrated on reload; the result is in inputQueue or was
                  // delivered synchronously before the interrupted turn.
                  if (
                    toolCallManager.isToolCall(event.pid) ||
                    inputQueue.some((item) => item._tag === 'tool_result' && item.pid === event.pid) ||
                    toolCallManager.isReported(event.pid)
                  ) {
                    log.verbose('childEvent skipped (process gone, result already handled)', { pid: event.pid });
                    return;
                  }
                  return yield* Effect.failCause(attachExit.cause).pipe(Effect.orDie);
                }
                const fiber = attachExit.value;
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
                alarmManager.reconcile(true);
                log('agent onChildEvent alarm scheduled', { depth: inputQueue.length });
              } else {
                log.verbose('childEvent ignored non-tool call and not a delegation', { pid: event.pid });
              }
            }
          }),
        };
      }),
  );

interface ToolExecutionServiceOptions {
  /**
   * If true, tool calls that exceed `backgroundThreshold` are detached and the agent is told
   * the call is running in the background. If false, the executor always blocks on the call.
   */
  enableBackgrounding: boolean;

  /**
   * Threshold after which the tool execution is placed in the background.
   * Ignored when `enableBackgrounding` is false.
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
  Schema.TaggedStruct('alarm', {
    firedAt: Schema.Number,
  }),
);
type AgentEvent = Schema.Schema.Type<typeof AgentEvent>;

const AgentEventsKey = StorageService.key(
  Schema.parseJson(Schema.Array(AgentEvent).pipe(Schema.mutable)),
  'inputQueue',
).pipe(StorageService.withDefault(() => []));

/**
 * Tracks delegated sub-agent child processes (pid -> correlation id) so that, after a hibernation,
 * a delegated child's exit can be matched back to the work it was fulfilling.
 */
const Delegation = Schema.Struct({ pid: Process.ID, id: Schema.String }).pipe(Schema.mutable);
type Delegation = Schema.Schema.Type<typeof Delegation>;

const DelegationsKey = StorageService.key(
  Schema.parseJson(Schema.Array(Delegation).pipe(Schema.mutable)),
  'delegations',
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

  /**
   * Clears reported flags for tool calls that still have a pending queue entry.
   * After reload the in-flight createRequest is gone, so those results must be redelivered via onAlarm.
   */
  reconcileWithInputQueue(queue: readonly AgentEvent[]) {
    return Effect.gen(this, function* () {
      let changed = false;
      for (const item of queue) {
        if (item._tag !== 'tool_result') {
          continue;
        }
        const call = this.#state.activeCalls.find((entry) => entry.pid === item.pid);
        if (call?.reported) {
          call.reported = false;
          changed = true;
          log('reconcile queued tool result', { pid: item.pid });
        }
      }
      if (changed) {
        yield* ToolCallStateKey.set(this.#state);
      }
    }).pipe(Effect.provideService(StorageService.StorageService, this.#storageService));
  }
}

//
// Alarms.
//

/**
 * Persisted UNIX timestamp (ms) of the next agent-scheduled self-wake, or `null` when none is set.
 */
const AgentAlarmKey = StorageService.key(Schema.parseJson(Schema.NullOr(Schema.Number)), 'agentAlarm').pipe(
  StorageService.withDefault(() => null),
);

interface ResolveAlarmInput {
  /** Duration from now, e.g. `'30 seconds'`, `'5 minutes'`, `'1 hour'`. */
  in?: string;
  /** Absolute ISO-8601 timestamp, e.g. `'2026-06-04T18:00:00.000Z'`. */
  at?: string;
}

/**
 * Resolves an alarm specification into an absolute UNIX timestamp (ms).
 * Returns a {@link Either.left} with a human-readable message describing invalid input.
 */
export const resolveWakeAt = (input: ResolveAlarmInput, now: number): Either.Either<number, string> => {
  const { in: inDuration, at } = input;
  if (inDuration != null && at != null) {
    return Either.left('Specify either "in" or "at", not both.');
  }
  if (at != null) {
    const timestamp = new Date(at).getTime();
    if (Number.isNaN(timestamp)) {
      return Either.left(`Invalid "at" timestamp: "${at}". Provide an ISO-8601 date-time string.`);
    }
    return Either.right(timestamp);
  }
  if (inDuration != null) {
    let millis: number;
    try {
      // `DurationInput` narrows strings to a `${number} ${unit}` template; the LLM-provided value is an
      // arbitrary string validated at runtime by `Duration.decode` (throws on malformed input).
      millis = Duration.toMillis(Duration.decode(inDuration as Duration.DurationInput));
    } catch {
      return Either.left(`Invalid "in" duration: "${inDuration}". Use a value like "30 seconds" or "5 minutes".`);
    }
    return Either.right(now + millis);
  }
  return Either.left('Specify either "in" (a duration from now) or "at" (an absolute time).');
};

/**
 * Computes the timeout to pass to `ctx.setAlarm`, reconciling pending queue work with the agent's
 * self-wake alarm. Returns `null` when no alarm should be scheduled (process can go idle).
 */
export const computeAlarmDelay = ({
  hasPendingWork,
  wakeAt,
  now,
}: {
  hasPendingWork: boolean;
  wakeAt: number | null;
  now: number;
}): number | null => {
  if (hasPendingWork) {
    return 0;
  }
  if (wakeAt != null) {
    return Math.max(0, wakeAt - now);
  }
  return null;
};

interface AlarmManagerOptions {
  storageService: StorageService.Service;
  setAlarm: (timeout?: number) => void;

  /**
   * Source of the current time. Injectable for deterministic tests.
   * @default () => Date.now()
   */
  now?: () => number;
}

/**
 * Tracks the next agent-scheduled self-wake and keeps it in sync with the process alarm
 * (`ctx.setAlarm`). The agent sets alarms via the {@link AlarmToolkit}; the process reconciles
 * the underlying single-shot alarm timer to fire at the earliest of pending work or the self-wake.
 */
export class AlarmManager {
  readonly #storageService: StorageService.Service;
  readonly #setAlarm: (timeout?: number) => void;
  readonly #now: () => number;
  #wakeAt: number | null = null;

  constructor({ storageService, setAlarm, now = () => Date.now() }: AlarmManagerOptions) {
    this.#storageService = storageService;
    this.#setAlarm = setAlarm;
    this.#now = now;
  }

  /** Currently scheduled self-wake timestamp (ms), or `null` when none is set. */
  get wakeAt(): number | null {
    return this.#wakeAt;
  }

  now(): number {
    return this.#now();
  }

  /** Restores the persisted alarm state. */
  load(): Effect.Effect<void> {
    return Effect.gen(this, function* () {
      this.#wakeAt = yield* AgentAlarmKey.get;
    }).pipe(Effect.provideService(StorageService.StorageService, this.#storageService));
  }

  /** Records a new self-wake target and persists it. */
  setWakeAt(wakeAt: number): Effect.Effect<void> {
    return Effect.gen(this, function* () {
      this.#wakeAt = wakeAt;
      yield* AgentAlarmKey.set(wakeAt);
    }).pipe(Effect.provideService(StorageService.StorageService, this.#storageService));
  }

  /**
   * Clears the self-wake alarm if it is due, returning the timestamp it was scheduled for
   * (or `null` if no alarm was due).
   */
  takeFiredAlarm(): Effect.Effect<number | null> {
    return Effect.gen(this, function* () {
      if (this.#wakeAt == null || this.#now() < this.#wakeAt) {
        return null;
      }
      const firedAt = this.#wakeAt;
      this.#wakeAt = null;
      yield* AgentAlarmKey.set(null);
      return firedAt;
    }).pipe(Effect.provideService(StorageService.StorageService, this.#storageService));
  }

  /**
   * Reconciles the process alarm timer with pending work and the tracked self-wake, scheduling the
   * earliest of the two. Does nothing when there is neither pending work nor a self-wake.
   */
  reconcile(hasPendingWork: boolean): void {
    const delay = computeAlarmDelay({ hasPendingWork, wakeAt: this.#wakeAt, now: this.#now() });
    if (delay != null) {
      this.#setAlarm(delay);
    }
  }
}

/**
 * Prompt delivered to the agent when a self-scheduled alarm fires.
 */
const wakeUpPrompt = (firedAt: number): string => trim`
  Your scheduled alarm fired (it was set for ${new Date(firedAt).toISOString()}).
  Continue with whatever you intended to do when you scheduled this wake-up.
`;

/**
 * Tools that let the agent schedule a self-wake and inspect the current time.
 */
export const AlarmToolkit = Toolkit.make(
  Tool.make('set-alarm', {
    description: trim`
      Schedule an alarm to wake yourself up in the future.
      Provide exactly one of "in" (a duration from now) or "at" (an absolute time).
      When the alarm fires you will receive a prompt and can continue working.
      Setting a new alarm replaces any previously scheduled one.
    `,
    parameters: {
      in: Schema.optional(Schema.String).annotations({
        description: 'Duration from now expressed as "<number> <unit>", e.g. "30 seconds", "5 minutes", "2 hours".',
      }),
      at: Schema.optional(Schema.String).annotations({
        description: 'Absolute ISO-8601 timestamp to wake at, e.g. "2026-06-04T18:00:00.000Z".',
      }),
    },
    success: Schema.String,
  }),
  Tool.make('get-current-date', {
    description: 'Get the current date and time as an ISO-8601 string.',
    // Anthropic requires `input_schema.type: object`; an empty parameter bag encodes as `anyOf` and is rejected.
    parameters: {
      timezone: Schema.optional(Schema.String).annotations({
        description: 'Optional IANA timezone name. Defaults to the process clock when omitted.',
      }),
    },
    success: Schema.String,
  }),
);

/**
 * Builds an opaque toolkit whose handlers drive the given {@link AlarmManager}.
 */
export const makeAlarmToolkit = (alarmManager: AlarmManager): OpaqueToolkit.OpaqueToolkit =>
  OpaqueToolkit.make(
    AlarmToolkit,
    AlarmToolkit.toLayer({
      'set-alarm': ({ in: inDuration, at }) =>
        Effect.gen(function* () {
          const resolved = resolveWakeAt({ in: inDuration, at }, alarmManager.now());
          if (Either.isLeft(resolved)) {
            return resolved.left;
          }
          yield* alarmManager.setWakeAt(resolved.right);
          return `Alarm scheduled to wake you at ${new Date(resolved.right).toISOString()}.`;
        }),
      'get-current-date': () => Effect.sync(() => new Date(alarmManager.now()).toISOString()),
    }),
  );

const ToolExecutionService = ({
  enableBackgrounding,
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
                conversation: Obj.getURI(feed),
              },
              traceMeta: {
                conversationId: feed.id,
              },
            });
            yield* toolCallManager.beginCall(fiber.pid);
            log('invoked operation', { operationDef, input, fiber });

            const awaitWithReport = fiber.await.pipe(Effect.tap(() => toolCallManager.markAsReported(fiber.pid)));
            const result = enableBackgrounding
              ? yield* awaitWithReport.pipe(
                  Effect.timeout(backgroundThreshold),
                  Effect.catchTag('TimeoutException', () =>
                    Effect.succeed(Exit.succeed(toolIsRunningInBackgroundResponse(fiber.pid))),
                  ),
                )
              : yield* awaitWithReport;
            log('result', { result });
            return yield* result;
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
        description: 'Whether to wait for the tool call to complete before returning.',
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
  `Tool is running in the background (id=${pid}); wait for the completion notification to get the result.`;
// `Tool is running in the background (id=${pid}); use ${AsynchronousExectionToolkit.tools['poll-tools'].name} to get the result.`;

const toolResultResponse = (pid: string, value: unknown) => `<result pid=${pid}>${JSON.stringify(value)}</result>`;

const toolErrorResponse = (pid: string, cause: string) => `<error pid=${pid}>${cause}</error>`;
