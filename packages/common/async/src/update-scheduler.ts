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

/**
 * Outcome of one run, delivered to the `runBlocking` callers that were waiting on it.
 * Always resolved, never rejected — waiters inspect and re-throw, so an unobserved run
 * cannot become an unhandled rejection.
 */
type RunOutcome = { error?: unknown };

type RunCompletion = {
  promise: Promise<RunOutcome>;
  resolve: (outcome: RunOutcome) => void;
  /** `runBlocking` callers awaiting this run. A failure with waiters belongs to them, not the context. */
  waiters: number;
};

const createCompletion = (): RunCompletion => {
  let resolve!: (outcome: RunOutcome) => void;
  const promise = new Promise<RunOutcome>((res) => {
    resolve = res;
  });
  return { promise, resolve, waiters: 0 };
};

/**
 * Runs a non-reentrant callback at most once at a time, coalescing any number of triggers
 * (optionally rate-limited via {@link UpdateSchedulerOptions.maxFrequency}).
 *
 * Single-door design (same shape as {@link DeferredTask}): the scheduled runner inside
 * {@link trigger} is the ONLY place the callback is started. `runBlocking`/`forceTrigger` never run
 * the callback themselves — they funnel into that runner and, for `runBlocking`, await its
 * completion. With exactly one claim site and the `_scheduled` flag collapsing concurrent triggers
 * into one pending runner, at most one waiter ever waits for the running pass — so it cannot lose a
 * wake-up race, and mutual exclusion holds by construction rather than by re-checking. (The
 * previous design let `runBlocking` claim directly; two claim sites with single checks is the
 * check/claim race behind dxos/edge#758.)
 */
export class UpdateScheduler {
  /**
   * The running pass. Never rejects, and is non-null exactly while the callback is executing.
   */
  private _currentTask: Promise<void> | null = null;
  private _scheduled = false;

  /**
   * Completion of the next run to start. The runner adopts it (and installs a fresh one) at claim
   * time, so a `runBlocking` caller that captures it before triggering is guaranteed a run that
   * starts after the capture — i.e. one that observes everything enqueued so far.
   */
  private _nextCompletion = createCompletion();

  /**
   * Woken to make the pending (or next) runner skip its throttle delay — urgency without a second
   * door. Replaced at claim time so each runner races only the signal of its own generation.
   */
  private _skipDelay = new Trigger();

  private _lastUpdateTime = -TIME_PERIOD;

  constructor(
    private readonly _ctx: Context,
    private readonly _callback: () => Promise<void>,
    private readonly _params: UpdateSchedulerOptions = {},
  ) {
    _ctx.onDispose(async () => {
      await this._currentTask; // Context waits for callback to finish.
      // A runner that never reached its claim (disposed mid-delay, or never started) leaves its
      // completion unresolved; release any `runBlocking` callers parked on it.
      this._nextCompletion.resolve({});
    });
  }

  get scheduled() {
    return this._scheduled;
  }

  /**
   * Schedule the callback to run asynchronously. Triggers issued while a run is pending or in
   * flight coalesce into the next run.
   */
  trigger(): void {
    if (this._scheduled) {
      return;
    }
    this._scheduled = true;

    // The ONLY claim site.
    scheduleMicroTask(this._ctx, async () => {
      // A single await suffices — no re-check loop: `_scheduled` collapses triggers into one
      // pending runner and nothing else claims, so this is the only waiter for the running pass.
      // Both properties are load-bearing; adding another claim path reintroduces dxos/edge#758.
      await this._currentTask; // Never rejects.

      // Rate limiting. Sleeping between the wait above and the claim below is safe only because
      // no other claimant exists.
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

            // `runBlocking`/`forceTrigger` cut the delay short; the run stays mutually excluded.
            void skipDelay.wait().then(() => {
              clearTimeout(timeoutId);
              clearContext();
              resolve();
            });
          });
        }
      }

      if (this._ctx.disposed) {
        return; // The dispose hook resolves `_nextCompletion` for any parked waiters.
      }

      // The claim — one synchronous slice from here to the `_currentTask` assignment, so nothing
      // can interleave between the checks above and the run below.
      this._scheduled = false;
      const completion = this._nextCompletion;
      this._nextCompletion = createCompletion();
      this._skipDelay = new Trigger();
      this._lastUpdateTime = performance.now();
      const task = this._callback().then(
        () => {
          if (this._currentTask === task) {
            this._currentTask = null;
          }
          completion.resolve({});
        },
        (error) => {
          if (this._currentTask === task) {
            this._currentTask = null;
          }
          completion.resolve({ error });
          // A failure someone is waiting for is theirs to handle; an unobserved one goes to the
          // context, as trigger-path failures always have.
          if (completion.waiters === 0) {
            this._ctx.raise(error as Error);
          }
        },
      );
      this._currentTask = task;
    });
  }

  /**
   * Run as soon as possible: schedules (coalescing with any pending run) and skips the throttle
   * delay. Unlike the previous implementation this does NOT start a concurrent callback — urgency
   * never suspends mutual exclusion.
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
   * Ensure a run that observes everything enqueued so far, and wait for it to finish.
   *
   * Funnels into the single runner (skipping the throttle delay) rather than running the callback
   * itself; concurrent callers coalesce onto the same run. Rejects with that run's error — a caller
   * using this as a flush barrier must be able to see that its batch was NOT handed off
   * (dxos/edge#758). No-op once the context is disposed: nothing waits on the data any more.
   */
  async runBlocking(): Promise<void> {
    if (this._ctx.disposed) {
      return;
    }
    // Capture before triggering: this is the completion the next-starting run will adopt, and that
    // run necessarily begins after the capture, so it drains everything enqueued up to now.
    const completion = this._nextCompletion;
    completion.waiters++;
    this.trigger();
    this._skipDelay.wake();
    const { error } = await completion.promise;
    if (error !== undefined) {
      throw error;
    }
  }
}
