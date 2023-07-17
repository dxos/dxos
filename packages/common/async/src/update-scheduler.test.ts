import { describe, test } from "@dxos/test";
import { UpdateScheduler } from "./update-scheduler";
import { Context } from "@dxos/context";
import { sleep } from "./timeout";
import { expect } from "chai";

describe('update-scheduler', () => {
  test('schedules updates', async () => {
    let updates = 0;

    const ctx = new Context();
    const scheduler = new UpdateScheduler(
      ctx,
      async () => { updates++; }
    );

    scheduler.trigger();
    scheduler.trigger();

    await sleep(5)
    expect(updates).to.eq(1);
  })
});