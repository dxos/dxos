//
// Copyright 2023 DXOS.org
//

import { type Context } from '@dxos/context';

import { scheduleMicroTask } from './task-scheduling';
import { Trigger } from './trigger';

export type UpdateSchedulerOptions = {
  /**
   * Maximum frequency of updates. If not specified, updates will be scheduled on every change.
   */
  maxFrequency?: number;
};

/**
 * Time period for update counting.
 */
const TIME_PERIOD = 1_000;

/** A claimed run's error (or `undefined`). Resolves, never rejects — `runBlocking` re-throws it. */
type RunResult = Promise<Error | undefined>;

/**
 * Runs a non-reentrant callback at most once at a time, coalescing triggers (optionally rate-limited
 * via {@link UpdateSchedulerOptions.maxFrequency}).
 *
 * The runner inside {@link trigger} is the only place the callback starts; `runBlocking` and
 * `forceTrigger` funnel into it. That, plus `_scheduled` collapsing triggers into one pending
 * runner, is what makes mutual exclusion hold by construction (dxos/edge#758).
 */
export class UpdateScheduler {
  /** The running pass; never rejects, non-null exactly while a run is executing. */
  private _currentTask: Promise<void> | null = null;
  private _scheduled = false;

  /**
   * Armed by the `trigger` that schedules a runner, woken by that runner when it claims — with the
   * run's promise, which `Trigger` adopts, so waiters resume when the run *finishes*. Lets
   * `runBlocking` await a run that does not exist in `_currentTask` yet.
   *
   * `reset()` abandons parked waiters, so it may only be armed in `trigger`'s non-coalesced branch:
   * waiters park only while `_scheduled` is true, and that branch requires it false.
   */
  private _runOutcome = new Trigger<RunResult>();

  /** Woken to make the pending runner skip its throttle delay. Replaced at claim time. */
  private _skipDelay = new Trigger();

  /**
   * `runBlocking` callers in flight, incremented synchronously before triggering. A failing run uses
   * it to tell whether someone will throw the error; counting microtask hops to a waiter's resume
   * would be a race.
   */
  private _observers = 0;

  private _lastUpdateTime = -TIME_PERIOD;

  constructor(
    private readonly _ctx: Context,
    private readonly _callback: () => Promise<void>,
    private readonly _params: UpdateSchedulerOptions = {},
  ) {
    _ctx.onDispose(async () => {
      await this._currentTask; // Context waits for callback to finish.
      // Release `runBlocking` callers parked on a runner that never claimed. NOOP if already woken.
      this._runOutcome.wake(Promise.resolve(undefined));
    });
  }

  get scheduled() {
    return this._scheduled;
  }

  /**
   * Schedule the callback to run asynchronously. Triggers issued while a run is pending or in flight
   * coalesce into the next run.
   */
  trigger(): void {
    if (this._scheduled) {
      return;
    }
    this._scheduled = true;
    this._runOutcome.reset(); // Only here — never on a coalesced trigger (see `_runOutcome`).

    // The only claim site. A single await suffices: nothing else claims, so this is the only waiter.
    scheduleMicroTask(this._ctx, async () => {
      await this._currentTask; // Never rejects.

      // Rate limiting. Suspending before the claim is safe only because no other claimant exists.
      if (this._params.maxFrequency) {
        const now = performance.now();
        const delay = this._lastUpdateTime + TIME_PERIOD / this._params.maxFrequency - now;
        if (delay > 0) {
          const skipDelay = this._skipDelay;
          await new Promise<void>((resolve) => {
            const timeoutId = setTimeout(() => {
              clearContext();
              resolve();
            }, delay);

            const clearContext = this._ctx.onDispose(() => {
              clearTimeout(timeoutId);
              resolve();
            });

            // `runBlocking`/`forceTrigger` cut the delay short.
            void skipDelay.wait().then(() => {
              clearTimeout(timeoutId);
              clearContext();
              resolve();
            });
          });
        }
      }

      if (this._ctx.disposed) {
        this._runOutcome.wake(Promise.resolve(undefined));
        return;
      }

      // The claim: one synchronous slice from here to the `wake` below.
      this._scheduled = false;
      this._skipDelay = new Trigger();
      this._lastUpdateTime = performance.now();
      const run: RunResult = this._callback().then(
        () => undefined,
        (error): Error => {
          // A thrown non-Error is typed away here, matching `Context.raise`'s signature.
          const failure = error as Error;
          // Unobserved failures go to the context, as trigger-path failures always have.
          if (this._observers === 0) {
            this._ctx.raise(failure);
          }
          return failure;
        },
      );
      const task: Promise<void> = run.then(() => {
        if (this._currentTask === task) {
          this._currentTask = null;
        }
      });
      this._currentTask = task;
      this._runOutcome.wake(run);
    });
  }

  /**
   * Run as soon as possible: schedules (coalescing with any pending run) and skips the throttle
   * delay. Does not start a concurrent callback.
   */
  forceTrigger(): void {
    this.trigger();
    this._skipDelay.wake();
  }

  /**
   * Waits for the current task to finish if it is running.
   * Does not schedule a new task, and does not wait for one that is merely scheduled.
   */
  async join(): Promise<void> {
    await this._currentTask;
  }

  /**
   * Ensure a run that observes everything enqueued so far, and wait for it to finish. Waits for the
   * pending run to claim, then for its result; that run necessarily claims after this call, so its
   * drain includes everything enqueued before it. Rejects with the run's error so a flush barrier can
   * see its batch was not handed off. No-op once disposed.
   */
  async runBlocking(): Promise<void> {
    if (this._ctx.disposed) {
      return;
    }
    this._observers++;
    try {
      this.trigger();
      this._skipDelay.wake();
      const error = await this._runOutcome.wait();
      if (error !== undefined) {
        throw error;
      }
    } finally {
      this._observers--;
    }
  }
}
