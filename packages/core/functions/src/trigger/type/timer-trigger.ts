//
// Copyright 2024 DXOS.org
//

import { parseCronExpression } from 'cron-schedule';

import { DeferredTask } from '@dxos/async';
import { type Space } from '@dxos/client/echo';
import { type Context } from '@dxos/context';
import { log } from '@dxos/log';

import type { TimerTrigger } from '../../types';
import { type TriggerCallback, type TriggerFactory } from '../trigger-registry';

export const createTimerTrigger: TriggerFactory<TimerTrigger> = async (
  ctx: Context,
  space: Space,
  spec: TimerTrigger,
  callback: TriggerCallback,
) => {
  const task = new DeferredTask(ctx, async () => {
    await callback({});
  });

  let last = 0;
  let run = 0;
  const schedule = parseCronExpression(spec.cron);
  const getRunTimeout = () => Date.now() - schedule.getNextDate().getTime();
  const runCron = () => {
    if (ctx.disposed) {
      return;
    }
    // TODO(burdon): Check greater than 30s (use cron-parser).
    const now = Date.now();
    const delta = last ? now - last : 0;
    last = now;

    run++;
    log.info('tick', { space: space.key.truncate(), count: run, delta });
    task.schedule();

    timeout = setTimeout(runCron, getRunTimeout());
  };

  let timeout = setTimeout(runCron, getRunTimeout());

  ctx.onDispose(() => clearTimeout(timeout));
};
