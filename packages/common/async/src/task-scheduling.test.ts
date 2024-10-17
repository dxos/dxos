//
// Copyright 2022 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Context } from '@dxos/context';

import { DeferredTask, scheduleTask } from './task-scheduling';
import { sleep } from './timeout';

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
});
