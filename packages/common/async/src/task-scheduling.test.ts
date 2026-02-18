//
// Copyright 2022 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Context, ContextDisposedError } from '@dxos/context';

import { AsyncTask, DeferredTask, scheduleTask } from './task-scheduling';
import { asyncTimeout, sleep } from './timeout';

describe('task-scheduling', () => {
  describe('scheduleTask', () => {
    test('errors get propagated', async () => {
      let error!: Error;
      const ctx = new Context({
        onError: (err) => {
          error = err;
        },
      });

      scheduleTask(ctx, () => {
        throw new Error('test');
      });

      await expect.poll(() => error.message).toBe('test');
    });

    test('cancelation', async () => {
      const ctx = new Context();

      let called = false;

      scheduleTask(ctx, () => {
        called = true;
      });

      void ctx.dispose();
      await sleep(2);
      expect(called).to.be.false;
    });

    test('run blocking', async () => {
      const events: string[] = [];
      const task = new DeferredTask(Context.default(), async () => {
        await sleep(10);
        events.push('task done');
      });

      await task.runBlocking();
      expect(events).to.deep.eq(['task done']);
    });

    test('join', async () => {
      const task = new DeferredTask(Context.default(), async () => {
        await sleep(10);
      });

      await task.join(); // Should be a no-op.

      await task.runBlocking();

      await task.join(); // Should be a no-op.
    });
  });

  describe('AsyncTask', () => {
    test('basic run blocking', async ({ expect }) => {
      const ctx = new Context();
      const events: string[] = [];
      const task = new AsyncTask(async () => {
        await sleep(10);
        events.push('task done');
      });

      task.open(ctx);
      await task.runBlocking();
      expect(events).toEqual(['task done']);
      await task.close();
    });

    test('join waits for running task but not scheduled task', async ({ expect }) => {
      const ctx = new Context();
      const events: string[] = [];
      const task = new AsyncTask(async () => {
        events.push('task start');
        await sleep(20);
        events.push('task done');
      });

      task.open(ctx);
      task.schedule();

      // join() returns immediately if no task is running yet.
      await task.join();
      expect(events).toEqual([]);

      // Wait for task to start running.
      await sleep(5);
      expect(events).toEqual(['task start']);

      // Now join() waits for the running task.
      await task.join();
      expect(events).toEqual(['task start', 'task done']);

      await task.close();
    });

    test('schedule throws when not open', ({ expect }) => {
      const task = new AsyncTask(async () => {});
      expect(() => task.schedule()).toThrow(ContextDisposedError);
    });

    test('schedule throws after close', async ({ expect }) => {
      const ctx = new Context();
      const task = new AsyncTask(async () => {});
      task.open(ctx);
      await task.close();
      expect(() => task.schedule()).toThrow(ContextDisposedError);
    });

    test('runBlocking throws ContextDisposedError when context is already disposed', async ({ expect }) => {
      const ctx = new Context();
      const task = new AsyncTask(async () => {
        await sleep(100);
      });

      task.open(ctx);
      await task.close();

      await expect(task.runBlocking()).rejects.toThrow(ContextDisposedError);
    });

    test('close unblocks runBlocking waiters', async ({ expect }) => {
      const ctx = new Context();
      const task = new AsyncTask(async () => {
        await sleep(1000);
      });

      task.open(ctx);

      const runBlockingPromise = task.runBlocking();

      // Give time for the task to be scheduled but not yet started.
      await sleep(0);

      // Close should unblock the waiter.
      const closePromise = task.close();

      // runBlocking should throw ContextDisposedError, not hang forever.
      await expect(asyncTimeout(runBlockingPromise, 100)).rejects.toThrow(ContextDisposedError);

      await closePromise;
    });

    test('close unblocks multiple concurrent runBlocking waiters', async ({ expect }) => {
      const ctx = new Context();
      const task = new AsyncTask(async () => {
        await sleep(1000);
      });

      task.open(ctx);

      // Start multiple runBlocking calls.
      const promises = [task.runBlocking(), task.runBlocking(), task.runBlocking()];

      // Give time for the tasks to be scheduled.
      await sleep(0);

      // Close should unblock all waiters.
      const closePromise = task.close();

      // All runBlocking calls should throw ContextDisposedError.
      for (const promise of promises) {
        await expect(asyncTimeout(promise, 100)).rejects.toThrow(ContextDisposedError);
      }

      await closePromise;
    });

    test('close while task is running waits for completion', async ({ expect }) => {
      const ctx = new Context();
      const events: string[] = [];
      const task = new AsyncTask(async () => {
        events.push('task start');
        await sleep(50);
        events.push('task end');
      });

      task.open(ctx);
      task.schedule();

      // Wait for the task to start.
      await sleep(10);

      // Close should wait for the task to finish.
      await task.close();

      expect(events).toEqual(['task start', 'task end']);
    });

    test('async dispose protocol', async ({ expect }) => {
      const ctx = new Context();
      const events: string[] = [];
      const task = new AsyncTask(async () => {
        events.push('task done');
      });

      task.open(ctx);
      await task.runBlocking();
      await task[Symbol.asyncDispose]();

      expect(events).toEqual(['task done']);
    });

    test('scheduling multiple times only runs once per cycle', async ({ expect }) => {
      const ctx = new Context();
      let runCount = 0;
      const task = new AsyncTask(async () => {
        runCount++;
      });

      task.open(ctx);
      task.schedule();
      task.schedule();
      task.schedule();

      // Use runBlocking to wait for the scheduled task to complete.
      await task.runBlocking();

      expect(runCount).toBe(1);
      await task.close();
    });
  });
});
