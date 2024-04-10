//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';
import waitForExpect from 'wait-for-expect';

import { Context } from '@dxos/context';
import { describe, test } from '@dxos/test';

import { isThreadSaturated, scheduleTask, yieldUntilIdle } from './task-scheduling';
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

  test('isThreadSaturated', async () => {
    // just a sanity check
    if (isThreadSaturated()) {
      await yieldUntilIdle();
    }
  });
});
