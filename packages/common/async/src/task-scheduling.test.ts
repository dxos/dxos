//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';
import waitForExpect from 'wait-for-expect';

import { Context } from '@dxos/context';
import { describe, test } from '@dxos/test';

import { TaskPriority, scheduleMacroTask, scheduleTask } from './task-scheduling';
import { sleep } from './timeout';
import { Trigger } from './trigger';

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

      await waitForExpect(() => {
        expect(error.message).to.eq('test');
      });
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
  });

  test('scheduleMacroTask', async () => {
    let count = 0;
    const ctx = new Context();

    scheduleMacroTask(ctx, () => {
      count++;
    });

    const trigger = new Trigger();
    scheduleMacroTask(ctx, () => {
      trigger.wake();
    });

    await trigger.wait();
    expect(count).to.eq(1);
  });

  test('scheduleMacroTask with priority', async () => {
    const events: string[] = [];
    const ctx = new Context();
    const trigger = new Trigger();

    scheduleMacroTask(
      ctx,
      () => {
        events.push('normal');
      },
      { priority: TaskPriority.Normal },
    );
    scheduleMacroTask(
      ctx,
      () => {
        events.push('high');
      },
      { priority: TaskPriority.High },
    );
    scheduleMacroTask(
      ctx,
      () => {
        trigger.wake();
      },
      { priority: TaskPriority.Low },
    );

    await trigger.wait();
    expect(events).to.deep.eq(['high', 'normal']);
  });
});
