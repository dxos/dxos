import { test } from 'vitest';
import { PrioritizedScheduler, type TaskPriority } from './prioritized-scheduler';

test('add and remove tasks', ({ expect }) => {
  const scheduler = new PrioritizedScheduler();

  const log: string[] = [];

  scheduler.queueTask(3 as TaskPriority, () => log.push('task3-1'));
  scheduler.queueTask(1 as TaskPriority, () => log.push('task1-1'));
  scheduler.queueTask(1 as TaskPriority, () => log.push('task1-2'));
  scheduler.queueTask(2 as TaskPriority, () => log.push('task2-1'));

  scheduler.runTask();
  expect(log).toEqual(['task1-1']);

  scheduler.runTask();
  scheduler.runTask();
  scheduler.runTask();
  expect(log).toEqual(['task1-1', 'task1-2', 'task2-1', 'task3-1']);
});
