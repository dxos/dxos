//
// Copyright 2026 DXOS.org
//

import { scheduleTask } from '@dxos/async';
import { type Context } from '@dxos/context';

export type BackoffOptions = {
  initialDelay: number;
  maxDelay: number;
};

/** Runs `poll` now and again after a delay doubling up to `maxDelay`, until it returns `false` or `ctx` is disposed. */
export const pollWithBackoff = (
  ctx: Context,
  poll: () => Promise<boolean | void>,
  { initialDelay, maxDelay }: BackoffOptions,
): void => {
  let delay = initialDelay;
  const run = async () => {
    if ((await poll()) === false || ctx.disposed) {
      return;
    }
    scheduleTask(ctx, run, delay);
    delay = Math.min(delay * 2, maxDelay);
  };
  scheduleTask(ctx, run);
};
