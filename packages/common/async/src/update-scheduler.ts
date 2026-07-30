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
 * A claimed run, delivered to waiters via {@link UpdateScheduler._claimed} the moment the runner
 * starts the callback. `error` resolves when the run finishes — with its error, or `undefined` on
 * success — and never rejects, so an unobserved run cannot become an unhandled promise rejection;
 * `runBlocking` inspects and re-throws. `observed` marks that a `runBlocking` caller will consume
 * the result, so a failure is theirs to throw rather than the context's to raise.
 */
type RunResult = { error: Promise<unknown>; observed: boolean };

/**
 * Runs a non-reentrant callback at most once at a time, coalescing any number of triggers
 * (optionally rate-limited via {@link UpdateSchedulerOptions.maxFrequency}).
 *
 * Single-door design (same shape as {@link DeferredTask}): the scheduled runner inside
 * {@link trigger} is the ONLY place the callback is started. `runBlocking`/`forceTrigger` never run
 * the callback themselves — they funnel into that runner. With exactly one claim site and the
 * `_scheduled` flag collapsing concurrent triggers into one pending runner, at most one waiter ever
 * waits for the running pass — so it cannot lose a wake-up race, and mutual exclusion holds by
 * construction. (A previous design let `runBlocking` claim directly; two claim sites with single
 * checks is the check/claim race behind dxos/edge#758.)
 */
export class UpdateScheduler {
  /**
   * The running pass. Never rejects, and is non-null exactly while a run is executing.
   * Consulted by {@link join}, the dispose hook, and the runner's own wait.
   */
  private _currentTask: Promise<void> | null = null;
  private _scheduled = false;

  /**
   * Claim signal for the pending run: armed (reset) by the `trigger` call that schedules a runner,
   * woken by that runner the moment it claims, carrying the run's result. This is what lets
   * `runBlocking` bridge the scheduled→claimed gap — after `trigger()`, the run it asked for does
   * not exist in `_currentTask` yet, so there is nothing else it could await.
   *
   * `Trigger.reset()` abandons the previous promise (parked waiters would hang), which is safe here
   * ONLY because the arm lives in `trigger`'s non-coalesced branch: waiters can park solely while
   * `_scheduled` is true, and that branch requires it to be false.
   */
  private _claimed = new Trigger<RunResult>();

  /**
   * Woken to make the pending (or next) runner skip its throttle delay — urgency without a second
   * claim site. Replaced at claim time so each runner races only its own generation's signal.
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
      // A runner that never reached its claim (disposed mid-delay, or never started) leaves the
      // claim signal unwoken; release any `runBlocking` callers parked on it. NOOP if already woken.
      this._claimed.wake({ error: Promise.resolve(undefined), observed: true });
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
    // Arm the claim signal for the run being created — only ever here, never on a coalesced
    // trigger (see `_claimed`).
    this._claimed.reset();

    // The ONLY claim site.
    scheduleMicroTask(this._ctx, async () => {
      // A single await suffices — no re-check loop: `_scheduled` collapses triggers into one
      // pending runner and nothing else claims, so this is the only waiter for the running pass.
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
        // Free parked waiters; nothing waits on the data any more.
        this._claimed.wake({ error: Promise.resolve(undefined), observed: true });
        return;
      }

      // The claim — one synchronous slice from here to the `wake` below, so nothing can interleave
      // between the checks above and the run starting.
      this._scheduled = false;
      this._skipDelay = new Trigger();
      this._lastUpdateTime = performance.now();
      const run: RunResult = { observed: false, error: undefined as never };
      run.error = this._callback().then(
        () => undefined,
        async (error) => {
          // One microtask hop before deciding where the failure goes: waiters were woken at claim
          // time and mark `observed` on resume, but a synchronously-rejecting callback queues this
          // handler ahead of them — without the hop it would double-report to the context.
          await undefined;
          if (!run.observed) {
            this._ctx.raise(error as Error);
          }
          return error as unknown;
        },
      );
      const task: Promise<void> = run.error.then(() => {
        if (this._currentTask === task) {
          this._currentTask = null;
        }
      });
      this._currentTask = task;
      this._claimed.wake(run);
    });
  }

  /**
   * Run as soon as possible: schedules (coalescing with any pending run) and skips the throttle
   * delay. Does NOT start a concurrent callback — urgency never suspends mutual exclusion.
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
   * Waits in two steps: first for the pending run to claim (via the signal armed by `trigger`),
   * then for that run's result. The run that wakes the signal necessarily claims after this call,
   * so its drain includes everything enqueued before it. Concurrent callers coalesce onto the same
   * run. Rejects with that run's error — a caller using this as a flush barrier must be able to see
   * that its batch was NOT handed off (dxos/edge#758). No-op once the context is disposed.
   */
  async runBlocking(): Promise<void> {
    if (this._ctx.disposed) {
      return;
    }
    this.trigger();
    this._skipDelay.wake();
    const run = await this._claimed.wait();
    run.observed = true;
    const error = await run.error;
    if (error !== undefined) {
      throw error;
    }
  }
}
