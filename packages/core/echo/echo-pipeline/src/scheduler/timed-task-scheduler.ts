//
// Copyright 2025 DXOS.org
//

import { DeferredTask, sleepWithContext, asyncTimeout } from '@dxos/async';
import { type Context, Resource } from '@dxos/context';
import { option } from 'fast-check';

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
   * The rest time if the time budget is exceeded.
   * in [ms].
   */
  restTime: number;

  /**
   * The maximum number of tasks to run in parallel.
   */
  maxParallelTasks: number;

  /**
   * Clean executed tasks after time period.
   * in [ms].
   */
  cleanUpAfter: number;
};

export type Task<T> = {
  run: () => Promise<T>;
  result: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: any) => void;

  /**
   * The start timestamp of the task.
   */
  start: number;

  /**
   * The end timestamp of the task.
   */
  end: number;

  /**
   * The elapsed time of the task.
   * in [ms].
   */
  elapsed: number;

  /**
   * The timeout for the task.
   * in [ms].
   */
  timeout: number;
};
/**
 * Schedules and executes asynchronous tasks with time budgeting, parallelism, and rest periods.
 * It is designed to enable backpressure for time-consuming tasks in a controlled manner.
 */
export class TimedTaskScheduler<T = void> extends Resource {
  private readonly _executionQueue: Array<Task<T>> = [];
  private _processedTasks: Array<Task<T>> = [];
  private _executor?: DeferredTask = undefined;

  constructor(private readonly _params: TimedTaskSchedulerParams) {
    super();
  }

  /**
   * Info method for debugging purposes.
   */
  get processedTasks(): Array<Task<T>> {
    return this._processedTasks;
  }

  protected override async _open(ctx: Context): Promise<void> {
    this._executor = new DeferredTask(ctx, async () => {
      let now = Date.now();
      // Clean up old tasks.
      this._processedTasks = this._processedTasks.filter((task) => task.end > now - this._params.cleanUpAfter);

      // Early return if there are no tasks to run.
      if (this._executionQueue.length === 0) {
        return;
      }

      // Check if the budget is exceeded.
      if (this._processedTasks.length > 0) {
        const lastPeriodTasks = this._processedTasks.filter(
          (task) => task.start > now - this._params.budgetPeriod || task.end > now - this._params.budgetPeriod,
        );
        const lastPeriodTasksTime = lastPeriodTasks.reduce((acc, task) => acc + task.elapsed, 0);
        if (lastPeriodTasksTime >= this._params.budget) {
          await sleepWithContext(ctx, this._params.restTime);
          this._executor?.schedule();
          return;
        }
      }

      // Execute tasks.
      const tasks = this._executionQueue.splice(0, this._params.maxParallelTasks);
      now = Date.now();
      await Promise.all(
        tasks.map(async (task) => {
          task.start = now;
          try {
            const result = await asyncTimeout(task.run(), task.timeout);
            task.resolve(result);
            return result;
          } catch (error) {
            task.reject(error);
          } finally {
            task.end = Date.now();
            task.elapsed = task.end - task.start;
            this._processedTasks.push(task);
          }
        }),
      );

      if (this._executionQueue.length > 0) {
        this._executor?.schedule();
      }
    });
  }

  protected override async _close(ctx: Context): Promise<void> {
    this._executor = undefined;
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
