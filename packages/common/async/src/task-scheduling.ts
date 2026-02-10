//
// Copyright 2022 DXOS.org
//

import { type Context, ContextDisposedError } from '@dxos/context';
import { StackTrace } from '@dxos/debug';
import { type MaybePromise } from '@dxos/util';

import { trackResource } from './track-leaks';
import { Trigger } from './trigger';

/**
 * A task that can be scheduled to run in the next event loop iteration.
 * Could be triggered multiple times, but only runs once.
 * If a new task is triggered while a previous one is running, the next run would occur immediately after the current run has finished.
 * @deprecated Use AsyncJob instead.
 */
// TODO(dmaretskyi): Consider calling `join` on context dispose.
// TODO(burdon): Add throttling support.
export class DeferredTask {
  private _scheduled = false;
  private _currentTask: Promise<void> | null = null; // Can't be rejected.
  private _nextTask = new Trigger();

  constructor(
    private readonly _ctx: Context,
    private readonly _callback: () => Promise<void>,
  ) {}

  get scheduled() {
    return this._scheduled;
  }

  /**
   * Schedule the task to run asynchronously.
   */
  schedule(): void {
    if (this._scheduled) {
      return; // Already scheduled.
    }

    scheduleTask(this._ctx, async () => {
      // The previous task might still be running, so we need to wait for it to finish.
      await this._currentTask; // Can't be rejected.

      // Reset the flag. New tasks can now be scheduled. They would wait for the callback to finish.
      this._scheduled = false;
      const completionTrigger = this._nextTask;
      this._nextTask = new Trigger(); // Re-create the trigger as opposed to resetting it since there might be listeners waiting for it.

      // Store the promise so that new tasks could wait for this one to finish.
      this._currentTask = runInContextAsync(this._ctx, () => this._callback()).then(() => {
        completionTrigger.wake();
      });
    });

    this._scheduled = true;
  }

  /**
   * Schedule the task to run and wait for it to finish.
   */
  async runBlocking(): Promise<void> {
    if (this._ctx.disposed) {
      throw new ContextDisposedError();
    }

    this.schedule();
    await this._nextTask.wait();
  }

  /**
   * Waits for the current task to finish if it is running.
   * Does not schedule a new task.
   */
  async join(): Promise<void> {
    await this._currentTask;
  }
}

/**
 * A job that can be scheduled to run in the next event loop iteration.
 * Could be triggered multiple times, but only runs once.
 * If a new job is triggered while a previous one is running, the next run would occur immediately after the current run has finished.
 * Must be opened and closed, where close will wait for current execution to complete, ensuring there are no runaway jobs.
 */
export class AsyncJob {
  #callback: () => Promise<void>;
  #ctx?: Context = undefined;

  #scheduled = false;
  #currentTask: Promise<void> | null = null; // Can't be rejected.
  #nextTask = new Trigger();

  constructor(callback: () => Promise<void>) {
    this.#callback = callback;
  }

  get scheduled() {
    return this.#scheduled;
  }

  /**
   * Returns true if the job is open (has a context and it's not disposed).
   */
  get isOpen(): boolean {
    return this.#ctx !== undefined && !this.#ctx.disposed;
  }

  /**
   * Context of the resource that owns the job.
   * When the context is disposed, the job is cancelled and cannot be scheduled again.
   */
  // TODO(dmaretskyi): We don't really need to pass ctx in here, since close will also signal dispose.
  open(ctx: Context): void {
    this.#ctx = ctx;
  }

  /**
   * Closes the job and waits for it to finish if it is running.
   */
  async close(): Promise<void> {
    void this.#ctx?.dispose();
    this.#ctx = undefined;
    await this.join();
  }

  [Symbol.asyncDispose](): Promise<void> {
    return this.close();
  }

  /**
   * Schedule the job to run asynchronously.
   */
  schedule(): void {
    if (!this.#ctx || this.#ctx.disposed) {
      throw new Error('AsyncJob not open');
    }

    if (this.#scheduled) {
      return; // Already scheduled.
    }

    scheduleTask(this.#ctx, async () => {
      // The previous job might still be running, so we need to wait for it to finish.
      await this.#currentTask; // Can't be rejected.

      // Reset the flag and capture the trigger before any early exit.
      const completionTrigger = this.#nextTask;
      this.#nextTask = new Trigger(); // Re-create the trigger as opposed to resetting it since there might be listeners waiting for it.
      this.#scheduled = false;

      if (!this.#ctx || this.#ctx.disposed) {
        completionTrigger.wake();
        return;
      }

      // Store the promise so that new jobs could wait for this one to finish.
      this.#currentTask = runInContextAsync(this.#ctx, () => this.#callback()).finally(() =>
        completionTrigger.wake(),
      );
    });

    this.#scheduled = true;
  }

  /**
   * Schedule the job to run and wait for it to finish.
   */
  async runBlocking(): Promise<void> {
    if (this.#ctx?.disposed) {
      throw new ContextDisposedError();
    }

    this.schedule();
    await this.#nextTask.wait();
  }

  /**
   * Waits for the current job to finish if it is running.
   * Does not schedule a new job.
   */
  async join(): Promise<void> {
    await this.#currentTask;
  }
}

/**
 * @deprecated Use AsyncJob instead.
 */
export const AsyncTask = AsyncJob;

export const runInContext = (ctx: Context, fn: () => void) => {
  try {
    fn();
  } catch (err: any) {
    ctx.raise(err);
  }
};

export const runInContextAsync = async (ctx: Context, fn: () => MaybePromise<void>) => {
  try {
    await fn();
  } catch (err: any) {
    ctx.raise(err);
  }
};

export const scheduleMicroTask = (ctx: Context, fn: () => MaybePromise<void>) => {
  queueMicrotask(async () => {
    if (ctx.disposed) {
      return;
    }
    await runInContextAsync(ctx, fn);
  });
};

export const scheduleTask = (ctx: Context, fn: () => MaybePromise<void>, afterMs?: number) => {
  const clearTracking = trackResource(() => ({
    name: `task (${fn.name || 'anonymous'})`,
    openStack: new StackTrace(),
  }));

  const timeout = setTimeout(async () => {
    clearDispose();
    await runInContextAsync(ctx, fn);
    clearTracking();
  }, afterMs);

  const clearDispose = ctx.onDispose(() => {
    clearTracking();
    clearTimeout(timeout);
  });
};

/**
 * Run the task in the next event loop iteration, and then repeat in `interval` ms after the previous iteration completes.
 */
export const scheduleTaskInterval = (ctx: Context, task: () => Promise<void>, interval: number) => {
  const clearTracking = trackResource(() => ({
    name: `repeating task (${task.name || 'anonymous'})`,
    openStack: new StackTrace(),
  }));

  let timeoutId: NodeJS.Timeout;

  const run = async () => {
    await runInContextAsync(ctx, task);
    if (ctx.disposed) {
      return;
    }
    timeoutId = setTimeout(run, interval);
  };

  timeoutId = setTimeout(run, interval);
  ctx.onDispose(() => {
    clearTracking();
    clearTimeout(timeoutId);
  });
};

export const scheduleExponentialBackoffTaskInterval = (
  ctx: Context,
  task: () => Promise<void>,
  initialInterval: number,
) => {
  const clearTracking = trackResource(() => ({
    name: `repeating task (${task.name || 'anonymous'})`,
    openStack: new StackTrace(),
  }));

  let timeoutId: NodeJS.Timeout;

  let interval = initialInterval;
  const repeat = async () => {
    await runInContextAsync(ctx, task);
    if (ctx.disposed) {
      return;
    }
    interval *= 2;
    timeoutId = setTimeout(repeat, interval);
  };

  timeoutId = setTimeout(repeat, interval);
  ctx.onDispose(() => {
    clearTracking();
    clearTimeout(timeoutId);
  });
};
