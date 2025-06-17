//
// Copyright 2025 DXOS.org
//

import { type Context, Resource } from '@dxos/context';
import { invariant } from '@dxos/invariant';

import { DeferredTask } from './task-scheduling';
import { sleepWithContext, asyncTimeout } from './timeout';

const DEFAULT_TIMEOUT = 30_000;

export type BackpressureExecutorParams = {
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

export type RunParams<T> = {
  run: Task<T>['run'];
  timeout?: Task<T>['timeout'];
}[];

export class BackpressureExecutor<T> extends Resource {
  private readonly _executionQueue: Array<Task<T>> = [];
  private _processedTasks: Array<Task<T>> = [];
  private _executor?: DeferredTask = undefined;

  constructor(private readonly _params: BackpressureExecutorParams) {
    super();
  }

  protected override async _open(ctx: Context): Promise<void> {
    this._executor = new DeferredTask(ctx, async () => {
      // Clean up old tasks.
      this._processedTasks = this._processedTasks.filter((task) => task.end > Date.now() - this._params.cleanUpAfter);

      // Early return if there are no tasks to run.
      if (this._executionQueue.length === 0) {
        return;
      }

      // Check if the budget is exceeded.
      if (this._processedTasks.length > 0) {
        const lastPeriodTasks = this._processedTasks.filter(
          (task) =>
            task.start > Date.now() - this._params.budgetPeriod || task.end > Date.now() - this._params.budgetPeriod,
        );
        const lastPeriodTasksTime = lastPeriodTasks.reduce((acc, task) => acc + task.elapsed, 0);
        if (lastPeriodTasksTime >= this._params.budget) {
          await sleepWithContext(ctx, this._params.restTime);
          this._executor!.schedule();
          return;
        }
      }

      // Execute tasks.
      const tasks = this._executionQueue.splice(0, this._params.maxParallelTasks);
      await Promise.all(
        tasks.map(async (task) => {
          task.start = Date.now();
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
        this._executor!.schedule();
      }
    });
  }

  protected override async _close(ctx: Context): Promise<void> {
    this._executor = undefined;
  }

  /**
   * Info method for debugging purposes.
   */
  get processedTasks(): Array<Task<T>> {
    return this._processedTasks;
  }

  /**
   * Adds tasks to execution queue.
   * @returns An array of promises that resolve to the results of the tasks.
   */
  execute(tasks: RunParams<T>): Promise<T>[] {
    const tasksToSchedule = tasks.map(({ run, timeout }) => {
      const task = {
        run,
        timeout: timeout ?? DEFAULT_TIMEOUT,
      } as Task<T>;

      task.result = new Promise<T>((resolve, reject) => {
        task.resolve = resolve;
        task.reject = reject;
      });
      invariant(task.result, 'result is not defined');
      invariant(task.resolve, 'resolve is not defined');
      invariant(task.reject, 'reject is not defined');

      return task satisfies Task<T>;
    });
    this._executionQueue.push(...tasksToSchedule);
    this._executor!.schedule();

    return tasksToSchedule.map((task) => task.result);
  }
}
