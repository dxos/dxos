//
// Copyright 2025 DXOS.org
//

import * as Array from 'effect/Array';
import * as Cause from 'effect/Cause';
import * as Context from 'effect/Context';
import * as Cron from 'effect/Cron';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Fiber from 'effect/Fiber';
import { pipe } from 'effect/Function';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Record from 'effect/Record';
import * as Result from 'effect/Result';
import * as Schedule from 'effect/Schedule';
import * as Semaphore from 'effect/Semaphore';
import * as Stream from 'effect/Stream';
import * as Struct from 'effect/Struct';
import * as Atom from 'effect/unstable/reactivity/Atom';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';

import { RunAgainError } from '@dxos/compute';
import * as Operation from '@dxos/compute/Operation';
import * as Process from '@dxos/compute/Process';
import * as Trigger from '@dxos/compute/Trigger';
import * as TriggerEvent from '@dxos/compute/TriggerEvent';
import { Annotation, Database, Entity, Feed, Filter, Obj, Query, QueryResult, Ref } from '@dxos/echo';
import { EffectEx, SpanAttributes } from '@dxos/effect';
import { failedInvariant, invariant } from '@dxos/invariant';
import { EntityId, type URI } from '@dxos/keys';
import { log } from '@dxos/log';

import * as ProcessManager from '../ProcessManager';
import { filterReadyFeedItems } from './feed-position';
import { createInvocationPayload } from './input-builder';
import { type TriggerState, TriggerStateStore } from './trigger-state-store';

export type TimeControl = 'natural' | 'manual';

export interface TriggerDispatcherOptions {
  services: Context.Context<TriggerDispatcherServices>;

  /**
   * Time control mode.
   * - 'natural': Use real time.
   * - 'manual': Use internal clock for testing.
   */
  timeControl: TimeControl;

  /**
   * Starting time for manual time control mode.
   * @default current time
   */
  startingTime?: Date;

  /**
   * Poll interval for cron triggers in 'natural' time control mode.
   *
   * Bounds how late a cron trigger fires, so it is also the finest schedule the dispatcher can
   * honour — a minute, matching the shortest interval any deployed trigger asks for. The tick now
   * carries timer triggers alone (feed and subscription triggers are woken by their own data), so
   * shortening it costs a cron sweep rather than a re-read of every feed; a caller that needs
   * sub-minute firing passes a smaller value explicitly (tests do) rather than lowering the default.
   *
   * @default 1 minute
   */
  livePollInterval?: Duration.Duration;

  /**
   * Maximum concurrency for triggers.
   * Also limited by per-trigger concurrency.
   * @default 5
   */
  maxConcurrency?: number;

  /**
   * Cooldown applied to a trigger after it fails.
   * While in cooldown, scheduled invocations of that trigger are skipped.
   * Manual {@link TriggerDispatcher.invokeTrigger} calls bypass the cooldown.
   * @default 30 seconds
   */
  failureCooldown?: Duration.Duration;
}

export interface InvokeTriggerOptions {
  trigger: Trigger.Trigger;
  event: TriggerEvent.TriggerEvent;
}
export interface TriggerExecutionResult {
  triggerId: string;
  result: Exit.Exit<unknown>;

  /**
   * Only for feed triggers.
   */
  feedCursor?: string;
}

/**
 * Unified runtime state for a single trigger, tracking *when/whether the trigger should run again*
 * across every trigger kind (not only cron).
 */
interface RuntimeTriggerState {
  trigger: Trigger.Trigger;

  /**
   * Parsed cron schedule. Set only for `timer` triggers.
   */
  cron?: Cron.Cron;

  /**
   * Next scheduled cron execution. Set only for `timer` triggers.
   */
  nextExecution?: Date;

  /**
   * Time until which scheduled invocations of this trigger are skipped after a genuine failure.
   * Applies to all trigger kinds. Manual {@link TriggerDispatcher.invokeTrigger} calls bypass it.
   */
  cooldownUntil?: Date;

  /**
   * Pending re-invocation requested via {@link Operation.runAgain} ({@link RunAgainError}).
   * Retries are drained at the tail of the invocation queue, ordered by `enqueuedAt`.
   */
  retry?: {
    /**
     * Event to replay on the retry. Re-running is assumed safe with the same input.
     */
    event: TriggerEvent.TriggerEvent;

    /**
     * Monotonic sequence number used to order pending retries FIFO at the tail of the queue.
     */
    enqueuedAt: number;
  };

  /**
   * Result of the most recent invocation of this trigger.
   */
  lastResult?: Exit.Exit<unknown> | null;
}

type TriggerDispatcherServices = Registry.AtomRegistry | ProcessManager.Service | TriggerStateStore | Database.Service;

export type InvocationsState = {
  invocationId: EntityId;
  trigger: Trigger.Trigger;
  function: Operation.Definition.Any | null;
  event: TriggerEvent.TriggerEvent;
  result: Exit.Exit<unknown> | null;
};

/**
 * Observable per-trigger runtime status, derived from the dispatcher's internal runtime state.
 */
export type TriggerRuntimeStatus = {
  triggerId: string;

  /**
   * Next scheduled cron execution (timer triggers only).
   */
  nextExecution?: Date;

  /**
   * Time until which the trigger is in failure cooldown, if any.
   */
  cooldownUntil?: Date;

  /**
   * Whether a re-invocation is pending from {@link RunAgainError}.
   */
  retryPending: boolean;

  /**
   * Result of the most recent invocation, if any.
   */
  lastResult?: Exit.Exit<unknown> | null;
};

export type TriggerDispatcherState = {
  enabled: boolean;
  triggers: TriggerRuntimeStatus[];
  invocations: InvocationsState[];
  errors: Error[];
};

const MAX_TRACKED_INVOCATIONS = 10;
const MAX_TRACKED_ERRORS = 10;

// TODO(dmaretskyi): Extract a separate TriggerMonmitor service to @dxos/compute that would work with both local and edge dispatcher.
export class TriggerDispatcher extends Context.Service<
  TriggerDispatcher,
  {
    readonly timeControl: TimeControl;

    readonly state: Atom.Atom<TriggerDispatcherState>;

    get running(): boolean;

    /**
     * Start the trigger dispatcher.
     * Will automatically invoke triggers.
     */
    start(): Effect.Effect<void>;

    /**
     * Stop the trigger dispatcher.
     */
    stop(): Effect.Effect<void>;

    /**
     * Refresh triggers.
     */
    refreshTriggers(): Effect.Effect<void>;

    /**
     * Manually invoke a specific trigger.
     */
    invokeTrigger(options: InvokeTriggerOptions): Effect.Effect<TriggerExecutionResult>;

    /**
     * Invoke all scheduled triggers who are due.
     * @param opts.kinds - The kinds of triggers to invoke.
     * @param opts.untilExhausted - Invoke until no more triggers are due. By default only one feed/subscription item is processed at a time.
     * @param opts.triggerIds - Restrict the sweep to these triggers. Defaults to every trigger of the given kinds.
     */
    invokeScheduledTriggers(opts?: {
      kinds?: Trigger.Kind[];
      untilExhausted?: boolean;
      triggerIds?: readonly string[];
    }): Effect.Effect<TriggerExecutionResult[]>;

    /**
     * Advance the internal clock (manual time control only).
     * Note: Does not invoke triggers.
     */
    advanceTime(duration: Duration.Duration): Effect.Effect<void>;

    /**
     * Get current time based on time control mode.
     */
    getCurrentTime(): Date;
  }
>()('@dxos/functions/TriggerDispatcher') {
  static layer = (
    options: Omit<TriggerDispatcherOptions, 'services'>,
  ): Layer.Layer<TriggerDispatcher, never, TriggerDispatcherServices> =>
    Layer.effect(
      TriggerDispatcher,
      Effect.gen(function* () {
        const services = yield* EffectEx.contextWithoutParentSpan<TriggerDispatcherServices>();
        return new TriggerDispatcherImpl({ ...options, services });
      }),
    );
}

const DEFAULT_MAX_CONCURRENCY = 5;

/** Enough consecutive occurrences to cross a cluster and back — one gap would miss `0,5 * * * * *`. */
const CRON_PERIOD_SAMPLES = 8;

/**
 * The SHORTEST interval between consecutive occurrences, or `undefined` if it fires at most once more.
 *
 * The minimum is what a poll floor needs: a schedule is unhonourable if ANY adjacent pair is closer
 * than the tick, not merely if its typical spacing is.
 */
const cronPeriod = (cron: Cron.Cron, now: Date): Duration.Duration | undefined => {
  try {
    let previous = Cron.next(cron, now);
    let shortest: number | undefined;
    for (let index = 0; index < CRON_PERIOD_SAMPLES; index += 1) {
      const next = Cron.next(cron, previous);
      const gap = next.getTime() - previous.getTime();
      shortest = shortest === undefined ? gap : Math.min(shortest, gap);
      previous = next;
    }
    return shortest === undefined ? undefined : Duration.millis(shortest);
  } catch {
    return undefined;
  }
};

/** See {@link TriggerDispatcherOptions.livePollInterval}. */
const DEFAULT_LIVE_POLL_INTERVAL = Duration.minutes(1);
const DEFAULT_FAILURE_COOLDOWN = Duration.seconds(30);

class TriggerDispatcherImpl implements Context.Service.Shape<typeof TriggerDispatcher> {
  readonly livePollInterval: Duration.Duration;
  readonly timeControl: TimeControl;

  private _services: Context.Context<TriggerDispatcherServices>;
  private _running = false;
  private _internalTime: Date;
  private _timerFiber: Fiber.Fiber<void, void> | undefined;
  private _triggers: Trigger.Trigger[] = [];

  /**
   * Live query over `Trigger` objects, subscribed once in {@link start} so the trigger list stays
   * current reactively. While set, {@link _fetchTriggers} reads {@link QueryResult.results}
   * directly instead of re-querying the database, so the natural-time poll loop no longer issues a
   * fresh `Filter.type(Trigger)` query on every tick.
   */
  #triggerQuery: QueryResult.QueryResult<Trigger.Trigger> | undefined;
  #triggerQueryUnsubscribe: (() => void) | undefined;

  /**
   * Fiber forked by the trigger-query subscription callback to run {@link refreshTriggers}
   * reactively. Tracked so {@link stop} (and the natural-time-processing failure path) can
   * interrupt an in-flight refresh instead of letting it repopulate state after shutdown.
   */
  #pendingRefreshFiber: Fiber.Fiber<void, never> | undefined;

  /**
   * Live queries that wake the non-timer kinds, keyed by trigger id: a feed trigger watches what
   * follows its cursor, a subscription trigger watches its own query. Only `timer` genuinely needs
   * a wall clock, so the poll tick drives that kind alone and the rest react to their data.
   *
   * `key` folds in whatever the query is derived from (a feed trigger's cursor), so a refresh
   * rebuilds a subscription exactly when it has gone stale and leaves the rest untouched.
   */
  #reactiveSources = new Map<string, { key: string; unsubscribe: () => void }>();

  /**
   * Serializes reactive dispatch so two overlapping wake-ups cannot invoke the same trigger twice
   * for one item — the cursor advances only after an invocation completes.
   */
  #reactiveDispatchLock = Semaphore.makeUnsafe(1);

  /** Serializes reconciliation of {@link #reactiveSources}, which spans an await. */
  #reactiveSourceLock = Semaphore.makeUnsafe(1);

  /** Fibers forked by reactive subscriptions, interrupted on teardown. */
  #reactiveDispatchFibers = new Set<Fiber.Fiber<void, never>>();

  /**
   * Unified runtime state for every trigger kind: cron schedule, failure cooldown, and pending
   * {@link RunAgainError} retries. Keyed by trigger id.
   */
  private _runtimeState = new Map<string, RuntimeTriggerState>();

  // `keepAlive` prevents the registry from disposing the atom node when no subscribers
  // are mounted (e.g. when start/stop runs before the UI subscribes). Without it,
  // updates written before the first subscription are dropped and the next read
  // re-initializes to the default {enabled: false, ...}.
  private _state: Atom.Writable<TriggerDispatcherState> = Atom.make<TriggerDispatcherState>({
    enabled: false,
    triggers: [],
    invocations: [],
    errors: [],
  }).pipe(Atom.keepAlive);
  private _maxConcurrency: number;
  private _failureCooldown: Duration.Duration;

  /**
   * Global concurrency limiter shared across all invocation paths (timer, feed, subscription,
   * manual, and retry drain). Enforces {@link _maxConcurrency} on top of any per-trigger
   * concurrency. Created eagerly so it can wrap invocations without an initialization effect.
   */
  private _concurrencyLimiter: Semaphore.Semaphore;

  /**
   * Monotonic counter assigning FIFO ordering to pending retries so re-enqueued retries land at
   * the tail of the queue.
   */
  private _retrySequence = 0;

  constructor(options: TriggerDispatcherOptions) {
    this._services = options.services;
    this.timeControl = options.timeControl;
    this.livePollInterval = options.livePollInterval ?? DEFAULT_LIVE_POLL_INTERVAL;
    this._internalTime = options.startingTime ?? new Date();
    this._maxConcurrency = options.maxConcurrency ?? DEFAULT_MAX_CONCURRENCY;
    this._failureCooldown = options.failureCooldown ?? DEFAULT_FAILURE_COOLDOWN;
    this._concurrencyLimiter = Semaphore.makeUnsafe(this._maxConcurrency);
  }

  private _isInCooldown = (triggerId: string): boolean => {
    const entry = this._runtimeState.get(triggerId);
    const until = entry?.cooldownUntil;
    if (!until) {
      return false;
    }
    if (until.getTime() <= this.getCurrentTime().getTime()) {
      entry.cooldownUntil = undefined;
      return false;
    }
    return true;
  };

  /**
   * Return the runtime-state entry for a trigger, creating a bare one if absent. Callers that
   * invoke a trigger before {@link refreshTriggers} has populated the map (e.g. a manual
   * {@link invokeTrigger}) rely on this to record cooldown/retry state.
   */
  private _getOrCreateRuntimeState = (trigger: Trigger.Trigger): RuntimeTriggerState => {
    let entry = this._runtimeState.get(trigger.id);
    if (!entry) {
      entry = { trigger };
      this._runtimeState.set(trigger.id, entry);
    } else {
      entry.trigger = trigger;
    }
    return entry;
  };

  /**
   * Publish the current per-trigger runtime state onto the observable dispatcher state so the UI
   * can render cursor/next-run/cooldown/retry status.
   */
  private _publishRuntimeStatuses = (registry: Registry.AtomRegistry): void => {
    const triggers: TriggerRuntimeStatus[] = Array.fromIterable(this._runtimeState.values()).map((entry) => ({
      triggerId: entry.trigger.id,
      nextExecution: entry.nextExecution,
      cooldownUntil: entry.cooldownUntil,
      retryPending: entry.retry !== undefined,
      lastResult: entry.lastResult,
    }));
    registry.update(this._state, Struct.evolve({ triggers: () => triggers }));
  };

  get running(): boolean {
    return this._running;
  }

  get state(): Atom.Atom<TriggerDispatcherState> {
    return this._state;
  }

  start = (): Effect.Effect<void> =>
    Effect.gen({ self: this }, function* () {
      if (this._running) {
        return;
      }

      this._running = true;
      const registry = yield* Registry.AtomRegistry;
      registry.update(
        this._state,
        Struct.evolve({
          enabled: () => true,
          errors: () => [],
        }),
      );

      // Start natural time processing if enabled
      if (this.timeControl === 'natural') {
        yield* this.#subscribeToTriggers();
        this._timerFiber = yield* this._startNaturalTimeProcessing().pipe(
          Effect.tapCause((cause) =>
            Effect.gen({ self: this }, function* () {
              const error = EffectEx.causeToError(cause);
              log.error('trigger dispatcher error', { error });
              this._running = false;
              this._timerFiber = undefined;
              registry.update(
                this._state,
                Struct.evolve({
                  enabled: () => false,
                  errors: (errors) => [...errors, error].slice(-MAX_TRACKED_ERRORS),
                }),
              );
              // A crash bypasses `stop()` (`_running` is already false, so a later `stop()` call
              // would no-op) — tear the subscription down here so it doesn't outlive the dispatcher.
              yield* this.#teardownTriggerSubscription();
            }),
          ),
          Effect.forkDetach,
        );
      } else {
        return yield* Effect.die(new Error('TriggerDispatcher started in manual time control mode'));
      }

      log.info('TriggerDispatcher started', { timeControl: this.timeControl });
    }).pipe(Effect.provide(this._services));

  stop = (): Effect.Effect<void> =>
    Effect.gen({ self: this }, function* () {
      if (!this._running) {
        return;
      }

      this._running = false;
      const registry = yield* Registry.AtomRegistry;
      registry.update(
        this._state,
        Struct.evolve({
          enabled: () => false,
        }),
      );

      // Stop timer processing
      if (this._timerFiber) {
        yield* Fiber.interrupt(this._timerFiber);
        this._timerFiber = undefined;
      }

      // Stop the reactive trigger query subscription.
      yield* this.#teardownTriggerSubscription();

      // Clear runtime state for all triggers.
      this._runtimeState.clear();
      this._publishRuntimeStatuses(registry);

      log.info('TriggerDispatcher stopped');
    }).pipe(Effect.provide(this._services));

  invokeTrigger = (options: InvokeTriggerOptions): Effect.Effect<TriggerExecutionResult> =>
    Effect.gen({ self: this }, function* () {
      const { trigger, event } = options;
      log('running trigger', { triggerId: trigger.id, spec: trigger.spec, event });

      const invocationId = EntityId.random();
      const invocation: InvocationsState = {
        invocationId,
        trigger,
        function: null,
        event,
        result: null,
      };

      const registry = yield* Registry.AtomRegistry;
      registry.update(
        this._state,
        Struct.evolve({
          invocations: (invocations) => [...invocations, invocation].slice(-MAX_TRACKED_INVOCATIONS),
        }),
      );

      // Sandboxed section. The global concurrency limiter wraps the actual op invocation so that
      // the total number of concurrent invocations across all triggers/kinds never exceeds
      // `_maxConcurrency`, on top of any per-trigger concurrency enforced at the call sites.
      const result = yield* Effect.gen({ self: this }, function* () {
        if (!trigger.enabled) {
          return yield* Effect.die(new Error('Attempting to invoke disabled trigger'));
        }

        if (!trigger.runnable) {
          return yield* Effect.die(new Error('Trigger has no runnable reference'));
        }

        // Resolve the operation definition from the persistent record.
        const serializedOperation = yield* Database.load(trigger.runnable).pipe(Effect.orDie);
        invariant(Obj.instanceOf(Operation.PersistentOperation, serializedOperation));
        const functionDef = Operation.deserialize(serializedOperation);

        const registry = yield* Registry.AtomRegistry;
        registry.update(
          this._state,
          Struct.evolve({
            invocations: Array.map((_) =>
              _.invocationId === invocation.invocationId ? { ..._, function: functionDef } : _,
            ),
          }),
        );

        // Prepare input data
        const inputData = this._prepareInputData(trigger, event);

        const manager = yield* ProcessManager.Service;
        const executable = Process.fromOperation(functionDef, manager.operationHandlerSet);
        // Thread the dispatcher's space through `ProcessManager.spawn` so the
        // spawned process resolves space-affinity services (e.g.
        // `Database.Service`) for the same space the dispatcher is bound to.
        // Pulled from the captured `Database.Service` rather than a separate
        // option so the dispatcher API stays single-source-of-truth on space.
        const { db } = yield* Database.Service;
        const handle = yield* manager.spawn(executable, {
          name: functionDef.meta.name ? `${functionDef.meta.name} (${functionDef.meta.key})` : functionDef.meta.key,
          environment: { space: db.spaceId },
          traceMeta: { trigger: Ref.make(trigger) },
        });

        return yield* handle.runAndExit({ inputs: [inputData] }).pipe(
          Stream.runCollect,
          Effect.map(Array.head),
          Effect.flatMap((result) => Effect.fromOption(result)),
          Effect.catchTag('NoSuchElementError', () => Effect.die(new Error('Trigger invocation produced no output'))),
        );
      }).pipe(this._concurrencyLimiter.withPermits(1), Effect.exit);

      const triggerExecutionResult: TriggerExecutionResult = {
        triggerId: trigger.id,
        result,
        feedCursor: trigger.spec?.kind === 'feed' && 'cursor' in event ? event.cursor : undefined,
      };
      const runtimeState = this._getOrCreateRuntimeState(trigger);
      runtimeState.lastResult = result;
      if (Exit.isSuccess(result)) {
        log('trigger execution success', {
          triggerId: trigger.id,
        });
        // A successful run clears both the cooldown and any pending retry.
        runtimeState.cooldownUntil = undefined;
        runtimeState.retry = undefined;
      } else if (this._isRunAgainRequest(result)) {
        // `RunAgainError` is a request to re-invoke the trigger, not a genuine failure: skip the
        // cooldown and enqueue a pending retry at the tail of the queue.
        runtimeState.cooldownUntil = undefined;
        runtimeState.retry = { event, enqueuedAt: this._retrySequence++ };
        log('trigger requested re-invocation', { triggerId: trigger.id });
      } else {
        // TODO(wittjosiah): A fiber interrupt (e.g. a scheduled timer fire colliding with an in-flight
        //   `runAgain` retry, or the dispatcher stopping) reaches here and arms a failure cooldown. An
        //   interrupt is not a genuine failure — distinguish `Cause.hasInterrupts(result.cause)` and
        //   treat it as neutral (re-schedulable, no cooldown) instead.
        const cooldownMs = Duration.toMillis(this._failureCooldown);
        const until = new Date(this.getCurrentTime().getTime() + cooldownMs);
        runtimeState.cooldownUntil = until;
        runtimeState.retry = undefined;
        log.error('trigger execution failure', {
          triggerId: trigger.id,
          cooldownUntil: until,
          error: EffectEx.causeToError(result.cause),
        });
      }
      this._publishRuntimeStatuses(registry);
      registry.update(this._state, (state): TriggerDispatcherState => ({
        ...state,
        invocations: state.invocations.map((_) => (_.invocationId === invocation.invocationId ? { ..._, result } : _)),
      }));

      return triggerExecutionResult;
    }).pipe(
      Effect.withSpan('TriggerDispatcher.invokeTrigger', {
        attributes: {
          [SpanAttributes.TRIGGER.id]: options.trigger.id,
          ...(options.trigger.spec ? { [SpanAttributes.TRIGGER.kind]: options.trigger.spec.kind } : {}),
        },
      }),
      Effect.provide(this._services),
    );

  /**
   * Distinguish a {@link RunAgainError} re-invocation request from a genuine failure. The process
   * failure cause propagates intact, surfacing the error as a defect (`Exit.die(RunAgainError)`).
   */
  private _isRunAgainRequest = (result: Exit.Exit<unknown>): boolean =>
    Exit.isFailure(result) && RunAgainError.is(Cause.squash(result.cause));

  invokeScheduledTriggers = ({
    kinds = ['timer', 'feed', 'subscription'],
    untilExhausted = false,
    triggerIds,
  }: { kinds?: Trigger.Kind[]; untilExhausted?: boolean; triggerIds?: readonly string[] } = {}): Effect.Effect<
    TriggerExecutionResult[]
  > =>
    Effect.gen({ self: this }, function* () {
      yield* this.refreshTriggers();
      const selected = triggerIds !== undefined ? new Set(triggerIds) : undefined;
      const isSelected = (triggerId: string) => selected === undefined || selected.has(triggerId);
      const invocations: TriggerExecutionResult[] = [];
      for (const kind of kinds) {
        switch (kind) {
          case 'timer':
            {
              const now = this.getCurrentTime();
              const triggersToInvoke: Trigger.Trigger[] = [];

              for (const [triggerId, entry] of this._runtimeState.entries()) {
                if (!isSelected(triggerId)) {
                  continue;
                }
                if (entry.cron && entry.nextExecution && entry.nextExecution <= now) {
                  // Update next execution time using Effect's Cron
                  entry.nextExecution = Cron.next(entry.cron, now);

                  if (this._isInCooldown(triggerId)) {
                    log('skipping trigger in cooldown', { triggerId });
                    continue;
                  }
                  triggersToInvoke.push(entry.trigger);
                }
              }

              // Invoke all due triggers. The global concurrency limiter enforces `_maxConcurrency`
              // inside `invokeTrigger`, so the fan-out here is unbounded.
              invocations.push(
                ...(yield* Effect.forEach(
                  triggersToInvoke,
                  (trigger) =>
                    this.invokeTrigger({
                      trigger,
                      event: { tick: now.getTime() } satisfies TriggerEvent.TimerEvent,
                    }),
                  { concurrency: 'unbounded' },
                )),
              );
            }
            break;
          case 'feed': {
            for (const trigger of this._triggers) {
              const spec = trigger.spec;
              if (spec?.kind !== 'feed' || !isSelected(trigger.id)) {
                continue;
              }
              if (this._isInCooldown(trigger.id)) {
                log('skipping trigger in cooldown', { triggerId: trigger.id });
                continue;
              }
              const feedRef = spec.feed;
              if (!feedRef) {
                log('skipping feed trigger with no feed reference', { triggerId: trigger.id });
                continue;
              }
              const feed = yield* Database.load(feedRef).pipe(Effect.orDie);

              const concurrency = Math.min(trigger.concurrency ?? 1, this._maxConcurrency);

              // Read only what follows the cursor, one page at a time: the cursor is pushed into the
              // index scan, so the cost of a tick is the size of the page rather than of the feed.
              let cursor = readFeedCursor(trigger);
              for (;;) {
                const chunk = yield* Feed.query(
                  feed,
                  Query.select(Filter.feedCursor({ begin: cursor })).limit(concurrency),
                ).run.pipe(Effect.map((objects) => filterReadyFeedItems(objects, cursor)));
                if (chunk.length === 0) {
                  break;
                }

                const invocationsThisIteration = yield* Effect.forEach(
                  chunk,
                  ({ item, cursor: itemCursor }) =>
                    this.invokeTrigger({
                      trigger,
                      event: {
                        feed: feedRef,
                        item,
                        cursor: itemCursor,
                      } satisfies TriggerEvent.FeedEvent,
                    }),
                  { concurrency: 'unbounded' },
                );
                invocations.push(...invocationsThisIteration);

                // Update trigger cursor only if the invocation was successful.
                const lastSuccessfulInvocation = pipe(
                  invocationsThisIteration,
                  Array.takeWhile((invocation) => Exit.isSuccess(invocation.result)),
                  Array.last,
                );
                if (Option.isSome(lastSuccessfulInvocation)) {
                  const advanced = Feed.Cursor.make(lastSuccessfulInvocation.value.feedCursor ?? failedInvariant());
                  cursor = advanced;
                  Obj.update(trigger, (trigger) => {
                    Annotation.set(trigger, Feed.CursorAnnotation, advanced);
                    // Drop any checkpoint left by the release that kept it as a foreign key.
                    Obj.deleteKeys(trigger, LEGACY_KEY_FEED_CURSOR);
                  });
                  yield* Database.flush();
                } else {
                  break;
                }

                // We only invoke one trigger for each feed at a time.
                if (!untilExhausted) {
                  break;
                }
              }
            }
            break;
          }
          case 'subscription': {
            for (const trigger of this._triggers) {
              const spec = trigger.spec;
              if (spec?.kind !== 'subscription' || !isSelected(trigger.id)) {
                continue;
              }
              if (this._isInCooldown(trigger.id)) {
                log('skipping trigger in cooldown', { triggerId: trigger.id });
                continue;
              }

              const { db } = yield* Database.Service;

              // Include tombstones so deletions surface uniformly for both sources via the
              // `Obj.isDeleted` branch below: the database emits a real tombstone, and a feed
              // removal (`Feed.remove`) now also produces a queryable tombstone that retains the
              // object's type/body (the index merges the `{ id, '@deleted': true }` block onto the
              // prior snapshot — see `FtsIndex.update` / `EntityMetaIndex.update`).
              const objects = yield* Database.query(Query.fromAst(spec.query.ast).options({ deleted: 'include' })).run;

              const state: TriggerState = yield* TriggerStateStore.getState(trigger.id).pipe(
                Effect.catchTag('TriggerStateNotFound', () =>
                  Effect.succeed({
                    version: '1',
                    triggerId: trigger.id,
                    state: {
                      _tag: 'subscription',
                      processedVersions: {} as Record<string, string>,
                    },
                  } satisfies TriggerState),
                ),
              );
              invariant(state.state?._tag === 'subscription');
              // `processedVersions` grows with the number of distinct objects ever seen by this
              // trigger (an entry is dropped only when an object is observed deleted). That is
              // acceptable for the local dispatcher, whose state is process-scoped; an edge
              // dispatcher persisting this across restarts needs a bounded strategy (e.g. TTL or
              // a high-water-mark cursor) instead of an unbounded per-object signature map.
              const processedVersions = state.state.processedVersions;

              const fire = (type: TriggerEvent.SubscriptionMutationType, objectId: string, uri: URI.URI) =>
                this.invokeTrigger({
                  trigger,
                  event: {
                    type,
                    subject: db.makeRef(uri),
                    changedObjectId: objectId,
                  } satisfies TriggerEvent.SubscriptionEvent,
                });

              let updated = false;
              for (const object of objects) {
                const existingSignature = Record.get(processedVersions, object.id);

                // Tombstone (database or feed): emit `deleted` once, then drop the key so a later
                // re-creation reads as a fresh `created`.
                if (Obj.isDeleted(object)) {
                  if (Option.isSome(existingSignature)) {
                    invocations.push(yield* fire('deleted', object.id, Obj.getURI(object)));
                    delete (processedVersions as Record<string, string>)[object.id];
                    updated = true;
                  }
                  continue;
                }

                // Change detection is by content signature rather than `Obj.version`: feed-backed
                // objects are unversioned (no automerge heads), so version comparison can't see a
                // re-append as an update. A canonical JSON signature covers both the database and
                // feed sources uniformly.
                const currentSignature = objectSignature(object);
                const type: TriggerEvent.SubscriptionMutationType | undefined = Option.isNone(existingSignature)
                  ? 'created'
                  : existingSignature.value !== currentSignature
                    ? 'updated'
                    : undefined;
                if (!type) {
                  continue;
                }

                invocations.push(yield* fire(type, object.id, Obj.getURI(object)));
                (processedVersions as Record<string, string>)[object.id] = currentSignature;
                updated = true;
              }

              if (updated) {
                yield* TriggerStateStore.saveState(state);
              }
            }
            break;
          }
          case 'direct':
            // Direct triggers are only invoked through invokeTrigger.
            break;
          default: {
            return yield* Effect.die(new Error(`Unknown trigger kind: ${kind}`));
          }
        }
      }

      // Drain pending `RunAgainError` retries at the tail of the queue, regardless of trigger kind
      // (a `direct` trigger that requested a retry is re-invoked here even though it is skipped by
      // the per-kind dispatch above). Each pass takes the retries pending at that moment in FIFO
      // order; a retry that re-requests re-runs is re-enqueued with a fresh sequence number so it
      // lands again at the tail. With `untilExhausted`, keep draining until no retries remain.
      invocations.push(...(yield* this._drainRetries({ untilExhausted })));

      return invocations;
    }).pipe(
      Effect.withSpan('TriggerDispatcher.invokeScheduledTriggers', {
        attributes: { [SpanAttributes.TRIGGER.kind]: kinds },
      }),
      Effect.provide(this._services),
    );

  /**
   * Re-invoke triggers with a pending {@link RunAgainError} retry. Retries respect the global
   * concurrency limit (enforced within {@link invokeTrigger}) and are processed FIFO.
   */
  private _drainRetries = ({ untilExhausted }: { untilExhausted: boolean }): Effect.Effect<TriggerExecutionResult[]> =>
    Effect.gen({ self: this }, function* () {
      const invocations: TriggerExecutionResult[] = [];
      while (true) {
        const pending: { trigger: Trigger.Trigger; enqueuedAt: number; event: TriggerEvent.TriggerEvent }[] = [];
        for (const entry of this._runtimeState.values()) {
          if (entry.retry) {
            pending.push({ trigger: entry.trigger, enqueuedAt: entry.retry.enqueuedAt, event: entry.retry.event });
          }
        }
        if (pending.length === 0) {
          break;
        }
        pending.sort((a, b) => a.enqueuedAt - b.enqueuedAt);
        log('draining run-again retries', {
          count: pending.length,
          triggerIds: pending.map(({ trigger }) => trigger.id),
          untilExhausted,
        });

        // Clear the pending flags before invoking; `invokeTrigger` re-sets `retry` (with a fresh
        // sequence number) if the trigger requests yet another re-run.
        const batch = pending.map(({ trigger, event }) => {
          const entry = this._runtimeState.get(trigger.id);
          if (entry) {
            entry.retry = undefined;
          }
          return { trigger, event };
        });

        invocations.push(
          ...(yield* Effect.forEach(batch, ({ trigger, event }) => this.invokeTrigger({ trigger, event }), {
            concurrency: 'unbounded',
          })),
        );

        if (!untilExhausted) {
          break;
        }
      }
      return invocations;
    });

  advanceTime = (duration: Duration.Duration): Effect.Effect<void> =>
    Effect.gen({ self: this }, function* () {
      if (this.timeControl !== 'manual') {
        return yield* Effect.die(new Error('advanceTime can only be used in manual time control mode'));
      }

      const millis = Duration.toMillis(duration);
      this._internalTime = new Date(this._internalTime.getTime() + millis);

      log('Advanced internal time', {
        newTime: this._internalTime,
        advancedBy: Duration.format(duration),
      });
    }).pipe(Effect.orDie);

  getCurrentTime = (): Date => {
    if (this.timeControl === 'natural') {
      return new Date();
    } else {
      return new Date(this._internalTime);
    }
  };

  refreshTriggers = (): Effect.Effect<void> =>
    Effect.gen({ self: this }, function* () {
      const triggers = yield* this._fetchTriggers();
      this._triggers = triggers;
      const currentTriggerIds = new Set(triggers.map((t) => t.id));

      // Remove runtime state for triggers that are no longer present.
      for (const triggerId of this._runtimeState.keys()) {
        if (!currentTriggerIds.has(triggerId)) {
          this._runtimeState.delete(triggerId);
        }
      }

      // Create or update a runtime-state entry for every trigger so cooldown and retry state is
      // tracked uniformly across kinds. Existing cooldown/retry/last-result state is preserved.
      for (const trigger of triggers) {
        const entry = this._getOrCreateRuntimeState(trigger);

        // Refresh the cron schedule for timer triggers, carrying over the next execution time.
        if (trigger.spec?.kind === 'timer' && trigger.enabled) {
          const timerSpec = trigger.spec as Trigger.TimerSpec;

          // Parse cron expression using Effect's Cron module
          const cronEither = Cron.parse(timerSpec.cron);

          if (Result.isSuccess(cronEither)) {
            const cron = cronEither.success;
            const now = this.getCurrentTime();
            const period = cronPeriod(cron, now);

            // A schedule finer than the poll cannot be honoured — the tick would find it due, fire it
            // once and skip to the next occurrence after now, so the missed ones are dropped rather
            // than delayed. Refusing it says that out loud instead of running at the poll rate while
            // claiming a faster one. A caller that genuinely needs sub-minute firing (a test) shortens
            // `livePollInterval`, which moves this floor with it.
            if (period !== undefined && Duration.isLessThan(period, this.livePollInterval)) {
              entry.cron = undefined;
              entry.nextExecution = undefined;
              log.error('Cron schedule is finer than the trigger poll interval; trigger will not run', {
                triggerId: trigger.id,
                cron: timerSpec.cron,
                period: Duration.toMillis(period),
                livePollInterval: Duration.toMillis(this.livePollInterval),
              });
              continue;
            }

            const nextExecution = entry.nextExecution ?? Cron.next(cron, now);

            log('Updated scheduled trigger', {
              triggerId: trigger.id,
              cron: timerSpec.cron,
              nextExecution,
              now,
            });
            entry.cron = cron;
            entry.nextExecution = nextExecution;
          } else {
            // Drop any stale cron schedule so an invalid expression is never fired.
            entry.cron = undefined;
            entry.nextExecution = undefined;
            log.error('Invalid cron expression', {
              triggerId: trigger.id,
              cron: timerSpec.cron,
              error: cronEither.failure.message,
            });
          }
        } else {
          // Not a schedulable timer trigger (or disabled): clear any cron schedule.
          entry.cron = undefined;
          entry.nextExecution = undefined;
        }
      }

      if (this._running && this.timeControl === 'natural') {
        yield* this.#refreshReactiveSources();
      }

      const registry = yield* Registry.AtomRegistry;
      this._publishRuntimeStatuses(registry);

      log('Updated runtime trigger state', { count: this._runtimeState.size });
    })
      .pipe(Effect.withSpan('TriggerDispatcher.refreshTriggers'))
      .pipe(Effect.provide(this._services));

  private _fetchTriggers = () =>
    Effect.gen({ self: this }, function* () {
      // The local dispatcher only runs triggers that are not explicitly routed to edge.
      if (this.#triggerQuery) {
        // `#subscribeToTriggers` keeps this query current reactively — reuse its cached results
        // instead of issuing a fresh database query on every poll tick.
        return this.#triggerQuery.results.filter((t) => !t.remote);
      }
      const objects = yield* Database.query(
        Query.select(Filter.type(Trigger.Trigger)).debugLabel('TriggerDispatcher.fetchTriggers'),
      ).run;
      return objects.filter((t) => !t.remote);
    }).pipe(Effect.withSpan('TriggerDispatcher.fetchTriggers'));

  /**
   * Subscribe once to a live `Trigger` query so trigger objects update reactively as they change,
   * replacing the previous behavior of re-querying the database for the full trigger list on every
   * natural-time poll tick (~1/s), the dominant contributor to `TriggerDispatcher`'s idle-time SQL
   * churn. Torn down in {@link #teardownTriggerSubscription}.
   */
  #subscribeToTriggers = (): Effect.Effect<void> =>
    Effect.gen({ self: this }, function* () {
      const queryResult = yield* Database.query(
        Query.select(Filter.type(Trigger.Trigger)).debugLabel('TriggerDispatcher.watchTriggers'),
      );
      this.#triggerQuery = queryResult;
      this.#triggerQueryUnsubscribe = queryResult.subscribe(
        () => {
          // Tracked so a subsequent `#teardownTriggerSubscription` can interrupt this fiber —
          // otherwise a refresh forked just before shutdown could still complete afterward, see
          // `this.#triggerQuery` as already cleared, fall back to a fresh one-shot query, and
          // repopulate trigger state after the dispatcher has stopped.
          this.#pendingRefreshFiber = Effect.runForkWith(this._services)(
            this.refreshTriggers().pipe(
              Effect.tapCause((cause) =>
                Effect.sync(() => log.error('failed to refresh triggers', { error: EffectEx.causeToError(cause) })),
              ),
            ),
          );
        },
        { fire: true },
      );
    }).pipe(Effect.provide(this._services));

  /**
   * Rebuild the live queries that wake feed and subscription triggers so the set matches the
   * current triggers: drop sources whose trigger is gone or whose query has gone stale, and
   * subscribe the ones that are missing. Called from {@link refreshTriggers}, which the trigger
   * query already re-runs whenever a trigger changes — including the cursor write that dispatch
   * itself performs, which is what makes a feed source follow its cursor forward.
   */
  #refreshReactiveSources = (): Effect.Effect<void> =>
    // Serialized: `refreshTriggers` runs both from the trigger-query callback and from
    // `invokeScheduledTriggers`, and two interleaved reconciliations would each see a source as
    // missing, subscribe it, and overwrite the other's entry — leaking the unsubscribe that the
    // overwrite dropped.
    this.#reactiveSourceLock.withPermits(1)(
      Effect.gen({ self: this }, function* () {
        const wanted = new Map<string, { key: string; trigger: Trigger.Trigger }>();
        for (const trigger of this._triggers) {
          const spec = trigger.spec;
          if (!trigger.enabled || (spec?.kind !== 'feed' && spec?.kind !== 'subscription')) {
            continue;
          }
          // Everything the live query is derived from, so an edit to the trigger's feed reference or
          // its subscription query replaces the source instead of leaving a stale one watching the
          // old data.
          const key =
            spec.kind === 'feed'
              ? `feed:${spec.feed?.uri ?? ''}:${readFeedCursor(trigger) ?? ''}`
              : `subscription:${JSON.stringify(spec.query.ast)}`;
          wanted.set(trigger.id, { key, trigger });
        }

        for (const [triggerId, source] of this.#reactiveSources) {
          if (wanted.get(triggerId)?.key !== source.key) {
            source.unsubscribe();
            this.#reactiveSources.delete(triggerId);
          }
        }

        for (const [triggerId, { key, trigger }] of wanted) {
          if (this.#reactiveSources.has(triggerId)) {
            continue;
          }
          const unsubscribe = yield* this.#subscribeToTriggerSource(trigger);
          if (unsubscribe) {
            this.#reactiveSources.set(triggerId, { key, unsubscribe });
          }
        }
      }).pipe(Effect.provide(this._services)),
    );

  /**
   * Subscribe to whatever a non-timer trigger reacts to, dispatching its kind on every change.
   * Returns `undefined` when the trigger has nothing to watch (e.g. a feed reference that no longer
   * resolves), so no source is recorded and the next refresh retries.
   */
  #subscribeToTriggerSource = (trigger: Trigger.Trigger): Effect.Effect<(() => void) | undefined> =>
    Effect.gen({ self: this }, function* () {
      const spec = trigger.spec;
      const queryResult = yield* spec?.kind === 'feed'
        ? Effect.gen({ self: this }, function* () {
            if (!spec.feed) {
              return undefined;
            }
            const feed = yield* Database.load(spec.feed).pipe(Effect.orDie);
            const cursor = readFeedCursor(trigger);
            // One item past the cursor is enough to know there is work; the dispatch that follows
            // reads the pages it needs. Watching the whole feed would restore the full scan this
            // subscription exists to avoid.
            return yield* Feed.query(feed, Query.select(Filter.feedCursor({ begin: cursor })).limit(1));
          })
        : spec?.kind === 'subscription'
          ? Database.query(Query.fromAst(spec.query.ast).options({ deleted: 'include' }))
          : Effect.succeed(undefined);
      if (!queryResult) {
        return undefined;
      }

      const kind = spec!.kind as 'feed' | 'subscription';
      return queryResult.subscribe(() => this.#dispatchReactively(kind, trigger.id), { fire: true });
    }).pipe(Effect.provide(this._services));

  /**
   * Fork a dispatch of the single trigger whose source fired, serialized so overlapping wake-ups
   * never invoke a trigger twice for the same item. Scoping it to one trigger keeps one feed
   * append from re-querying every other trigger of the same kind.
   */
  #dispatchReactively = (kind: 'feed' | 'subscription', triggerId: string): void => {
    // Held in a cell rather than a plain binding: a dispatch that completes without an async
    // boundary runs its finalizer before `runFork` returns, so the finalizer must tolerate not
    // having the fiber yet — and the add below must not then resurrect a completed one.
    const forked: { fiber?: Fiber.Fiber<void, never>; done?: boolean } = {};
    forked.fiber = Effect.runForkWith(this._services)(
      this.#reactiveDispatchLock
        .withPermits(1)(this.invokeScheduledTriggers({ kinds: [kind], triggerIds: [triggerId], untilExhausted: true }))
        .pipe(
          Effect.asVoid,
          Effect.tapCause((cause) =>
            Effect.sync(() =>
              log.error('reactive trigger dispatch failed', { kind, triggerId, error: EffectEx.causeToError(cause) }),
            ),
          ),
          Effect.catchCause(() => Effect.void),
          Effect.ensuring(
            Effect.sync(() => {
              forked.done = true;
              if (forked.fiber) {
                this.#reactiveDispatchFibers.delete(forked.fiber);
              }
            }),
          ),
        ),
    );
    if (!forked.done) {
      this.#reactiveDispatchFibers.add(forked.fiber);
    }
  };

  /** Drop every reactive source and interrupt the dispatches they forked. */
  #teardownReactiveSources = (): Effect.Effect<void> =>
    Effect.gen({ self: this }, function* () {
      for (const source of this.#reactiveSources.values()) {
        source.unsubscribe();
      }
      this.#reactiveSources.clear();
      const fibers = [...this.#reactiveDispatchFibers];
      this.#reactiveDispatchFibers.clear();
      yield* Effect.forEach(fibers, Fiber.interrupt, { discard: true });
    });

  /**
   * Unsubscribe from the live trigger query and interrupt any refresh it forked, so neither can
   * repopulate trigger state after the dispatcher has stopped — called from both {@link stop} and
   * the natural-time-processing failure path in {@link start} (a crash bypasses `stop()` since it
   * sets `_running` to `false` directly).
   */
  #teardownTriggerSubscription = (): Effect.Effect<void> =>
    Effect.gen({ self: this }, function* () {
      yield* this.#teardownReactiveSources();
      this.#triggerQueryUnsubscribe?.();
      this.#triggerQueryUnsubscribe = undefined;
      this.#triggerQuery = undefined;
      if (this.#pendingRefreshFiber) {
        yield* Fiber.interrupt(this.#pendingRefreshFiber);
        this.#pendingRefreshFiber = undefined;
      }
    });

  private _startNaturalTimeProcessing = (): Effect.Effect<void> =>
    Effect.gen({ self: this }, function* () {
      // Timer triggers only: feed and subscription triggers are woken by `#reactiveSources` when
      // their data changes, so the wall clock no longer re-reads every feed on every tick.
      yield* this.invokeScheduledTriggers({ kinds: ['timer'] });
    }).pipe(Effect.repeat(Schedule.fixed(this.livePollInterval)), Effect.asVoid);

  private _prepareInputData = (trigger: Trigger.Trigger, event: TriggerEvent.TriggerEvent): any => {
    return createInvocationPayload(trigger, event);
  };
}

/**
 * Foreign key a previous release stored a feed trigger's cursor under, before it became
 * {@link Feed.CursorAnnotation}. Read so a trigger already in the field resumes where it left off
 * instead of re-dispatching its whole feed; dropped the first time the cursor advances.
 */
export const LEGACY_KEY_FEED_CURSOR = 'org.dxos.key.local-trigger-dispatcher.feed-cursor';

/**
 * The cursor a feed trigger has dispatched up to, or `undefined` when it has dispatched nothing.
 */
const readFeedCursor = (trigger: Trigger.Trigger): Feed.Cursor | undefined => {
  const annotated = Annotation.get(trigger, Feed.CursorAnnotation).pipe(Option.getOrUndefined);
  const stored = annotated ?? Obj.getKeys(trigger, LEGACY_KEY_FEED_CURSOR).at(0)?.id;
  return stored !== undefined ? Feed.Cursor.make(stored) : undefined;
};

/**
 * Canonical content signature of an entity, used by subscription triggers to detect changes across
 * both the database and feed sources. Keys are sorted so the string is stable regardless of property
 * order; a change to any field (or to the feed queue position on re-append) yields a new signature.
 */
const objectSignature = (object: Obj.Unknown): string => {
  const sortKeys = (input: unknown): unknown => {
    if (Array.isArray(input)) {
      return input.map(sortKeys);
    }
    if (input !== null && typeof input === 'object') {
      return Object.keys(input as Record<string, unknown>)
        .sort()
        .reduce<Record<string, unknown>>((acc, key) => {
          acc[key] = sortKeys((input as Record<string, unknown>)[key]);
          return acc;
        }, {});
    }
    return input;
  };
  return JSON.stringify(sortKeys(Entity.toJSON(object)));
};
