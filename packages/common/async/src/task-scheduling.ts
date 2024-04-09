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

  constructor(
    private readonly _ctx: Context,
    private readonly _callback: () => Promise<void>,
  ) {}

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
  const clearTracking = trackResource(() => ({
    name: `task (${fn.name || 'anonymous'})`,
    openStack: new StackTrace(),
  }));

  if (afterMs !== undefined) {
    const timeout = setTimeout(async () => {
      clearDispose();
      await runInContextAsync(ctx, fn);
      clearTracking();
    }, afterMs);

    const clearDispose = ctx.onDispose(() => {
      clearTracking();
      clearTimeout(timeout);
    });
  } else {
    // We prefer MessageChannel because of the 4ms setTimeout clamping.
    const messageChannel = new MessageChannel();
    messageChannel.port1.onmessage = async () => {
      messageChannel.port1.close();
      clearDispose();
      await runInContextAsync(ctx, fn);
      clearTracking();
    };

    const clearDispose = ctx.onDispose(() => {
      clearTracking();
      messageChannel.port1.close();
    });

    messageChannel.port2.postMessage(null);
  }
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

const IDLE_DETECTION_INTERVAL = 200;
const IDLE_THRESHOLD = IDLE_DETECTION_INTERVAL * 2;

// Unix timestamp of the last time the idle detection task was run.
// NOTE: Date.now() is used instead of performance.now() because the latter is significantly slower.
let lastIdleTime = Date.now();
const tasksOnIdle: (() => void)[] = [];

// If the timer is delayed, we know that the thread is saturated.
const scheduleIdleTask = () => {
  setTimeout(() => {
    lastIdleTime = Date.now();

    // Run the tasks that were scheduled to run on idle.
    const tasksToRun = Array.from(tasksOnIdle);
    tasksOnIdle.length = 0;
    for (const task of tasksToRun) {
      task();
    }

    scheduleIdleTask();
  }, IDLE_DETECTION_INTERVAL);
};

scheduleIdleTask();

/**
 * Detects when the thread is saturated and is not able to run tasks in a timely manner.
 */
export const isThreadSaturated = () => {
  return Date.now() - lastIdleTime > IDLE_THRESHOLD;
};

/**
 * Delay the task until the thread is idle.
 * Make sure to guard this call with `isThreadSaturated` to avoid delays.
 *
 * @example
 * ```ts
 * if (isThreadSaturated()) {
 *  await yieldUntilIdle();
 * }
 * ```
 */
export const yieldUntilIdle = async () => {
  await new Promise<void>((resolve) => {
    tasksOnIdle.push(resolve);
  });
};
