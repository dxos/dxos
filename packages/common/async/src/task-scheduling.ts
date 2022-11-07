export type ClearCallback = () => void

/**
 * Schedule a task to run in the next event loop iteration.
 */
export const scheduleTask = (task: () => Promise<void>): ClearCallback => {
  const id = setTimeout(task);
  return () => clearTimeout(id);
}

/**
 * Run the task in the next event loop iteration, and then repeat in `interval` ms after the previous iteration completes.
 */
export const repeatTask = (task: () => Promise<void>, interval: number): ClearCallback => {
  let id: NodeJS.Timeout;

  const run = async () => {
    await task();
    id = setTimeout(run, interval);
  };

  id = setTimeout(run, interval);

  return () => clearTimeout(id);
}

/**
 * A task that can be scheduled to run in the next event loop iteration.
 * Could be triggered multiple times, but only runs once.
 * If the task is triggered while it is running, the next run would occur immediately after the current run has finished.
 */
export class DeferredTask {
  private _handle: ClearCallback | null = null; 
  private _promise: Promise<void> | null = null;

  constructor(private readonly _callback: () => Promise<void>) {}

  schedule() {
    if (this._handle) {
      return; // Already scheduled.
    }
    this._handle = scheduleTask(async () => {
      // The previous task might still be running, so we need to wait for it to finish.
      try {
        await this._promise;
      } catch(err) {
        Promise.reject(err); // Unhandled promise rejection.
      }

      // Reset the handle. New tasks can now be scheduled. They would wait for the callback to finish.
      this._handle = null;

      // Store the promise so that new tasks could wait for this one to finish.
      this._promise = this._callback();
    });
  }

  clear() {
    // TODO(dmaretskyi): Disposing via context should handle errors in the callback.
    this._handle?.();
  }
}