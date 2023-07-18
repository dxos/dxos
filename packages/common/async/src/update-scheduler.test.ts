//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { Context } from '@dxos/context';
import { describe, test } from '@dxos/test';

import { sleep } from './timeout';
import { UpdateScheduler } from './update-scheduler';

describe('update-scheduler', () => {
  test('schedules updates', async () => {
    let updates = 0;

    const ctx = new Context();
    const scheduler = new UpdateScheduler(ctx, async () => {
      updates++;
    });

    scheduler.trigger();
    scheduler.trigger();

    await sleep(5);
    expect(updates).to.eq(1);
  });
});
