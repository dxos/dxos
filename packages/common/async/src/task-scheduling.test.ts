import { Context } from "@dxos/context";
import { scheduleTask } from "./task-scheduling";
import waitForExpect from "wait-for-expect";
import { expect } from "chai";
import { sleep } from "./timeout";

describe('task-scheduling', () => {
  describe('scheduleTask', async () => {
    it('errors get propagated', async () => {
      let error!: Error;
      const ctx = new Context({
        onError: (ctx, err) => {
          error = err;
        }
      });

      scheduleTask(ctx, () => {
        throw new Error('test');
      })

      await waitForExpect(() => {
        expect(error.message).to.eq('test');
      })
    })

    it('cancelation', async () => {
      const ctx = new Context();

      let called = false;

      scheduleTask(ctx, () => {
        called = true;
      })

      ctx.dispose();
      await sleep(2);
      expect(called).to.be.false;
    })
  })
})