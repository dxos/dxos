//
// Copyright 2025 DXOS.org
//

import { Duration, Effect, Layer, Context, Schedule, Fiber, Cron, Either } from 'effect';

import { Filter, type EchoDatabase } from '@dxos/client/echo';
import { type Expando, type Ref } from '@dxos/echo-schema';
import { log } from '@dxos/log';

import { LocalFunctionExecutionService } from '../services/local-function-execution';
import { FunctionTrigger, type TimerTrigger, type TimerTriggerOutput } from '../types';
import { type FunctionDefinition, deserializeFunction } from '../handler';
import { DatabaseService, type Services } from '../services';
import { Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { FunctionType } from '..';

export type TimeControl = 'natural' | 'manual';

export interface TriggerDispatcherOptions {
  /**
   * Time control mode.
   * - 'natural': Use real time.
   * - 'manual': Use internal clock for testing.
   */
  timeControl: TimeControl;

  /**
   * Poll interval for cron triggers in 'natural' time control mode.
   * @default 1 second
   */
  livePollInterval?: Duration.Duration;
}

export interface InvokeTriggerOptions {
  trigger: FunctionTrigger;
  data?: unknown;
}
export interface TriggerExecutionResult {
  triggerId: string;
  functionName: string;
  result: unknown;
}

interface ScheduledTrigger {
  trigger: FunctionTrigger;
  cron: Cron.Cron;
  nextExecution: Date;
}

export class TriggerDispatcher extends Context.Tag('@dxos/functions/TriggerDispatcher')<
  TriggerDispatcher,
  {
    readonly timeControl: TimeControl;

    /**
     * Start the trigger dispatcher.
     */
    start(): Effect.Effect<void, never, Services | LocalFunctionExecutionService>;

    /**
     * Stop the trigger dispatcher.
     */
    stop(): Effect.Effect<void>;

    /**
     * Manually invoke a specific trigger.
     */
    invokeTrigger(
      options: InvokeTriggerOptions,
    ): Effect.Effect<TriggerExecutionResult, never, Services | LocalFunctionExecutionService>;

    /**
     * Invoke all scheduled triggers whose time is up.
     */
    invokeScheduledTriggers(): Effect.Effect<void, never, Services | LocalFunctionExecutionService>;

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
  private _internalTime: Date = new Date();
  private _timerFiber: Fiber.Fiber<void, void> | undefined;
  private _scheduledTriggers = new Map<string, ScheduledTrigger>();

  constructor(options: TriggerDispatcherOptions) {
    this.timeControl = options.timeControl;
    this.livePollInterval = options.livePollInterval ?? Duration.seconds(1);
  }

  start = (): Effect.Effect<void, never, Services | LocalFunctionExecutionService> =>
    Effect.gen(this, function* () {
      if (this._running) {
        return;
      }

      this._running = true;

      // Start natural time processing if enabled
      if (this.timeControl === 'natural') {
        this._timerFiber = yield* this._startNaturalTimeProcessing().pipe(Effect.fork);
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
  ): Effect.Effect<TriggerExecutionResult, never, Services | LocalFunctionExecutionService> =>
    Effect.gen(this, function* () {
      const { trigger, data } = options;

      if (!trigger.enabled) {
        return yield* Effect.dieMessage('Attempting to invoke disabled trigger');
      }

      if (!trigger.function) {
        return yield* Effect.dieMessage('Trigger has no function reference');
      }

      // Resolve the function
      const serialiedFunction = yield* DatabaseService.load(trigger.function).pipe(Effect.orDie);
      invariant(Obj.instanceOf(FunctionType, serialiedFunction));
      const functionDef = deserializeFunction(serialiedFunction);

      // Prepare input data
      const inputData = data ?? this._prepareInputData(trigger);

      // Invoke the function
      const result = yield* LocalFunctionExecutionService.invokeFunction(functionDef, inputData);
      const triggerExecutionResult: TriggerExecutionResult = {
        triggerId: trigger.id,
        functionName: functionDef.name,
        result,
      };
      log.info('Trigger function executed', { result: triggerExecutionResult });
      return triggerExecutionResult;
    });

  invokeScheduledTriggers = (): Effect.Effect<void, never, Services | LocalFunctionExecutionService> =>
    Effect.gen(this, function* () {
      yield* this._updateScheduledTriggers();

      const now = this.getCurrentTime();
      const triggersToInvoke: FunctionTrigger[] = [];

      for (const [triggerId, scheduledTrigger] of this._scheduledTriggers.entries()) {
        if (scheduledTrigger.nextExecution <= now) {
          triggersToInvoke.push(scheduledTrigger.trigger);

          // Update next execution time using Effect's Cron
          scheduledTrigger.nextExecution = Cron.next(scheduledTrigger.cron, now);
        }
      }

      // Invoke all due triggers
      yield* Effect.all(
        triggersToInvoke.map((trigger) =>
          this.invokeTrigger({
            trigger,
            data: { tick: now.getTime() } as TimerTriggerOutput,
          }),
        ),
        { concurrency: 'unbounded' },
      );
    });

  advanceTime = (duration: Duration.Duration): Effect.Effect<void> => {
    const self = this;
    return Effect.gen(function* () {
      if (self.timeControl !== 'manual') {
        return yield* Effect.fail(new Error('advanceTime can only be used in manual time control mode'));
      }

      const millis = Duration.toMillis(duration);
      self._internalTime = new Date(self._internalTime.getTime() + millis);

      log.info('Advanced internal time', {
        newTime: self._internalTime,
        advancedBy: Duration.format(duration),
      });
    }).pipe(Effect.orDie);
  };

  getCurrentTime = (): Date => {
    if (this.timeControl === 'natural') {
      return new Date();
    } else {
      return new Date(this._internalTime);
    }
  };

  private _fetchTriggers = () =>
    Effect.gen(this, function* () {
      const { objects } = yield* DatabaseService.runQuery(Filter.type(FunctionTrigger));
      return objects;
    }).pipe(Effect.withSpan('TriggerDispatcher.fetchTriggers'));

  private _startNaturalTimeProcessing = (): Effect.Effect<void, never, Services | LocalFunctionExecutionService> =>
    Effect.gen(this, function* () {
      yield* this.invokeScheduledTriggers();
    }).pipe(Effect.repeat(Schedule.fixed(this.livePollInterval)), Effect.asVoid);

  private _updateScheduledTriggers = (): Effect.Effect<void, never, DatabaseService> =>
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
          const timerSpec = trigger.spec as TimerTrigger;

          // Parse cron expression using Effect's Cron module
          const cronEither = Cron.parse(timerSpec.cron);

          if (Either.isRight(cronEither)) {
            const cron = cronEither.right;
            const existing = this._scheduledTriggers.get(trigger.id);
            const now = this.getCurrentTime();

            this._scheduledTriggers.set(trigger.id, {
              trigger,
              cron,
              nextExecution: existing?.nextExecution ?? Cron.next(cron, now),
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

      log.info('Updated scheduled triggers', { count: this._scheduledTriggers.size });
    }).pipe(Effect.withSpan('TriggerDispatcher.updateScheduledTriggers'));

  private _prepareInputData = (trigger: FunctionTrigger): any => {
    if (!trigger.input) {
      return {};
    }

    // TODO: Process input template with trigger context
    return trigger.input;
  };
}

// Re-exports
export { FunctionTrigger, type TimerTrigger } from '../types';
