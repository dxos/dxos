//
// Copyright 2024 DXOS.org
//

import { CronJob } from 'cron';

import { DeferredTask } from '@dxos/async';
import { type Context } from '@dxos/context';
import { log } from '@dxos/log';

import { type FunctionTriggerContext, type OnTriggerCallback, type TriggerFactory } from './trigger-registry';
import type { TimerTrigger } from '../types';

export const createTimerTrigger: TriggerFactory<TimerTrigger> = async (
  ctx: Context,
  triggerContext: FunctionTriggerContext,
  spec: TimerTrigger,
  callback: OnTriggerCallback,
) => {
  const task = new DeferredTask(ctx, async () => {
    await callback({});
  });

  let last = 0;
  let run = 0;
  // https://www.npmjs.com/package/cron#constructor
  const job = CronJob.from({
    cronTime: spec.cron,
    runOnInit: false,
    onTick: () => {
      // TODO(burdon): Check greater than 30s (use cron-parser).
      const now = Date.now();
      const delta = last ? now - last : 0;
      last = now;

      run++;
      log.info('tick', { space: triggerContext.space.key.truncate(), count: run, delta });
      task.schedule();
    },
  });

  job.start();
  ctx.onDispose(() => job.stop());
};
