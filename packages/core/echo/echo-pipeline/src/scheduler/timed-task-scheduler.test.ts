//
// Copyright 2025 DXOS.org
//

import { describe, test, onTestFinished } from 'vitest';

import { sleep } from '@dxos/async';

import { TimedTaskScheduler, type TimedTaskSchedulerParams } from './timed-task-scheduler';
import { log } from '@dxos/log';

describe('TimedTaskScheduler', () => {
  const getPlanner = async (params: Partial<TimedTaskSchedulerParams> = {}) => {
    const planner = new TimedTaskScheduler<any>({
      budget: 500,
      budgetPeriod: 1000,
      cooldown: 500,
      maxParallelTasks: 1,
      saveHistoryFor: 5000,
      ...params,
    });

    await planner.open();
    onTestFinished(async () => {
      await planner.close();
    });
    return planner;
  };

  test('should schedule task', async ({ expect }) => {
    const planner = await getPlanner();
    const result = await planner.schedule(async () => 1);
    expect(result).toEqual(1);
  });

  test('respects order', async ({ expect }) => {
    const planner = await getPlanner();
    const result = await Promise.all([
      planner.schedule(async () => sleep(10).then(() => 1)),
      planner.schedule(async () => 2),
    ]);
    expect(result).toEqual([1, 2]);
  });

  test('respects maxParallelTasks', async ({ expect }) => {
    const planner = await getPlanner({ maxParallelTasks: 2 });
    await Promise.all([
      planner.schedule(async () => sleep(10).then(() => 1)),
      planner.schedule(async () => sleep(10).then(() => 2)),
      planner.schedule(async () => sleep(10).then(() => 3)),
      planner.schedule(async () => sleep(10).then(() => 4)),
    ]);

    await expect.poll(() => planner.processedBatches.length, { timeout: 1000 }).toEqual(2);
  });

  test('respects budget', async ({ expect }) => {
    const budgetPeriod = 100;
    const planner = await getPlanner({ budget: 10, budgetPeriod, cooldown: 50, maxParallelTasks: 2 });

    const testStart = Date.now();
    await Promise.all([
      planner.schedule(async () => sleep(10).then(() => 1)),
      planner.schedule(async () => sleep(20).then(() => 2)),
      planner.schedule(async () => sleep(10).then(() => 3)),
    ]);
    await expect.poll(() => planner.processedBatches.length, { timeout: 1000 }).toEqual(2);
    // First two tasks should be executed immediately, the third one should wait for the budget to reset.
    expect(planner.processedBatches[0].start - testStart).toBeLessThan(10);
    expect(planner.processedBatches[1].start - testStart).toBeGreaterThan(budgetPeriod);
  });

  test('respects timeout', async ({ expect }) => {
    const planner = await getPlanner();

    const result1 = planner.schedule(async () => sleep(100).then(() => 1), { timeout: 200 });
    const result2 = planner.schedule(async () => sleep(300).then(() => 2), { timeout: 200 });
    await expect(result1).resolves.toEqual(1);
    await expect(result2).rejects.toThrow();
  });

  test('parallel execution consumes budget once', async ({ expect }) => {
    const budgetPeriod = 300;
    const planner = await getPlanner({ budget: 100, budgetPeriod, cooldown: 250, maxParallelTasks: 2 });

    // Two first tasks should run in one batch and consume ~70ms of budget.
    // Third task should run in another batch and not trigger cooldown.
    const taskDuration = 70;
    const start = Date.now();
    await Promise.all([
      planner.schedule(() => sleep(taskDuration)), //
      planner.schedule(() => sleep(taskDuration)), //
      planner.schedule(() => sleep(taskDuration)),
    ]);
    await planner.schedule(() => sleep(taskDuration));
    await expect.poll(() => planner.processedBatches.length, { timeout: 1000 }).toEqual(2);
    expect(planner.processedBatches[0].tasks.length).toEqual(2);

    // All three tasks should run before cooldown.
    expect(planner.processedBatches[0].start - start).toBeLessThan(budgetPeriod);
    expect(planner.processedBatches[1].start - start).toBeLessThan(budgetPeriod);
  });

  test('long task consumes budget', async ({ expect }) => {
    const budgetPeriod = 300;
    const planner = await getPlanner({ budget: 100, budgetPeriod, cooldown: 250, maxParallelTasks: 2 });

    // Two first tasks should run in one batch and consume ~70ms of budget.
    // Third task should run in another batch and not trigger cooldown.
    const taskDuration = 70;
    const start = Date.now();
    await Promise.all([
      planner.schedule(() => sleep(150)), // Long task.
      planner.schedule(() => sleep(taskDuration)), //
      planner.schedule(() => sleep(taskDuration)),
    ]);
    await expect.poll(() => planner.processedBatches.length, { timeout: 1000 }).toEqual(2);
    expect(planner.processedBatches[0].tasks.length).toEqual(2);
    expect(planner.processedBatches[1].tasks.length).toEqual(1);

    // All three tasks should run before cooldown.
    expect(planner.processedBatches[0].start - start).toBeLessThan(budgetPeriod);
    expect(planner.processedBatches[1].start - start).toBeGreaterThan(budgetPeriod);
  });
});
