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

/**
 * Guard on {@link UpdateScheduler._settle}: a callback that re-triggers itself cannot hang the
 * caller. Far above any legitimate chain.
 */
const MAX_SETTLE_ROUNDS = 100;

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
      await this._settle(); // Context waits for callback to finish.
    });
  }

  trigger(): void {
    if (this._scheduled) {
      return;
    }

    this._scheduled = true;
    this._scheduledTask = new Promise<void>((resolveScheduled) => {
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
          // clearing that one would hide a running callback from `_settle`.
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
          this._scheduled = false;
          this._scheduledTask = null;
          resolveScheduled();
        }
      });
    });
  }

  forceTrigger(): void {
    scheduleMicroTask(this._ctx, async () => {
      this._callback().catch((err) => this._ctx.raise(err));
    });
  }

  /**
   * Waits for the current task to finish if it is running, including one that has been scheduled but
   * has not started yet. Does not schedule a new task.
   */
  async join(): Promise<void> {
    await this._settle();
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
    await this._settle();
    this._promise = this._callback();
    await this._promise;
  }

  /**
   * Waits until neither a running nor a scheduled pass remains. Loops because awaiting one can let
   * another be scheduled behind it — the callback itself may trigger more work.
   */
  private async _settle(): Promise<void> {
    for (let round = 0; round < MAX_SETTLE_ROUNDS; round++) {
      if (this._promise == null && this._scheduledTask == null) {
        return;
      }
      await this._promise; // Can't be rejected.
      await this._scheduledTask;
    }
  }
}
