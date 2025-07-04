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
const TIME_PERIOD = 1000;

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
    // The previous task might still be running, so we need to wait for it to finish.
    await this._promise; // Can't be rejected.
    this._promise = this._callback();
    await this._promise;
  }
}
