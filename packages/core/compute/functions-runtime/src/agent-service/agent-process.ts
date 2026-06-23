//
// Copyright 2026 DXOS.org
//

import * as Tool from '@effect/ai/Tool';
import * as Toolkit from '@effect/ai/Toolkit';
import * as Cause from 'effect/Cause';
import * as DateTime from 'effect/DateTime';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
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
  HarnessControl,
  getOperationFromTool,
  makeToolExecutionService,
  makeToolResolverFromOperations,
} from '@dxos/assistant';
import { Credential, McpServer, Operation, Trace } from '@dxos/compute';
import { Process } from '@dxos/compute';
import { ProcessManager } from '@dxos/compute-runtime';
import * as StorageService from '@dxos/compute/StorageService';
import { Annotation, Database, Feed, Obj, Registry } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';
import { Message, ContentBlock } from '@dxos/types';
import { trim } from '@dxos/util';

import { type CompletionGuard } from './completion-guard';
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

  /**
   * When provided, inspects agent-attached plan state before `ctx.succeed()` and may run an ephemeral
   * stop/continue check when open tasks remain.
   */
  completionGuard?: CompletionGuard;
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
        ProcessManager.ProcessOperationInvoker.Service,
        AiService.AiService,
        // Needed in the fiber's context — `Header.byokLayer`'s per-request callback reads it.
        Credential.CredentialsService,
      ],
      rpcs: HarnessControl,
    },
    (ctx) =>
      Effect.gen(function* () {
        const feedDxn = Annotation.getDictionary(ctx.params.annotations, Process.TargetAnnotation).pipe(
          Option.getOrUndefined,
        );
        if (feedDxn == null) {
          return yield* Effect.die(new Error('Agent executable requires spawn options.target set to a queue DXN.'));
        }
        const feed = yield* Database.resolve(feedDxn, Feed.Feed).pipe(Effect.orDie);
        const runtime = yield* Effect.runtime<Database.Service>();
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
        // Queued tool results were never consumed by onAlarm — reported flags from the synchronous
        // execution path are stale after reload and would cause onAlarm to drop them.
        yield* toolCallManager.reconcileWithInputQueue(inputQueue);

        // Optional supervisor behaviour: when a strategy is provided, the agent reconciles
        // outstanding work into linked child processes after each turn and folds their results back
        // into the conversation on completion. Absent (the default), the process behaves as a plain
        // conversational agent.
        const strategy = Option.fromNullable(options.delegationStrategy);
        const completionGuard = Option.fromNullable(options.completionGuard);
        let delegations: Delegation[] = [...(yield* DelegationsKey.get)];

        const requestModelLayer = AiService.model(options.model ?? 'ai.claude.model.claude-opus-4-8');

        const maybeComplete = Effect.gen(function* () {
          if (isAgentWorkPending({ inputQueue, alarmManager, delegations, toolCallManager })) {
            return;
          }

          if (Option.isSome(completionGuard)) {
            const planSummary = yield* completionGuard.value.getIncompletePlanSummary(feed);
            if (planSummary != null) {
              log('agent scheduling plan completion check', { planLength: planSummary.length });
              inputQueue.push({ _tag: 'completion_check', planSummary });
              yield* AgentEventsKey.set(inputQueue);
              alarmManager.reconcile(true);
              return;
            }
          }

          log('agent work complete, succeeding');
          ctx.succeed();
        });

        return {
          // Control plane (§4.3): handlers run on the host process's server fiber, closing over the
          // live `alarmManager`/`inputQueue` and persisting their durable effect inline.
          rpcHandlers: yield* HarnessControl.toHandlersContext({
            setAlarm: Effect.fn(function* ({ at, message }) {
              yield* alarmManager.setWakeAt(DateTime.toEpochMillis(at), message);
              alarmManager.reconcile(inputQueue.length > 0);
            }),
            enqueueMessage: Effect.fn(function* ({ content }) {
              inputQueue.push({ _tag: 'prompt', content });
              yield* AgentEventsKey.set(inputQueue);
              alarmManager.reconcile(true);
            }),
          }),
          onInput: Effect.fnUntraced(function* (prompt: string) {
            log('agent onInput received', { promptLength: prompt.length, backlog: inputQueue.length });
            inputQueue.push({ _tag: 'prompt', content: [ContentBlock.Text.make({ text: prompt })] });
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
              const fired = yield* alarmManager.takeFiredAlarm();
              if (fired != null) {
                log('agent onAlarm self-wake', { firedAt: fired.firedAt });
                inputQueue.push({ _tag: 'alarm', firedAt: fired.firedAt, message: fired.message });
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
                yield* maybeComplete;
                return;
              }

              log('agent onAlarm handling', { tag: item._tag });

              if (item._tag === 'completion_check') {
                log('agent running plan completion check', { planLength: item.planSummary.length });
                const messages = yield* session
                  .createRequest({
                    prompt: [
                      ContentBlock.Text.make({
                        text: planCompletionCheckPrompt(item.planSummary),
                        disposition: 'synthetic',
                      }),
                    ],
                    system: planCompletionCheckSystem,
                    persist: false,
                  })
                  .pipe(Effect.orDie);
                const reply = messages.map(Message.extractText).join(' ').toLowerCase();
                if (parseContinueDecision(reply)) {
                  inputQueue.push({ _tag: 'plan_continue_reminder', planSummary: item.planSummary });
                  yield* AgentEventsKey.set(inputQueue);
                  alarmManager.reconcile(true);
                  log('agent plan completion check: continue');
                  return;
                }
                log('agent plan completion check: stop');
                ctx.succeed();
                return;
              }

              const prompt: ContentBlock.Any[] = Match.value(item).pipe(
                Match.tag('prompt', (item) => [...item.content]),
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
                  ContentBlock.Text.make({ text: wakeUpPrompt(item.firedAt, item.message), disposition: 'synthetic' }),
                ]),
                Match.tag('plan_continue_reminder', (item) => [
                  ContentBlock.Text.make({
                    text: planContinueReminderPrompt(item.planSummary),
                    disposition: 'synthetic',
                  }),
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
                  // The alarm tools (set-alarm/get-current-date) now arrive as a bound blueprint whose
                  // operations reach this host's AlarmManager over HarnessService Tier B.
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
              yield* maybeComplete;
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
                requestModelLayer,
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
                yield* maybeComplete;
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
    content: Schema.Array(ContentBlock.Any),
  }),
  Schema.TaggedStruct('tool_result', {
    pid: Process.ID,
    result: Schema.Unknown,
    isError: Schema.Boolean,
  }),
  Schema.TaggedStruct('alarm', {
    firedAt: Schema.Number,
    // Optional reminder carried from the self-wake; surfaced to the agent when the alarm fires.
    message: Schema.NullOr(Schema.String),
  }),
  Schema.TaggedStruct('completion_check', {
    planSummary: Schema.String,
  }),
  Schema.TaggedStruct('plan_continue_reminder', {
    planSummary: Schema.String,
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

  /** True while a tool-call result has not yet been delivered back to the agent turn. */
  hasPendingToolResults(): boolean {
    return this.#state.activeCalls.some((call) => !call.reported);
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

export type AgentIdleSnapshot = {
  inputQueue: readonly AgentEvent[];
  alarmManager: AlarmManager;
  delegations: readonly Delegation[];
  // Only the pending-results check is consulted, so the predicate stays decoupled from the rest of
  // the ToolCallManager surface (and is trivially stubbable in tests).
  toolCallManager: Pick<ToolCallManager, 'hasPendingToolResults'>;
};

/** True while the agent still has queued work, a self-wake, subprocesses, or undelivered tool results. */
export const isAgentWorkPending = ({
  inputQueue,
  alarmManager,
  delegations,
  toolCallManager,
}: AgentIdleSnapshot): boolean =>
  inputQueue.length > 0 ||
  alarmManager.wakeAt != null ||
  delegations.length > 0 ||
  toolCallManager.hasPendingToolResults();

const planCompletionCheckSystem = trim`
  You decide whether an agent should stop or continue working.
  Reply with exactly one word: "stop" or "continue".
  Do not use tools. Do not add explanation.
`;

const planCompletionCheckPrompt = (planSummary: string): string => trim`
  The agent is about to finish, but its plan still has incomplete tasks:

  <plan>
  ${planSummary}
  </plan>

  Should the agent STOP now (no more work needed) or CONTINUE working on the plan?
  Reply with exactly one word: "stop" or "continue".
`;

const planContinueReminderPrompt = (planSummary: string): string => trim`
  Your plan still has incomplete tasks — continue working before finishing:

  <plan>
  ${planSummary}
  </plan>
`;

/** Prefer an explicit "continue"; treat ambiguous replies as continue so open plan work is not dropped. */
export const parseContinueDecision = (reply: string): boolean => {
  if (/\bcontinue\b/.test(reply)) {
    return true;
  }
  if (/\bstop\b/.test(reply)) {
    return false;
  }
  return true;
};

//
// Alarms.
//

/**
 * Persisted next agent-scheduled self-wake: the UNIX timestamp (ms) and an optional reminder
 * message delivered when it fires, or `null` when no self-wake is set.
 */
const AgentAlarmKey = StorageService.key(
  Schema.parseJson(Schema.NullOr(Schema.Struct({ wakeAt: Schema.Number, message: Schema.NullOr(Schema.String) }))),
  'agentAlarm',
).pipe(StorageService.withDefault(() => null));

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
 * (`ctx.setAlarm`). The agent sets alarms via the alarm blueprint, which dispatches to this manager
 * through the `HarnessControl` RPC surface; the process reconciles the underlying single-shot alarm
 * timer to fire at the earliest of pending work or the self-wake.
 */
export class AlarmManager {
  readonly #storageService: StorageService.Service;
  readonly #setAlarm: (timeout?: number) => void;
  readonly #now: () => number;
  #wakeAt: number | null = null;
  #message: string | null = null;

  constructor({ storageService, setAlarm, now = () => Date.now() }: AlarmManagerOptions) {
    this.#storageService = storageService;
    this.#setAlarm = setAlarm;
    this.#now = now;
  }

  /** Currently scheduled self-wake timestamp (ms), or `null` when none is set. */
  get wakeAt(): number | null {
    return this.#wakeAt;
  }

  /** Reminder message delivered when the current self-wake fires, or `null` when none is set. */
  get message(): string | null {
    return this.#message;
  }

  now(): number {
    return this.#now();
  }

  /** Restores the persisted alarm state. */
  load(): Effect.Effect<void> {
    return Effect.gen(this, function* () {
      const persisted = yield* AgentAlarmKey.get;
      this.#wakeAt = persisted?.wakeAt ?? null;
      this.#message = persisted?.message ?? null;
    }).pipe(Effect.provideService(StorageService.StorageService, this.#storageService));
  }

  /** Records a new self-wake target (with an optional reminder message) and persists it. */
  setWakeAt(wakeAt: number, message: string | null = null): Effect.Effect<void> {
    return Effect.gen(this, function* () {
      this.#wakeAt = wakeAt;
      this.#message = message;
      yield* AgentAlarmKey.set({ wakeAt, message });
    }).pipe(Effect.provideService(StorageService.StorageService, this.#storageService));
  }

  /**
   * Clears the self-wake alarm if it is due, returning the timestamp it was scheduled for and the
   * reminder message it carried (or `null` if no alarm was due).
   */
  takeFiredAlarm(): Effect.Effect<{ firedAt: number; message: string | null } | null> {
    return Effect.gen(this, function* () {
      if (this.#wakeAt == null || this.#now() < this.#wakeAt) {
        return null;
      }
      const firedAt = this.#wakeAt;
      const message = this.#message;
      this.#wakeAt = null;
      this.#message = null;
      yield* AgentAlarmKey.set(null);
      return { firedAt, message };
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
 * Prompt delivered to the agent when a self-scheduled alarm fires. When the alarm carried a
 * reminder message it is surfaced verbatim, otherwise a generic continuation prompt is used.
 */
const wakeUpPrompt = (firedAt: number, message: string | null): string =>
  message != null
    ? trim`
      Your scheduled alarm fired (it was set for ${new Date(firedAt).toISOString()}).
      ${message}
    `
    : trim`
      Your scheduled alarm fired (it was set for ${new Date(firedAt).toISOString()}).
      Continue with whatever you intended to do when you scheduled this wake-up.
    `;

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
