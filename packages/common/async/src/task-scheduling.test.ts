//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';
import waitForExpect from 'wait-for-expect';

import { Context } from '@dxos/context';

import { scheduleTask } from './task-scheduling';
import { sleep } from './timeout';

describe('task-scheduling', function () {
  describe('scheduleTask', function () {
    it('errors get propagated', async function () {
      let error!: Error;
      const ctx = new Context({
        onError: (err) => {
          error = err;
        }
      });

      scheduleTask(ctx, () => {
        throw new Error('test');
      });

      await waitForExpect(() => {
        expect(error.message).to.eq('test');
      });
    });

    it('cancelation', async function () {
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
});
