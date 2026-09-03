//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Clock from 'effect/Clock';
import * as DateTime from 'effect/DateTime';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';
import * as Tool from 'effect/unstable/ai/Tool';
import * as Toolkit from 'effect/unstable/ai/Toolkit';

import { AiService, OpaqueToolkit } from '@dxos/ai';
import {
  AgentRequestBegin,
  AgentRequestEnd,
  Alarm,
  HarnessControl,
  type PendingState,
  SessionStore,
  SkillHooks,
  emitRequestPhase,
  getOperationFromTool,
  makeToolExecutionService,
  makeToolResolverFromOperations,
} from '@dxos/assistant';
import * as Chat from '@dxos/assistant/Chat';
import { ProcessManager } from '@dxos/compute-runtime';
import * as Credential from '@dxos/compute/Credential';
import * as McpServer from '@dxos/compute/McpServer';
import * as Operation from '@dxos/compute/Operation';
import * as Process from '@dxos/compute/Process';
import * as StorageService from '@dxos/compute/StorageService';
import * as Trace from '@dxos/compute/Trace';
import { Annotation, Database, Feed, Obj, Ref, Registry } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { ContentBlock, Message } from '@dxos/types';
import { trim } from '@dxos/util';

import { type DelegationStrategy } from './delegation-strategy.ts';
import { type MakeTurnProducer, makeAiSessionTurnProducer } from './turn-producer.ts';

interface AgentProcessOptions {
  // TODO(burdon): Instructions?
  systemPrompt?: string;

  /**
   * Produces each turn. Defaults to {@link makeAiSessionTurnProducer}; substituting it swaps the
   * engine (e.g. a Claude Agent SDK host) while leaving the queue, alarms, redelivery, delegation
   * and hydration around it untouched.
   */
  makeTurnProducer?: MakeTurnProducer;

  /** Model identifier. */
  model?: DXN.DXN;

  /**
   * The catalog's shared model ids are served by several providers, so resolution needs the provider
   * alongside the id; without it a local model id cannot be claimed by any resolver.
   */
  provider?: DXN.DXN;

  /**
   * If true, long-running tool calls are moved to the background after `backgroundThreshold`
   * and the agent is notified asynchronously when they complete.
   *
   * Currently unstable — disabled by default.
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
   * Provider for space-level MCP server configs, called on each turn.
   */
  getMcpServers?: () => McpServer.McpServer[];
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
      // Accepts plain text or content blocks.
      input: Schema.Union([Schema.String, Schema.Array(ContentBlock.Any)]),
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
        const chatDxn = Annotation.getDictionary(ctx.params.annotations, Process.TargetAnnotation).pipe(
          Option.getOrUndefined,
        );
        if (chatDxn == null) {
          return yield* Effect.die(new Error('Agent executable requires spawn options.target set to a Chat DXN.'));
        }
        // The process is bound to the chat, not to its feed: the queue, the steering instructions
        // and the checklist are all read from the chat, and a rehydrated process recovers them by
        // re-reading it rather than from spawn annotations.
        const chat = yield* Database.resolve(chatDxn, Chat.Chat).pipe(Effect.orDie);
        const feed = yield* Database.load(chat.feed).pipe(Effect.orDie);
        // A broken instructions ref degrades to an unsteered session rather than failing the process.
        const instructions = chat.instructions
          ? yield* Database.load(chat.instructions).pipe(Effect.orElseSucceed(() => undefined))
          : undefined;
        const runtime = yield* Effect.context<Database.Service>();
        const makeTurnProducer = options.makeTurnProducer ?? makeAiSessionTurnProducer;
        // Scoped acquisition: the producer's teardown registers with this process's scope.
        const session = yield* makeTurnProducer({ feed, runtime, instructions: instructions ? [instructions] : [] });
        const sessionStore = new SessionStore();
        // KV holds only undelivered tool results; queued prompts and alarms live in the feed via
        // `sessionStore`.
        let toolResults: ToolResultEvent[] = [...(yield* ToolResultsCell.get)];
        const storageService = yield* StorageService.StorageService;
        const toolCallManager = new ToolCallManager(storageService);
        yield* toolCallManager.load();

        // Read time from the ambient Effect Clock so alarm scheduling and the due-check stay
        // consistent (and both honor a TestClock under tests).
        const clock = yield* Clock.Clock;
        const now = () => clock.currentTimeMillisUnsafe();

        // Queued tool results were never consumed by onAlarm — reported flags from the synchronous
        // execution path are stale after reload and would cause onAlarm to drop them.
        yield* toolCallManager.reconcileWithInputQueue(toolResults);

        // Schedules the process alarm from durable state: immediately when work is queued, at the
        // earliest pending alarm otherwise, not at all when idle.
        const reconcileAlarmWith = (state: PendingState): Effect.Effect<void> => {
          const delay = computeAlarmDelay({
            hasPendingWork: toolResults.length > 0 || state.pendingMessages.length > 0,
            wakeAt: state.pendingAlarms[0]?.wakeAt ?? null,
            now: now(),
          });
          return delay != null ? ctx.setAlarm(delay) : Effect.void;
        };
        const reconcileAlarm = Effect.flatMap(sessionStore.loadPending(feed), reconcileAlarmWith);

        // Hydration: the work is durable (queued prompts and alarms on the feed, undelivered tool
        // results in KV) but the process alarm is not, and a rehydrated process is not handed its
        // pending input events again — so it must re-arm from that durable state here or sit idle
        // with work waiting. What was already pending is also what `onSpawn` decides the fate of.
        const startupPending = yield* sessionStore.loadPending(feed);
        yield* reconcileAlarmWith(startupPending);

        // Optional supervisor behaviour: when a strategy is provided, the agent reconciles
        // outstanding work into linked child processes after each turn and folds their results back
        // into the conversation on completion. Absent (the default), the process behaves as a plain
        // conversational agent.
        const strategy = Option.fromNullishOr(options.delegationStrategy);
        let delegations: Delegation[] = [...(yield* DelegationsCell.get)];

        const requestModelLayer = AiService.model(
          options.model ? DXN.getName(options.model) : 'com.anthropic.model.claude-opus-5.default',
          {
            provider: options.provider,
          },
        );

        const operationInvoker = yield* ProcessManager.ProcessOperationInvoker.Service;

        // Fire end-request hooks declared by the bound skills (e.g. the planning plan-reminder).
        // Each hook runs as a child operation with `conversation` set, so it resolves the full
        // HarnessService (Tier B) and can enqueue a continuation back onto this host's queue — which
        // keeps the process alive past this turn.
        const runEndRequestHooks = Effect.gen(function* () {
          yield* SkillHooks.runHooks({
            skills: session.getSkills(),
            phase: 'end-request',
            invoke: (operation, input) =>
              Effect.gen(function* () {
                const fiber = yield* operationInvoker.invokeFiber(operation, input, {
                  environment: { conversation: Obj.getURI(feed) },
                  traceMeta: { conversation: Ref.make(feed) },
                });
                // `fiber.await` yields an Exit; surface a child failure into the Effect channel so
                // the outer `Effect.orDie` (and the hook runner's `catchAllCause`) handle it instead
                // of the failure being silently discarded.
                const exit = yield* fiber.await;
                if (Exit.isFailure(exit)) {
                  return yield* Effect.failCause(exit.cause);
                }
              }).pipe(Effect.asVoid, Effect.orDie),
          });
        });

        const pendingWork = (state: PendingState): boolean =>
          isAgentWorkPending({
            toolResults,
            pendingMessages: state.pendingMessages,
            pendingAlarms: state.pendingAlarms,
            delegations,
            toolCallManager,
          });

        const maybeCompleteWith = (state: PendingState) =>
          Effect.gen(function* () {
            if (pendingWork(state)) {
              return;
            }

            // The hook may enqueue work (e.g. a plan continuation reminder) via HarnessService Tier B,
            // which appends to the feed queue; re-check before succeeding so the turn is not dropped.
            yield* runEndRequestHooks;
            const after = yield* sessionStore.loadPending(feed);
            if (pendingWork(after)) {
              log('agent work enqueued by end-request hook, continuing');
              yield* reconcileAlarmWith(after);
              return;
            }

            log('agent work complete, succeeding');
            ctx.succeed();
          });

        const maybeComplete = Effect.flatMap(sessionStore.loadPending(feed), maybeCompleteWith);

        return {
          // Runs on a fresh spawn only — never on a resume, which is what a hibernated process gets.
          // So anything already pending here was left by a process that is gone for good: stopped by
          // the user, or dead without being rehydrated. Redelivering it would re-run a prompt the
          // reader stopped, and the next thing they type would queue behind it.
          onSpawn: Effect.fnUntraced(function* () {
            if (startupPending.pendingMessages.length > 0) {
              log.info('discarding queue entries left by a previous process', {
                count: startupPending.pendingMessages.length,
              });
              yield* Effect.forEach(startupPending.pendingMessages, (message) => sessionStore.ack(feed, message), {
                discard: true,
              });
            }
          }),
          // Control plane (§4.3): handlers run on the host process's server fiber, writing their
          // durable effect to the feed inline.
          rpcHandlers: yield* HarnessControl.toHandlers({
            setAlarm: Effect.fn(function* ({ at, message }) {
              yield* sessionStore.setAlarm(feed, {
                wakeAt: DateTime.toEpochMillis(at),
                message: message ?? undefined,
              });
              yield* reconcileAlarm;
            }),
            enqueueMessage: Effect.fn(function* ({ content }) {
              yield* sessionStore.enqueueMessage(
                feed,
                Message.make({ sender: { role: 'user' }, blocks: [...content] }),
              );
              yield* ctx.setAlarm(0);
            }),
          }),
          onInput: Effect.fnUntraced(function* (prompt: string | readonly ContentBlock.Any[]) {
            log('agent onInput received', { backlog: toolResults.length });
            const content = typeof prompt === 'string' ? [ContentBlock.Text.make({ text: prompt })] : [...prompt];
            yield* sessionStore.enqueueMessage(feed, Message.make({ sender: { role: 'user' }, blocks: content }));
            yield* ctx.setAlarm(0);
            log('agent onInput enqueued to feed');
          }),
          onAlarm: Effect.fnUntraced(
            function* () {
              log('agent onAlarm fired', { backlog: toolResults.length });

              // Earliest point the agent can report to a reader who is already waiting: draining the
              // queue below reads the feed, which is itself part of the wait. An empty wake emits it
              // too, but that path returns in milliseconds and the turn settling clears the line.
              yield* emitRequestPhase('preparing');

              for (const pid of dropReportedToolResults(toolResults, (pid) => toolCallManager.isReported(pid))) {
                log.info('skip tool result that was reported synchronously', { pid });
              }

              // Undelivered tool results drain first; then the feed queue, then a due alarm.
              const toolResult = toolResults.shift();
              let prompt: ContentBlock.Any[];
              let dequeued: Message.Message | Alarm.Alarm | undefined;
              if (toolResult !== undefined) {
                log('agent onAlarm handling', { tag: toolResult._tag });
                prompt = toolResultPrompt(toolResult);
              } else {
                const state = yield* sessionStore.loadPending(feed);
                const message = state.pendingMessages[0];
                const dueAlarm = state.pendingAlarms.find((alarm) => alarm.wakeAt <= now());
                if (message !== undefined) {
                  log('agent onAlarm handling', { tag: 'message', id: message.id });
                  dequeued = message;
                  prompt = [...message.blocks];
                } else if (dueAlarm !== undefined) {
                  log('agent onAlarm self-wake', { firedAt: dueAlarm.wakeAt });
                  dequeued = dueAlarm;
                  prompt = [
                    ContentBlock.Text.make({
                      text: wakeUpPrompt(dueAlarm.wakeAt, dueAlarm.message ?? null),
                      disposition: 'synthetic',
                    }),
                  ];
                } else {
                  log('agent onAlarm empty queue', {});
                  yield* reconcileAlarmWith(state);
                  yield* maybeCompleteWith(state);
                  return;
                }
              }

              // The turn appends its own user message built from `prompt`, so the queue entry that
              // supplied it must leave the queue view now or the same content shows in both places
              // until the late ack below.
              if (dequeued !== undefined) {
                yield* sessionStore.markInFlight(feed, dequeued);
              }

              log('begin request', { prompt });
              log('trace agent request begin');
              yield* Trace.write(AgentRequestBegin, {});
              yield* session
                .runTurn({
                  prompt,
                  // TODO(dmaretskyi): Polling currently broken, agent relies on completion notifications being delivered.
                  // toolkit: AsynchronousExectionToolkit,
                  system: options.systemPrompt,
                  mcpServers: options.getMcpServers?.(),
                })
                .pipe(
                  Effect.onExit((exit) =>
                    Trace.write(AgentRequestEnd, {
                      status: Exit.isSuccess(exit) ? 'success' : Exit.hasInterrupts(exit) ? 'interrupted' : 'error',
                      error: Exit.isFailure(exit) ? Cause.pretty(exit.cause) : undefined,
                    }),
                  ),
                );
              log('end request');
              yield* ToolResultsCell.set(toolResults);

              // Ack only now: the turn is what the queue entry was for, so a process that dies before
              // this point must find the entry still pending and redeliver it.
              if (dequeued !== undefined) {
                yield* sessionStore.ack(feed, dequeued);
              }
              const after = yield* sessionStore.loadPending(feed);

              // Reconcile outstanding work into linked child processes (supervisor behaviour). The
              // children are linked, so their exits wake `onChildEvent` below.
              if (Option.isSome(strategy)) {
                const activeIds = new Set(delegations.map((delegation) => delegation.id));
                const pending = yield* strategy.value.reconcile(chat, activeIds);
                for (const delegation of pending) {
                  const pid = yield* delegation.spawn;
                  delegations.push({ pid, id: delegation.id });
                  log('delegated work', { pid, id: delegation.id });
                }
                if (pending.length > 0) {
                  yield* DelegationsCell.set(delegations);
                }
              }

              // Reconcile so a pending alarm (or remaining queue work) is rescheduled.
              yield* reconcileAlarmWith(after);
              yield* maybeCompleteWith(after);
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
                yield* DelegationsCell.set(delegations);
                const operationInvoker = yield* ProcessManager.ProcessOperationInvoker.Service;
                const fiber = yield* operationInvoker.attachFiber(event.pid).pipe(Effect.orDie);
                const exit = yield* fiber.await;
                if (Option.isSome(strategy)) {
                  yield* strategy.value.onComplete(chat, delegation.id, exit);
                  // Re-reconcile: work that was waiting on this delegation (e.g. a dependent task)
                  // spawns now rather than on the next conversational turn — this is what lets a
                  // batch of delegated tasks drain without further prompting.
                  const activeIds = new Set(delegations.map((delegation) => delegation.id));
                  const pending = yield* strategy.value.reconcile(chat, activeIds);
                  for (const next of pending) {
                    const pid = yield* next.spawn;
                    delegations.push({ pid, id: next.id });
                    log('delegated work', { pid, id: next.id });
                  }
                  if (pending.length > 0) {
                    yield* DelegationsCell.set(delegations);
                  }
                }
                log('delegated work completed', { pid: event.pid, id: delegation.id, success: Exit.isSuccess(exit) });
                yield* maybeComplete;
              } else if (toolCallManager.isToolCall(event.pid)) {
                const operationInvoker = yield* ProcessManager.ProcessOperationInvoker.Service;
                const attachExit = yield* operationInvoker.attachFiber(event.pid).pipe(Effect.exit);
                if (Exit.isFailure(attachExit)) {
                  // Completed tool children are not rehydrated on reload; the result is in the tool
                  // result queue or was delivered synchronously before the interrupted turn.
                  if (
                    toolCallManager.isToolCall(event.pid) ||
                    toolResults.some((item) => item.pid === event.pid) ||
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
                      onSuccess: (value): ToolResultEvent => ({
                        _tag: 'tool_result',
                        pid: event.pid,
                        result: value,
                        isError: false,
                      }),
                      onFailure: (cause): ToolResultEvent => ({
                        _tag: 'tool_result',
                        pid: event.pid,
                        result: Cause.pretty(cause),
                        isError: true,
                      }),
                    }),
                  ),
                );
                toolResults.push(result);
                log('agent onChildEvent persisted tool result', { depth: toolResults.length, childPid: event.pid });
                yield* ToolResultsCell.set(toolResults);
                yield* ctx.setAlarm(0);
                log('agent onChildEvent alarm scheduled', { depth: toolResults.length });
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

const ToolResultEvent = Schema.TaggedStruct('tool_result', {
  pid: Process.ID,
  result: Schema.Unknown,
  isError: Schema.Boolean,
});
/** Exported so the pure queue/prompt helpers below can be exercised without spawning an agent. */
export type ToolResultEvent = Schema.Schema.Type<typeof ToolResultEvent>;

const ToolResultsCell = StorageService.cell(
  Schema.fromJsonString(Schema.Array(ToolResultEvent).pipe(Schema.mutable)),
  'toolResults',
).pipe(StorageService.withDefault(() => []));

/**
 * Tracks delegated sub-agent child processes (pid -> correlation id) so that, after a hibernation,
 * a delegated child's exit can be matched back to the work it was fulfilling.
 */
const Delegation = Schema.Struct({ pid: Process.ID, id: Schema.String }).mapFields(Struct.map(Schema.mutableKey));
type Delegation = Schema.Schema.Type<typeof Delegation>;

const DelegationsCell = StorageService.cell(
  Schema.fromJsonString(Schema.Array(Delegation).pipe(Schema.mutable)),
  'delegations',
).pipe(StorageService.withDefault(() => []));

const ToolCallState = Schema.Struct({
  activeCalls: Schema.Array(
    Schema.Struct({
      pid: Process.ID,
      // Whether the result was reported to the agent.
      reported: Schema.Boolean,
    }).mapFields(Struct.map(Schema.mutableKey)),
  ).pipe(Schema.mutable),
});
interface ToolCallState extends Schema.Schema.Type<typeof ToolCallState> {}

// Id's of processes who's results were already submitted to the agent.
const ToolCallStateCell = StorageService.cell(
  Schema.fromJsonString(ToolCallState.mapFields(Struct.map(Schema.mutableKey))),
  'toolCallState',
).pipe(StorageService.withDefault(() => ({ activeCalls: [] })));

class ToolCallManager {
  #storageService: StorageService.Service;
  #state: ToolCallState = { activeCalls: [] };

  constructor(storageService: StorageService.Service) {
    this.#storageService = storageService;
  }

  load() {
    return Effect.gen({ self: this }, function* () {
      this.#state = yield* ToolCallStateCell.get;
    }).pipe(Effect.provideService(StorageService.StorageService, this.#storageService));
  }

  beginCall(pid: Process.ID) {
    return Effect.gen({ self: this }, function* () {
      this.#state.activeCalls.push({ pid, reported: false });
      yield* ToolCallStateCell.set(this.#state);
    }).pipe(Effect.provideService(StorageService.StorageService, this.#storageService));
  }

  markAsReported(pid: Process.ID) {
    return Effect.gen({ self: this }, function* () {
      const call = this.#state.activeCalls.find((call) => call.pid === pid);
      if (!call) {
        return;
      }
      call.reported = true;
      yield* ToolCallStateCell.set(this.#state);
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
  reconcileWithInputQueue(queue: readonly ToolResultEvent[]) {
    return Effect.gen({ self: this }, function* () {
      let changed = false;
      for (const item of queue) {
        const call = this.#state.activeCalls.find((entry) => entry.pid === item.pid);
        if (call?.reported) {
          call.reported = false;
          changed = true;
          log('reconcile queued tool result', { pid: item.pid });
        }
      }
      if (changed) {
        yield* ToolCallStateCell.set(this.#state);
      }
    }).pipe(Effect.provideService(StorageService.StorageService, this.#storageService));
  }
}

export type AgentIdleSnapshot = {
  toolResults: readonly ToolResultEvent[];
  pendingMessages: readonly Message.Message[];
  // A future alarm counts as pending work: the process must stay alive to fire it.
  pendingAlarms: readonly Alarm.Alarm[];
  delegations: readonly Delegation[];
  // Only the pending-results check is consulted, so the predicate stays decoupled from the rest of
  // the ToolCallManager surface (and is trivially stubbable in tests).
  toolCallManager: Pick<ToolCallManager, 'hasPendingToolResults'>;
};

/** True while the agent still has queued work, a pending alarm, subprocesses, or undelivered tool results. */
export const isAgentWorkPending = ({
  toolResults,
  pendingMessages,
  pendingAlarms,
  delegations,
  toolCallManager,
}: AgentIdleSnapshot): boolean =>
  toolResults.length > 0 ||
  pendingMessages.length > 0 ||
  pendingAlarms.length > 0 ||
  delegations.length > 0 ||
  toolCallManager.hasPendingToolResults();

/**
 * Discards tool results at the head of the queue whose values already reached the agent.
 *
 * A tool that returned inside its turn is reported synchronously AND left queued; after a reload the
 * queue is replayed, so without this the model would be handed a result it has already seen. Only the
 * head is examined: a result further back belongs to a turn that has not run yet.
 *
 * Mutates `queue` and returns the pids dropped, so the caller owns the logging.
 */
export const dropReportedToolResults = (
  queue: ToolResultEvent[],
  isReported: (pid: Process.ID) => boolean,
): readonly Process.ID[] => {
  const dropped: Process.ID[] = [];
  while (queue.length > 0) {
    const head = queue[0];
    if (!isReported(head.pid)) {
      break;
    }
    queue.shift();
    dropped.push(head.pid);
  }
  return dropped;
};

/**
 * Renders a recovered tool result as the next turn's prompt: a synthetic `<result pid=N>` TEXT block
 * rather than a tool-result part, because the request it belonged to is gone and its tool-call id
 * cannot be answered. `disposition: 'synthetic'` keeps it out of the user-visible transcript.
 */
export const toolResultPrompt = (event: ToolResultEvent): ContentBlock.Any[] => [
  ContentBlock.Text.make({
    text: event.isError
      ? toolErrorResponse(event.pid, String(event.result))
      : toolResultResponse(event.pid, event.result),
    disposition: 'synthetic',
  }),
];

//
// Alarms.
//

/**
 * Computes the timeout to pass to `ctx.setAlarm`, reconciling pending queue work with the earliest
 * pending feed alarm. Returns `null` when no alarm should be scheduled (process can go idle).
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

/**
 * Prompt delivered to the agent when a self-scheduled alarm fires. When the alarm carried a
 * reminder message it is surfaced verbatim, otherwise a generic continuation prompt is used.
 * Exported so the prompt shape stays pinned by tests without spawning an agent.
 */
export const wakeUpPrompt = (firedAt: number, message: string | null): string =>
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
  Layer.unwrap(
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
                conversation: Ref.make(feed),
              },
            });
            yield* toolCallManager.beginCall(fiber.pid);
            log('invoked operation', { operationDef, input, fiber });

            const awaitWithReport = fiber.await.pipe(Effect.tap(() => toolCallManager.markAsReported(fiber.pid)));
            const result = enableBackgrounding
              ? yield* awaitWithReport.pipe(
                  Effect.timeout(backgroundThreshold),
                  Effect.catchTag('TimeoutError', () =>
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
    parameters: Schema.Struct({
      ids: Schema.Array(Schema.String).annotate({
        description: 'The IDs of the jobs to inspect.',
      }),
      wait: Schema.optional(Schema.Boolean).annotate({
        description: 'Whether to wait for the tool call to complete before returning.',
        default: false,
      }),
      timeout: Schema.optional(Schema.Number).annotate({
        description:
          'Maximum time to wait for the job to complete. If the job does not complete within the timeout, the current state is returned.',
        default: 10_000,
      }),
    }),
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
              Effect.catchTag('TimeoutError', () => Effect.succeed(`Process still running: ${pid}`)),
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
