//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom';
import { Registry } from '@effect-atom/atom';
import * as Array from 'effect/Array';
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

import { Operation, Process, Trigger, TriggerEvent } from '@dxos/compute';
import { ProcessManager } from '@dxos/compute-runtime';
import { Database, Feed, Filter, Obj, Query, Ref } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { failedInvariant, invariant } from '@dxos/invariant';
import { EntityId } from '@dxos/keys';
import { log } from '@dxos/log';

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
 * Cront trigger runtime state.
 */
interface ScheduledTrigger {
  trigger: Trigger.Trigger;
  cron: Cron.Cron;
  nextExecution: Date;
}

type TriggerDispatcherServices = Registry.AtomRegistry | ProcessManager.Service | TriggerStateStore | Database.Service;

export type InvocationsState = {
  invocationId: EntityId;
  trigger: Trigger.Trigger;
  function: Operation.Definition.Any | null;
  event: TriggerEvent.TriggerEvent;
  result: Exit.Exit<unknown> | null;
};

export type TriggerDispatcherState = {
  enabled: boolean;
  invocations: InvocationsState[];
  errors: Error[];
};

const MAX_TRACKED_INVOCATIONS = 10;
const MAX_TRACKED_ERRORS = 10;

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
  private _scheduledTriggers = new Map<string, ScheduledTrigger>();
  // `keepAlive` prevents the registry from disposing the atom node when no subscribers
  // are mounted (e.g. when start/stop runs before the UI subscribes). Without it,
  // updates written before the first subscription are dropped and the next read
  // re-initializes to the default {enabled: false, ...}.
  private _state: Atom.Writable<TriggerDispatcherState> = Atom.make<TriggerDispatcherState>({
    enabled: false,
    invocations: [],
    errors: [],
  }).pipe(Atom.keepAlive);
  private _maxConcurrency: number;
  private _failureCooldown: Duration.Duration;
  private _cooldownUntil = new Map<string, Date>();

  constructor(options: TriggerDispatcherOptions) {
    this._services = options.services;
    this.timeControl = options.timeControl;
    this.livePollInterval = options.livePollInterval ?? Duration.seconds(1);
    this._internalTime = options.startingTime ?? new Date();
    this._maxConcurrency = options.maxConcurrency ?? DEFAULT_MAX_CONCURRENCY;
    this._failureCooldown = options.failureCooldown ?? DEFAULT_FAILURE_COOLDOWN;
  }

  private _isInCooldown = (triggerId: string): boolean => {
    const until = this._cooldownUntil.get(triggerId);
    if (!until) {
      return false;
    }
    if (until.getTime() <= this.getCurrentTime().getTime()) {
      this._cooldownUntil.delete(triggerId);
      return false;
    }
    return true;
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

      // Clear scheduled triggers
      this._scheduledTriggers.clear();
      this._cooldownUntil.clear();

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

      // Sandboxed section.
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
      }).pipe(Effect.exit);

      const triggerExecutionResult: TriggerExecutionResult = {
        triggerId: trigger.id,
        result,
        feedCursor: trigger.spec?.kind === 'feed' && 'cursor' in event ? event.cursor : undefined,
      };
      if (Exit.isSuccess(result)) {
        log('trigger execution success', {
          triggerId: trigger.id,
        });
        this._cooldownUntil.delete(trigger.id);
      } else {
        const cooldownMs = Duration.toMillis(this._failureCooldown);
        const until = new Date(this.getCurrentTime().getTime() + cooldownMs);
        this._cooldownUntil.set(trigger.id, until);
        log.error('trigger execution failure', {
          triggerId: trigger.id,
          cooldownUntil: until,
          error: EffectEx.causeToError(result.cause),
        });
      }
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

              for (const [triggerId, scheduledTrigger] of this._scheduledTriggers.entries()) {
                if (scheduledTrigger.nextExecution <= now) {
                  // Update next execution time using Effect's Cron
                  scheduledTrigger.nextExecution = Cron.next(scheduledTrigger.cron, now);

                  if (this._isInCooldown(triggerId)) {
                    log('skipping trigger in cooldown', { triggerId });
                    continue;
                  }
                  triggersToInvoke.push(scheduledTrigger.trigger);
                }
              }

              // Invoke all due triggers
              invocations.push(
                ...(yield* Effect.forEach(
                  triggersToInvoke,
                  (trigger) =>
                    this.invokeTrigger({
                      trigger,
                      event: { tick: now.getTime() } satisfies TriggerEvent.TimerEvent,
                    }),
                  { concurrency: 1 },
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
              const feed = yield* Database.load(feedRef).pipe(Effect.orDie);

              const concurrency = Math.min(trigger.concurrency ?? 1, this._maxConcurrency);

              // TODO(dmaretskyi): Include cursor & limit in the query.
              const chunks = yield* Feed.query(feed, Filter.everything()).run.pipe(
                Effect.map((objects) => filterReadyFeedItems(objects, cursor)),
                Effect.map(Array.chunksOf(concurrency)),
              );

              for (const chunk of chunks) {
                const invocationsThisIteration = yield* Effect.forEach(
                  chunk,
                  ({ item, position }) =>
                    this.invokeTrigger({
                      trigger,
                      event: {
                        feed: feedRef,
                        item,
                        cursor: position,
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
                  Obj.update(trigger, (trigger) => {
                    Obj.deleteKeys(trigger, KEY_FEED_CURSOR);
                    Obj.getMeta(trigger).keys.push({
                      source: KEY_FEED_CURSOR,
                      id: lastSuccessfulInvocation.value.feedCursor ?? failedInvariant(),
                    });
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
          default: {
            return yield* Effect.dieMessage(`Unknown trigger kind: ${kind}`);
          }
        }
      }
      return invocations;
    }).pipe(Effect.provide(this._services));

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

      // Remove triggers that are no longer present
      for (const triggerId of this._scheduledTriggers.keys()) {
        if (!currentTriggerIds.has(triggerId)) {
          this._scheduledTriggers.delete(triggerId);
        }
      }

      // Add or update triggers
      for (const trigger of triggers) {
        if (trigger.spec?.kind === 'timer' && trigger.enabled) {
          const timerSpec = trigger.spec as Trigger.TimerSpec;

          // Parse cron expression using Effect's Cron module
          const cronEither = Cron.parse(timerSpec.cron);

          if (Either.isRight(cronEither)) {
            const cron = cronEither.right;
            const existing = this._scheduledTriggers.get(trigger.id);
            const now = this.getCurrentTime();
            const nextExecution = existing?.nextExecution ?? Cron.next(cron, now);

            log('Updated scheduled trigger', {
              triggerId: trigger.id,
              cron: timerSpec.cron,
              nextExecution,
              now,
            });
            this._scheduledTriggers.set(trigger.id, {
              trigger,
              cron,
              nextExecution,
            });
          } else {
            log.error('Invalid cron expression', {
              triggerId: trigger.id,
              cron: timerSpec.cron,
              error: cronEither.left.message,
            });
          }
        }
      }

      log('Updated scheduled triggers', { count: this._scheduledTriggers.size });
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
