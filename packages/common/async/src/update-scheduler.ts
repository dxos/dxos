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

    scheduleMicroTask(this._ctx, async () => {
      // The previous task might still be running, so we need to wait for it to finish.
      await this._promise?.catch(() => {});

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

      // The pre-claim barrier. The await above is only an optimization; correctness lives here: the
      // callback is not reentrant (it typically drains shared queued state), so the claim below may
      // only happen when no other pass is running — and that check must be re-evaluated with no
      // suspension point before the claim, hence a loop. A single await is not enough twice over: the
      // throttle sleep above opens one window, and resuming from any await opens another (a pass
      // parked on the same promise may have claimed and installed itself in `_promise` in the gap).
      // Rejections are another caller's business (`runBlocking`'s caller observes its own error).
      while (this._promise) {
        await this._promise.catch(() => {});
      }

      this._lastUpdateTime = performance.now();

      // Reset the flag. New tasks can now be scheduled. They would wait for the callback to finish.
      this._scheduled = false;
      this._promise = this._callback().then(
        () => {
          this._promise = null;
        },
        (error) => {
          this._promise = null;
          this._ctx.raise(error);
        },
      );
    });

    this._scheduled = true;
  }

  forceTrigger(): void {
    scheduleMicroTask(this._ctx, async () => {
      this._callback().catch((err) => this._ctx.raise(err));
    });
  }

  /**
   * Waits for the current task to finish if it is running.
   * Does not schedule a new task.
   */
  async join(): Promise<void> {
    await this._promise;
  }

  /**
   * Force schedule the task to run and wait for it to finish.
   */
  async runBlocking(): Promise<void> {
    // Pre-claim barrier, same as the one in `trigger`: on resume from an await, a triggered pass
    // that was parked on the same promise may have claimed the queue and installed itself in
    // `_promise` — a single await would overwrite it and run against an empty queue, resolving while
    // the claimed batch is still in flight. The caller treats this method as "everything queued so
    // far has been handed off", so that batch dies with a short-lived caller (dxos/edge#758's
    // orphaned `updateSubscription` batches). NOT a barrier over *scheduled* passes: a pass still in
    // its throttle sleep has claimed nothing, and waiting for it here would trade the loss for
    // stalls (and starvation under a self-retriggering callback).
    while (this._promise) {
      await this._promise.catch(() => {});
    }
    const callbackPromise = this._callback();
    // Track a wrapper that clears `_promise` on completion (identity-guarded — a later pass may have
    // replaced it) and absorbs the rejection for observers. Without the clear, `_promise` stays
    // settled-but-non-null after every `runBlocking`, and the loops above spin on it forever. The
    // caller still observes a rejection through `await callbackPromise` below.
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
}
