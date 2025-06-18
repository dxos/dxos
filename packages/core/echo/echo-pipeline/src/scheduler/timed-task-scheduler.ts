//
// Copyright 2025 DXOS.org
//

import { DeferredTask, sleepWithContext, asyncTimeout } from '@dxos/async';
import { type Context, Resource } from '@dxos/context';

const DEFAULT_TIMEOUT = 30_000;

export type TimedTaskSchedulerParams = {
  /**
   * The time budget for the task execution.
   * in [ms].
   */
  budget: number;

  /**
   * The time period for the budget calculation.
   * in [ms].
   */
  budgetPeriod: number;

  /**
   * The cooldown time if the time budget is exceeded.
   * in [ms].
   */
  cooldown: number;

  /**
   * The maximum number of tasks to run in parallel.
   */
  maxParallelTasks: number;

  /**
   * Save executed tasks for time period.
   * For debugging purposes.
   * in [ms].
   */
  saveHistoryFor: number;
};

export type Task<T> = {
  run: () => Promise<T>;
  result: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: any) => void;

  /**
   * The timeout for the task.
   * in [ms].
   */
  timeout: number;
};

type ParallelBatch<T> = {
  start: number;
  end: number;
  elapsed: number;
  tasks: Array<Task<T>>;
};

/**
 * Schedules and executes asynchronous tasks with time budgeting, parallelism, and cooldown periods.
 * It is designed to enable backpressure for time-consuming tasks in a controlled manner.
 */
export class TimedTaskScheduler<T = void> extends Resource {
  private readonly _executionQueue: Array<Task<T>> = [];
  private _executor?: DeferredTask = undefined;

  private _processedBatches: Array<ParallelBatch<T>> = [];

  constructor(private readonly _params: TimedTaskSchedulerParams) {
    super();
  }

  /**
   * Returns the processed batches.
   */
  get processedBatches(): Array<ParallelBatch<T>> {
    return this._processedBatches;
  }

  protected override async _open(ctx: Context): Promise<void> {
    this._executor = new DeferredTask(ctx, async () => {
      const now = Date.now();
      // Clean up old tasks.
      const cutoutTimestamp = now - Math.max(this._params.saveHistoryFor, this._params.budgetPeriod);
      this._processedBatches = this._processedBatches.filter((batch) => batch.end > cutoutTimestamp);

      if (this._executionQueue.length === 0) {
        return;
      }

      if (this._shouldCooldown()) {
        await sleepWithContext(ctx, this._params.cooldown);
        this._executor?.schedule();
        return;
      }

      // Execute tasks.
      const tasks = this._executionQueue.splice(0, this._params.maxParallelTasks);
      const startBatch = Date.now();
      await Promise.all(
        tasks.map(async (task) => {
          try {
            const result = await asyncTimeout(task.run(), task.timeout);
            task.resolve(result);
            return result;
          } catch (error) {
            task.reject(error);
          }
        }),
      );
      const endBatch = Date.now();
      this._processedBatches.push({
        start: startBatch,
        end: endBatch,
        elapsed: endBatch - startBatch,
        tasks,
      });

      if (this._executionQueue.length > 0) {
        this._executor?.schedule();
      }
    });
  }

  protected override async _close(ctx: Context): Promise<void> {
    this._executor = undefined;
  }

  private _shouldCooldown(): boolean {
    const now = Date.now();
    const batchesInPeriod = this._processedBatches.filter((batch) => batch.end > now - this._params.budgetPeriod);
    if (batchesInPeriod.length === 0) {
      return false;
    }
    const consumedBudget = batchesInPeriod.reduce((acc, batch) => acc + batch.elapsed, 0);
    if (consumedBudget >= this._params.budget) {
      return true;
    }

    return false;
  }

  /**
   * Adds tasks to execution queue.
   * @param task - The task function to be executed.
   * @param options - Optional parameters for the task, such as timeout.
   * @param options.timeout - The maximum time to wait for the task to complete.
   *                          Defaults to 30 seconds if not specified.
   * @returns An array of promises that resolve to the results of the tasks.
   */
  schedule(task: Task<T>['run'], options?: Pick<Task<T>, 'timeout'>): Promise<T> {
    const taskToSchedule = {
      run: task,
      timeout: options?.timeout ?? DEFAULT_TIMEOUT,
    } as Task<T>;

    taskToSchedule.result = new Promise<T>((resolve, reject) => {
      taskToSchedule.resolve = resolve;
      taskToSchedule.reject = reject;
    });
    this._executionQueue.push(taskToSchedule);
    this._executor!.schedule();

    return taskToSchedule.result;
  }
}
