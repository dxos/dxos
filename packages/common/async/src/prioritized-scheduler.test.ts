import { test } from 'vitest';
import { PrioritizedScheduler, yieldToEventLoop, yieldWithPriority, type TaskPriority } from './prioritized-scheduler';

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

test('yield event loop', async ({ expect }) => {
  const log: string[] = [];

  setTimeout(() => log.push('timeout1'));
  await yieldToEventLoop().then(() => log.push('yield1'));

  expect(log).toEqual(['timeout1', 'yield1']);
});

test('yield with priority', async ({ expect }) => {
  const log: string[] = [];

  const task1 = async () => {
    await yieldWithPriority(1 as TaskPriority);
    log.push('task1-1');
    setTimeout(() => log.push('task1-2'), 0);
    await yieldWithPriority(1 as TaskPriority);
    log.push('task1-3');
  };

  const task2 = async () => {
    await yieldWithPriority(2 as TaskPriority);
    log.push('task2-1');
    await yieldWithPriority(2 as TaskPriority);
    log.push('task2-2');
  };

  await Promise.all([task1(), task2()]);

  // Does
  // expect(log).toEqual(['task1-1', 'task1-2', 'task1-3', 'task2-1', 'task2-2']);
});
