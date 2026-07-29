//
// Copyright 2023 DXOS.org
//

import { type Context } from '@dxos/context';

import { scheduleMicroTask } from './task-scheduling';

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

export class UpdateScheduler {
  /**
   * Promise that resolves when the callback is done.
   * Never rejects.
   */
  private _promise: Promise<any> | null = null;

  /**
   * Resolves once a {@link trigger}ed pass has finished. Covers the whole task — the throttle wait
   * *and* the callback — not just the part up to where `_promise` gets assigned.
   *
   * A triggered pass spends up to `TIME_PERIOD / maxFrequency` sleeping before it assigns
   * `_promise`, so for that window `_promise` reports "nothing running" while a pass is very much
   * pending. A caller waiting on `_promise` alone would return while that pass is still to come —
   * and because the callback typically drains shared queued state, the work it is about to claim is
   * then neither done nor still queued. Tracking the scheduled task separately is what lets
   * {@link join} and {@link runBlocking} await it.
   */
  private _scheduledTask: Promise<void> | null = null;
  private _scheduled = false;

  private _lastUpdateTime = -TIME_PERIOD;

  constructor(
    private readonly _ctx: Context,
    private readonly _callback: () => Promise<void>,
    private readonly _params: UpdateSchedulerOptions = {},
  ) {
    _ctx.onDispose(async () => {
      await this._promise; // Context waits for callback to finish.
    });
  }

  trigger(): void {
    if (this._scheduled) {
      return;
    }

    this._scheduled = true;
    const task: Promise<void> = new Promise<void>((resolveScheduled) => {
      scheduleMicroTask(this._ctx, async () => {
        try {
          // The previous task might still be running, so we need to wait for it to finish.
          await this._promise; // Can't be rejected.

          // Check if the callback was called recently.
          if (this._params.maxFrequency) {
            const now = performance.now();
            const delay = this._lastUpdateTime + TIME_PERIOD / this._params.maxFrequency - now;
            if (delay > 0) {
              await new Promise<void>((resolve) => {
                const timeoutId = setTimeout(() => {
                  clearContext();
                  resolve();
                }, delay);

                const clearContext = this._ctx.onDispose(() => {
                  clearTimeout(timeoutId);
                  resolve();
                });
              });
            }
          }

          if (this._ctx.disposed) {
            return;
          }

          this._lastUpdateTime = performance.now();

          // Reset the flag. New tasks can now be scheduled. They would wait for the callback to finish.
          this._scheduled = false;
          // Only this pass may clear `_promise`: a concurrent `runBlocking` may have replaced it, and
          // clearing that one would hide a running callback from `_drainOutstanding`.
          const promise = this._callback().then(
            () => {
              if (this._promise === promise) {
                this._promise = null;
              }
            },
            (error) => {
              if (this._promise === promise) {
                this._promise = null;
              }
              this._ctx.raise(error);
            },
          );
          this._promise = promise;
          // Awaited so `_scheduledTask` spans the callback as well as the scheduling.
          await promise;
        } finally {
          // Only this pass may clear `_scheduledTask`. The flag is reset before the callback runs, so
          // a `trigger()` from inside it (or from a listener it wakes) installs a newer task — nulling
          // that would hide a pending pass from `runBlocking`'s drain, the very gap this fix closes.
          if (this._scheduledTask === task) {
            this._scheduled = false;
            this._scheduledTask = null;
          }
          resolveScheduled();
        }
      });
    });
    this._scheduledTask = task;
  }

  forceTrigger(): void {
    scheduleMicroTask(this._ctx, async () => {
      this._callback().catch((err) => this._ctx.raise(err));
    });
  }

  /**
   * Waits for the current task to finish if it is running.
   *
   * Does not schedule a new task, and does not wait for one that is merely scheduled: a caller
   * joining is asking about the round in flight, not about work queued behind it. Use
   * {@link runBlocking} for a barrier that also covers a scheduled pass.
   */
  async join(): Promise<void> {
    await this._promise;
  }

  /**
   * Force schedule the task to run and wait for it to finish.
   *
   * Drains any running or scheduled pass first. Without that, a pass still sleeping out its throttle
   * delay runs *after* this method resolves — claiming whatever state the callback drains, and
   * completing unobserved. A caller using this as a barrier ("everything queued so far has been
   * handed off") would get no such guarantee, which is how a short-lived writer loses data: it
   * treats this as a flush, sees it resolve, and is torn down while the real batch is still in
   * flight (dxos/edge#758).
   */
  async runBlocking(): Promise<void> {
    await this._drainOutstanding();
    const callbackPromise = this._callback();
    // `_promise` must end up null and must never reject: `join` and the dispose hook await it
    // directly, so a retained rejection would make both throw, against the "never rejects" contract
    // on the field, and a retained promise would make every later `join` wait on an already-settled
    // one. Note the identity check compares the *tracked* promise -- the one actually stored -- since
    // comparing the raw callback promise would never match and would leave `_promise` set forever.
    // The caller still observes a rejection through `await callbackPromise` below.
    const tracked: Promise<void> = callbackPromise.then(
      () => {
        if (this._promise === tracked) {
          this._promise = null;
        }
      },
      () => {
        if (this._promise === tracked) {
          this._promise = null;
        }
      },
    );
    this._promise = tracked;
    await callbackPromise;
  }

  /**
   * Waits for the passes outstanding right now — a running callback and/or a scheduled one — and only
   * those. Backs {@link runBlocking}.
   *
   * Deliberately does not chase passes scheduled *after* the call. A callback that re-triggers itself
   * (a live subscription that keeps producing work, say) would otherwise keep this waiting until some
   * arbitrary cap and then return with a pass still pending: the caller waits an age and gets a false
   * barrier at the end of it, which is the very thing this fix is about. Bounding the wait to what was
   * outstanding on entry is both terminating and honest — work triggered later is new work, not
   * something the caller asked to wait for.
   */
  private async _drainOutstanding(): Promise<void> {
    const running = this._promise;
    const scheduled = this._scheduledTask;
    await running; // Can't be rejected.
    await scheduled;
  }
}
