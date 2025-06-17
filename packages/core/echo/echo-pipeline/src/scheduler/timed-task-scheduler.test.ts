//
// Copyright 2025 DXOS.org
//

import { describe, test, onTestFinished } from 'vitest';

import { sleep } from '@dxos/async';

import { TimedTaskScheduler, type TimedTaskSchedulerParams } from './timed-task-scheduler';

describe('TimedTaskScheduler', () => {
  const getPlanner = async (params: Partial<TimedTaskSchedulerParams> = {}) => {
    const planner = new TimedTaskScheduler<any>({
      budget: 500,
      budgetPeriod: 1000,
      restTime: 500,
      maxParallelTasks: 1,
      cleanUpAfter: 5000,
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
    const result = await Promise.all(planner.schedule([{ run: async () => 1 }]));
    expect(result).toEqual([1]);
  });

  test('respects order', async ({ expect }) => {
    const planner = await getPlanner();
    const result = await Promise.all(
      planner.schedule([
        {
          run: async () => {
            await sleep(10);
            return 1;
          },
        },
        { run: async () => 2 },
      ]),
    );
    expect(result).toEqual([1, 2]);
  });

  test('respects budget', async ({ expect }) => {
    const planner = await getPlanner({ budget: 10, budgetPeriod: 100, restTime: 50, maxParallelTasks: 2 });

    const testStart = Date.now();
    await Promise.all(
      planner.schedule([
        { run: async () => sleep(10).then(() => 1) },
        { run: async () => sleep(10).then(() => 2) },
        { run: async () => sleep(10).then(() => 3) },
      ]),
    );
    // First two tasks should be executed immediately, the third one should wait for the budget to reset.
    expect(planner.processedTasks[0].start - testStart).toBeLessThan(20);
    expect(planner.processedTasks[1].start - testStart).toBeLessThan(20);
    expect(planner.processedTasks[2].start - testStart).toBeGreaterThan(100);
  });

  test('respects timeout', async ({ expect }) => {
    const planner = await getPlanner({ budget: 1000, budgetPeriod: 1000, restTime: 500, maxParallelTasks: 1 });

    const [result1, result2] = planner.schedule([
      { run: async () => sleep(100).then(() => 1), timeout: 200 },
      { run: async () => sleep(300).then(() => 2), timeout: 200 },
    ]);
    await expect(result1).resolves.toEqual(1);
    await expect(result2).rejects.toThrow();
  });
});
