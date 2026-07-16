//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom';
import { Registry } from '@effect-atom/atom';
import * as Array from 'effect/Array';
import * as Cause from 'effect/Cause';
import * as Chunk from 'effect/Chunk';
import * as Context from 'effect/Context';
import * as Cron from 'effect/Cron';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Either from 'effect/Either';
import * as Exit from 'effect/Exit';
import * as Fiber from 'effect/Fiber';
import { pipe } from 'effect/Function';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Record from 'effect/Record';
import * as Schedule from 'effect/Schedule';
import * as Stream from 'effect/Stream';
import * as Struct from 'effect/Struct';

import { Operation, Process, RunAgainError, Trigger, TriggerEvent } from '@dxos/compute';
import { ProcessManager } from '@dxos/compute-runtime';
import { Database, Entity, Feed, Filter, Obj, Query, Ref } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { failedInvariant, invariant } from '@dxos/invariant';
import { EntityId } from '@dxos/keys';
import { log } from '@dxos/log';

import { getDeliveredFeedIds, setDeliveredFeedIds } from './feed-delivery-state';
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
   * @default 1 second
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
 * Per-item outcome of a feed trigger's poll cycle: either a real invocation, or (when
 * `FeedSpec.ignoreUpdates` is set and the item is an update) a skip that still counts as success for
 * cursor-advancement purposes.
 */
type FeedTriggerOutcome =
  | { readonly item: Entity.Unknown; readonly position: string; readonly isUpdate: boolean; readonly skipped: true }
  | {
      readonly item: Entity.Unknown;
      readonly position: string;
      readonly isUpdate: boolean;
      readonly skipped: false;
      readonly invocation: TriggerExecutionResult;
    };

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
export class TriggerDispatcher extends Context.Tag('@dxos/functions/TriggerDispatcher')<
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
     */
    invokeScheduledTriggers(opts?: {
      kinds?: Trigger.Kind[];
      untilExhausted?: boolean;
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
>() {
  static layer = (
    options: Omit<TriggerDispatcherOptions, 'services'>,
  ): Layer.Layer<TriggerDispatcher, never, TriggerDispatcherServices> =>
    Layer.effect(
      TriggerDispatcher,
      Effect.gen(function* () {
        const services = yield* Effect.context<TriggerDispatcherServices>();
        return new TriggerDispatcherImpl({ ...options, services });
      }),
    );
}

const DEFAULT_MAX_CONCURRENCY = 5;
const DEFAULT_FAILURE_COOLDOWN = Duration.seconds(30);

class TriggerDispatcherImpl implements Context.Tag.Service<TriggerDispatcher> {
  readonly livePollInterval: Duration.Duration;
  readonly timeControl: TimeControl;

  private _services: Context.Context<TriggerDispatcherServices>;
  private _running = false;
  private _internalTime: Date;
  private _timerFiber: Fiber.Fiber<void, void> | undefined;
  private _triggers: Trigger.Trigger[] = [];

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
  private _concurrencyLimiter: Effect.Semaphore;

  /**
   * Monotonic counter assigning FIFO ordering to pending retries so re-enqueued retries land at
   * the tail of the queue.
   */
  private _retrySequence = 0;

  constructor(options: TriggerDispatcherOptions) {
    this._services = options.services;
    this.timeControl = options.timeControl;
    this.livePollInterval = options.livePollInterval ?? Duration.seconds(1);
    this._internalTime = options.startingTime ?? new Date();
    this._maxConcurrency = options.maxConcurrency ?? DEFAULT_MAX_CONCURRENCY;
    this._failureCooldown = options.failureCooldown ?? DEFAULT_FAILURE_COOLDOWN;
    this._concurrencyLimiter = Effect.unsafeMakeSemaphore(this._maxConcurrency);
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
  private _publishRuntimeStatuses = (registry: Registry.Registry): void => {
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
    Effect.gen(this, function* () {
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
        this._timerFiber = yield* this._startNaturalTimeProcessing().pipe(
          Effect.tapErrorCause((cause) => {
            const error = EffectEx.causeToError(cause);
            log.error('trigger dispatcher error', { error });
            this._running = false;
            registry.update(
              this._state,
              Struct.evolve({
                enabled: () => false,
                errors: (errors) => [...errors, error].slice(-MAX_TRACKED_ERRORS),
              }),
            );
            return Effect.void;
          }),
          Effect.forkDaemon,
        );
      } else {
        return yield* Effect.dieMessage('TriggerDispatcher started in manual time control mode');
      }

      log.info('TriggerDispatcher started', { timeControl: this.timeControl });
    }).pipe(Effect.provide(this._services));

  stop = (): Effect.Effect<void> =>
    Effect.gen(this, function* () {
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

      // Clear runtime state for all triggers.
      this._runtimeState.clear();
      this._publishRuntimeStatuses(registry);

      log.info('TriggerDispatcher stopped');
    }).pipe(Effect.provide(this._services));

  invokeTrigger = (options: InvokeTriggerOptions): Effect.Effect<TriggerExecutionResult> =>
    Effect.gen(this, function* () {
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
      const result = yield* Effect.gen(this, function* () {
        if (!trigger.enabled) {
          return yield* Effect.dieMessage('Attempting to invoke disabled trigger');
        }

        if (!trigger.runnable) {
          return yield* Effect.dieMessage('Trigger has no runnable reference');
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
          Effect.map(Chunk.head),
          Effect.flatten,
          Effect.catchTag('NoSuchElementException', () => Effect.dieMessage('Trigger invocation produced no output')),
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
      registry.update(
        this._state,
        Struct.evolve({
          invocations: Array.map((_) =>
            _.invocationId === invocation.invocationId ? { ..._, result: () => result } : _,
          ),
        }),
      );

      return triggerExecutionResult;
    }).pipe(Effect.provide(this._services));

  /**
   * Distinguish a {@link RunAgainError} re-invocation request from a genuine failure. The process
   * failure cause propagates intact, surfacing the error as a defect (`Exit.die(RunAgainError)`).
   */
  private _isRunAgainRequest = (result: Exit.Exit<unknown>): boolean =>
    Exit.isFailure(result) && RunAgainError.is(Cause.squash(result.cause));

  invokeScheduledTriggers = ({ kinds = ['timer', 'feed', 'subscription'], untilExhausted = false } = {}): Effect.Effect<
    TriggerExecutionResult[]
  > =>
    Effect.gen(this, function* () {
      yield* this.refreshTriggers();
      const invocations: TriggerExecutionResult[] = [];
      for (const kind of kinds) {
        switch (kind) {
          case 'timer':
            {
              const now = this.getCurrentTime();
              const triggersToInvoke: Trigger.Trigger[] = [];

              for (const [triggerId, entry] of this._runtimeState.entries()) {
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
              if (spec?.kind !== 'feed') {
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
              const cursor = Obj.getKeys(trigger, KEY_FEED_CURSOR).at(0)?.id;
              const deliveredIds = getDeliveredFeedIds(trigger);
              const feed = yield* Database.load(feedRef).pipe(Effect.orDie);

              const concurrency = Math.min(trigger.concurrency ?? 1, this._maxConcurrency);

              // TODO(dmaretskyi): Include cursor & limit in the query.
              const chunks = yield* Feed.query(feed, Filter.everything()).run.pipe(
                Effect.map((objects) => filterReadyFeedItems(objects, cursor)),
                Effect.map(Array.chunksOf(concurrency)),
              );

              for (const chunk of chunks) {
                // `isUpdate` is computed from the delivered-ids snapshot taken before this chunk —
                // stable across the chunk's concurrent invocations. `ignoreUpdates` items are never
                // invoked (only cursor-advanced), which is why this can't be a plain `invokeTrigger`
                // map: each item independently resolves to either an invocation or a skip.
                const outcomesThisIteration = yield* Effect.forEach(
                  chunk,
                  ({ item, position }): Effect.Effect<FeedTriggerOutcome, never, never> => {
                    const isUpdate = deliveredIds.has(item.id);
                    if (spec.ignoreUpdates && isUpdate) {
                      return Effect.succeed({ item, position, isUpdate, skipped: true });
                    }
                    return this.invokeTrigger({
                      trigger,
                      event: {
                        feed: feedRef,
                        item,
                        cursor: position,
                        isUpdate,
                      } satisfies TriggerEvent.FeedEvent,
                    }).pipe(Effect.map((invocation) => ({ item, position, isUpdate, skipped: false, invocation })));
                  },
                  { concurrency: 'unbounded' },
                );
                invocations.push(
                  ...outcomesThisIteration.flatMap((outcome) => (outcome.skipped ? [] : [outcome.invocation])),
                );

                // Update trigger cursor only past a contiguous prefix of successful invocations (or
                // ignoreUpdates skips, which count as success for cursor-advancement purposes — a
                // trailing skipped item must not pin the cursor and cause it to be re-fetched every
                // tick).
                const succeededPrefix = pipe(
                  outcomesThisIteration,
                  Array.takeWhile((outcome) => outcome.skipped || Exit.isSuccess(outcome.invocation.result)),
                );
                const lastSuccessfulOutcome = Array.last(succeededPrefix);
                if (Option.isSome(lastSuccessfulOutcome)) {
                  // Record delivered ids only for the same successful prefix, atomically with the
                  // cursor advance (same `Obj.update` + `Database.flush()` call — see
                  // feed-delivery-state.ts) — so a crash between invocation success and this write
                  // cannot desync the cursor from the delivered-ids set.
                  for (const outcome of succeededPrefix) {
                    deliveredIds.add(outcome.item.id);
                  }
                  Obj.update(trigger, (trigger) => {
                    Obj.deleteKeys(trigger, KEY_FEED_CURSOR);
                    Obj.getMeta(trigger).keys.push({
                      source: KEY_FEED_CURSOR,
                      id: lastSuccessfulOutcome.value.position ?? failedInvariant(),
                    });
                    setDeliveredFeedIds(trigger, deliveredIds);
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
              if (spec?.kind !== 'subscription') {
                continue;
              }
              if (this._isInCooldown(trigger.id)) {
                log('skipping trigger in cooldown', { triggerId: trigger.id });
                continue;
              }

              const objects = yield* Database.query(Query.fromAst(spec.query.ast)).run;

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

              let updated = false;
              for (const object of objects) {
                const existingVersion = Record.get(state.state.processedVersions, object.id).pipe(
                  Option.map(Obj.decodeVersion),
                );
                const currentVersion = Obj.version(object);
                const run =
                  Option.isNone(existingVersion) ||
                  Obj.compareVersions(currentVersion, existingVersion.value) === 'different';

                if (!run) {
                  continue;
                }

                const { db } = yield* Database.Service;
                invocations.push(
                  yield* this.invokeTrigger({
                    trigger,
                    event: {
                      // TODO(dmaretskyi): Change type not supported.
                      type: 'unknown',

                      subject: db.makeRef(Obj.getURI(object)),

                      changedObjectId: object.id,
                    } satisfies TriggerEvent.SubscriptionEvent,
                  }),
                );
                (state.state.processedVersions as any)[object.id] = Obj.encodeVersion(currentVersion);
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
            return yield* Effect.dieMessage(`Unknown trigger kind: ${kind}`);
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
    }).pipe(Effect.provide(this._services));

  /**
   * Re-invoke triggers with a pending {@link RunAgainError} retry. Retries respect the global
   * concurrency limit (enforced within {@link invokeTrigger}) and are processed FIFO.
   */
  private _drainRetries = ({ untilExhausted }: { untilExhausted: boolean }): Effect.Effect<TriggerExecutionResult[]> =>
    Effect.gen(this, function* () {
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
    Effect.gen(this, function* () {
      if (this.timeControl !== 'manual') {
        return yield* Effect.dieMessage('advanceTime can only be used in manual time control mode');
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
    Effect.gen(this, function* () {
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

          if (Either.isRight(cronEither)) {
            const cron = cronEither.right;
            const now = this.getCurrentTime();
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
              error: cronEither.left.message,
            });
          }
        } else {
          // Not a schedulable timer trigger (or disabled): clear any cron schedule.
          entry.cron = undefined;
          entry.nextExecution = undefined;
        }
      }

      const registry = yield* Registry.AtomRegistry;
      this._publishRuntimeStatuses(registry);

      log('Updated runtime trigger state', { count: this._runtimeState.size });
    })
      .pipe(Effect.withSpan('TriggerDispatcher.refreshTriggers'))
      .pipe(Effect.provide(this._services));

  private _fetchTriggers = () =>
    Effect.gen(this, function* () {
      const objects = yield* Database.query(
        Query.select(Filter.type(Trigger.Trigger)).debugLabel('TriggerDispatcher.fetchTriggers'),
      ).run;
      // The local dispatcher only runs triggers that are not explicitly routed to edge.
      return objects.filter((t) => !t.remote);
    }).pipe(Effect.withSpan('TriggerDispatcher.fetchTriggers'));

  private _startNaturalTimeProcessing = (): Effect.Effect<void> =>
    Effect.gen(this, function* () {
      yield* this.invokeScheduledTriggers();
    }).pipe(Effect.repeat(Schedule.fixed(this.livePollInterval)), Effect.asVoid);

  private _prepareInputData = (trigger: Trigger.Trigger, event: TriggerEvent.TriggerEvent): any => {
    return createInvocationPayload(trigger, event);
  };
}

/**
 * Key for the current cursor for feed triggers.
 */
export const KEY_FEED_CURSOR = 'org.dxos.key.local-trigger-dispatcher.feed-cursor';
