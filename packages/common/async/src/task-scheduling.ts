//
// Copyright 2022 DXOS.org
//

import { type Context } from '@dxos/context';
import { StackTrace } from '@dxos/debug';
import { type MaybePromise } from '@dxos/util';

import { trackResource } from './track-leaks';

export type ClearCallback = () => void;

/**
 * A task that can be scheduled to run in the next event loop iteration.
 * Could be triggered multiple times, but only runs once.
 * If a new task is triggered while a previous one is running, the next run would occur immediately after the current run has finished.
 */
export class DeferredTask {
  private _scheduled = false;
  private _promise: Promise<void> | null = null; // Can't be rejected.

  constructor(private readonly _ctx: Context, private readonly _callback: () => Promise<void>) {}

  schedule() {
    if (this._scheduled) {
      return; // Already scheduled.
    }

    scheduleTask(this._ctx, async () => {
      // The previous task might still be running, so we need to wait for it to finish.
      await this._promise; // Can't be rejected.

      // Reset the flag. New tasks can now be scheduled. They would wait for the callback to finish.
      this._scheduled = false;

      // Store the promise so that new tasks could wait for this one to finish.
      this._promise = runInContextAsync(this._ctx, () => this._callback());
    });

    this._scheduled = true;
  }
}

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
  const clearTracking = trackResource({
    name: `task (${fn.name || 'anonymous'})`,
    openStack: new StackTrace(),
  });

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
  const clearTracking = trackResource({
    name: `repeating task (${task.name || 'anonymous'})`,
    openStack: new StackTrace(),
  });

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
  const clearTracking = trackResource({
    name: `repeating task (${task.name || 'anonymous'})`,
    openStack: new StackTrace(),
  });

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
