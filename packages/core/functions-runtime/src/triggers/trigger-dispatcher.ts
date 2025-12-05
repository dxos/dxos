//
// Copyright 2025 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Context from 'effect/Context';
import * as Cron from 'effect/Cron';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Either from 'effect/Either';
import * as Exit from 'effect/Exit';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Record from 'effect/Record';
import * as Schedule from 'effect/Schedule';

import { DXN, Filter, Obj, Query } from '@dxos/echo';
import { Database } from '@dxos/echo';
import { causeToError } from '@dxos/effect';
import { FunctionInvocationService, QueueService, deserializeFunction } from '@dxos/functions';
import { Function, Trigger, type TriggerEvent } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { KEY_QUEUE_POSITION } from '@dxos/protocols';

import { TracingServiceExt } from '../trace';

import { createInvocationPayload } from './input-builder';
import { InvocationTracer } from './invocation-tracer';
import { type TriggerState, TriggerStateStore } from './trigger-state-store';

export type TimeControl = 'natural' | 'manual';

export interface TriggerDispatcherOptions {
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
}

export interface InvokeTriggerOptions {
  trigger: Trigger.Trigger;
  event: TriggerEvent.TriggerEvent;
}
export interface TriggerExecutionResult {
  triggerId: string;
  result: Exit.Exit<unknown>;
}

/**
 * Cront trigger runtime state.
 */
interface ScheduledTrigger {
  trigger: Trigger.Trigger;
  cron: Cron.Cron;
  nextExecution: Date;
}

// TODO(dmaretskyi): Refactor service management.
type TriggerDispatcherServices =
  | FunctionInvocationService
  // TODO(dmaretskyi): Move those into layer deps.
  | TriggerStateStore
  | InvocationTracer
  | QueueService
  | Database.Service;

export class TriggerDispatcher extends Context.Tag('@dxos/functions/TriggerDispatcher')<
  TriggerDispatcher,
  {
    readonly timeControl: TimeControl;

    get running(): boolean;

    /**
     * Start the trigger dispatcher.
     * Will automatically invoke triggers.
     */
    start(): Effect.Effect<void, never, TriggerDispatcherServices>;

    /**
     * Stop the trigger dispatcher.
     */
    stop(): Effect.Effect<void>;

    /**
     * Refresh triggers.
     */
    refreshTriggers(): Effect.Effect<void, never, Database.Service>;

    /**
     * Manually invoke a specific trigger.
     */
    invokeTrigger(
      options: InvokeTriggerOptions,
    ): Effect.Effect<TriggerExecutionResult, never, TriggerDispatcherServices>;

    /**
     * Invoke all scheduled triggers who are due.
     */
    invokeScheduledTriggers(opts?: {
      kinds?: Trigger.Kind[];
    }): Effect.Effect<TriggerExecutionResult[], never, TriggerDispatcherServices>;

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
  static layer = (options: Omit<TriggerDispatcherOptions, 'database'>) =>
    Layer.effect(
      TriggerDispatcher,
      Effect.gen(function* () {
        return new TriggerDispatcherImpl(options);
      }),
    );
}

class TriggerDispatcherImpl implements Context.Tag.Service<TriggerDispatcher> {
  readonly livePollInterval: Duration.Duration;
  readonly timeControl: TimeControl;

  private _running = false;
  private _internalTime: Date;
  private _timerFiber: Fiber.Fiber<void, void> | undefined;
  private _scheduledTriggers = new Map<string, ScheduledTrigger>();

  constructor(options: TriggerDispatcherOptions) {
    this.timeControl = options.timeControl;
    this.livePollInterval = options.livePollInterval ?? Duration.seconds(1);
    this._internalTime = options.startingTime ?? new Date();
  }

  get running(): boolean {
    return this._running;
  }

  start = (): Effect.Effect<void, never, TriggerDispatcherServices> =>
    Effect.gen(this, function* () {
      if (this._running) {
        return;
      }

      this._running = true;

      // Start natural time processing if enabled
      if (this.timeControl === 'natural') {
        this._timerFiber = yield* this._startNaturalTimeProcessing().pipe(
          Effect.tapErrorCause((cause) => {
            const error = causeToError(cause);
            log.error('trigger dispatcher error', { error });
            this._running = false;
            return Effect.void;
          }),
          Effect.forkDaemon,
        );
      } else {
        return yield* Effect.dieMessage('TriggerDispatcher started in manual time control mode');
      }

      log.info('TriggerDispatcher started', { timeControl: this.timeControl });
    });

  stop = (): Effect.Effect<void> =>
    Effect.gen(this, function* () {
      if (!this._running) {
        return;
      }

      this._running = false;

      // Stop timer processing
      if (this._timerFiber) {
        yield* Fiber.interrupt(this._timerFiber);
        this._timerFiber = undefined;
      }

      // Clear scheduled triggers
      this._scheduledTriggers.clear();

      log.info('TriggerDispatcher stopped');
    });

  invokeTrigger = (
    options: InvokeTriggerOptions,
  ): Effect.Effect<TriggerExecutionResult, never, TriggerDispatcherServices> =>
    Effect.gen(this, function* () {
      const { trigger, event } = options;
      log.info('running trigger', { triggerId: trigger.id, spec: trigger.spec, event });

      const tracer = yield* InvocationTracer;
      const trace = yield* tracer.traceInvocationStart({
        target: trigger.function?.dxn,
        payload: {
          trigger: {
            id: trigger.id,
            // TODO(dmaretskyi): Is `spec` always there>
            kind: trigger.spec!.kind,
          },
          data: event,
        },
      });

      // Sandboxed section.
      const result = yield* Effect.gen(this, function* () {
        if (!trigger.enabled) {
          return yield* Effect.dieMessage('Attempting to invoke disabled trigger');
        }

        if (!trigger.function) {
          return yield* Effect.dieMessage('Trigger has no function reference');
        }

        // Resolve the function
        const serialiedFunction = yield* Database.Service.load(trigger.function!).pipe(Effect.orDie);
        invariant(Obj.instanceOf(Function.Function, serialiedFunction));
        const functionDef = deserializeFunction(serialiedFunction);

        // Prepare input data
        const inputData = this._prepareInputData(trigger, event);

        // Invoke the function
        return yield* FunctionInvocationService.invokeFunction(functionDef, inputData).pipe(
          Effect.provide(TracingServiceExt.layerQueue(trace.invocationTraceQueue)),
        );
      }).pipe(Effect.exit);

      const triggerExecutionResult: TriggerExecutionResult = {
        triggerId: trigger.id,
        result,
      };
      if (Exit.isSuccess(result)) {
        log.info('trigger execution success', {
          triggerId: trigger.id,
        });
      } else {
        log.error('trigger execution failure', {
          error: causeToError(result.cause),
        });
      }
      yield* tracer.traceInvocationEnd({
        trace,
        // TODO(dmaretskyi): Might miss errors.
        exception: Exit.isFailure(result) ? Cause.prettyErrors(result.cause)[0] : undefined,
      });
      return triggerExecutionResult;
    });

  invokeScheduledTriggers = ({ kinds = ['timer', 'queue', 'subscription'] } = {}): Effect.Effect<
    TriggerExecutionResult[],
    never,
    TriggerDispatcherServices
  > =>
    Effect.gen(this, function* () {
      const invocations: TriggerExecutionResult[] = [];
      for (const kind of kinds) {
        switch (kind) {
          case 'timer':
            {
              yield* this.refreshTriggers();
              const now = this.getCurrentTime();
              const triggersToInvoke: Trigger.Trigger[] = [];

              for (const [triggerId, scheduledTrigger] of this._scheduledTriggers.entries()) {
                if (scheduledTrigger.nextExecution <= now) {
                  triggersToInvoke.push(scheduledTrigger.trigger);

                  // Update next execution time using Effect's Cron
                  scheduledTrigger.nextExecution = Cron.next(scheduledTrigger.cron, now);
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
          case 'queue': {
            const triggers = yield* this._fetchTriggers();
            for (const trigger of triggers) {
              const spec = trigger.spec;
              if (spec?.kind !== 'queue') {
                continue;
              }
              const cursor = Obj.getKeys(trigger, KEY_QUEUE_CURSOR).at(0)?.id;
              const queue = yield* QueueService.getQueue(DXN.parse(spec.queue));

              // TODO(dmaretskyi): Include cursor & limit in the query.
              const objects = yield* Effect.promise(() => queue.queryObjects());
              for (const object of objects) {
                const objectPos = Obj.getKeys(object, KEY_QUEUE_POSITION).at(0)?.id;
                // TODO(dmaretskyi): Extract methods for managing queue position.
                if (!objectPos || (cursor && parseInt(cursor) >= parseInt(objectPos))) {
                  continue;
                }

                invocations.push(
                  yield* this.invokeTrigger({
                    trigger,
                    event: {
                      queue: spec.queue,
                      item: object,
                      cursor: objectPos,
                    } satisfies TriggerEvent.QueueEvent,
                  }),
                );

                // Update trigger cursor.
                Obj.deleteKeys(trigger, KEY_QUEUE_CURSOR);
                Obj.getMeta(trigger).keys.push({ source: KEY_QUEUE_CURSOR, id: objectPos });
                yield* Database.Service.flush();

                // We only invoke one trigger for each queue at a time.
                break;
              }
            }
            break;
          }
          case 'subscription': {
            const triggers = yield* this._fetchTriggers();
            for (const trigger of triggers) {
              const spec = Obj.getSnapshot(trigger).spec;
              if (spec?.kind !== 'subscription') {
                continue;
              }

              const objects = yield* Database.Service.runQuery(Query.fromAst(spec.query.ast));

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

                      subject: db.makeRef(Obj.getDXN(object)),

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

  refreshTriggers = (): Effect.Effect<void, never, Database.Service> =>
    Effect.gen(this, function* () {
      const triggers = yield* this._fetchTriggers();
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
    }).pipe(Effect.withSpan('TriggerDispatcher.refreshTriggers'));

  private _fetchTriggers = () =>
    Effect.gen(this, function* () {
      const objects = yield* Database.Service.runQuery(Filter.type(Trigger.Trigger));
      return objects;
    }).pipe(Effect.withSpan('TriggerDispatcher.fetchTriggers'));

  private _startNaturalTimeProcessing = (): Effect.Effect<void, never, TriggerDispatcherServices> =>
    Effect.gen(this, function* () {
      yield* this.invokeScheduledTriggers();
    }).pipe(Effect.repeat(Schedule.fixed(this.livePollInterval)), Effect.asVoid);

  private _prepareInputData = (trigger: Trigger.Trigger, event: TriggerEvent.TriggerEvent): any => {
    return createInvocationPayload(trigger, event);
  };
}

/**
 * Key for the current queue cursor for queue triggers.
 */
const KEY_QUEUE_CURSOR = 'dxos.org/key/local-trigger-dispatcher/queue-cursor';
