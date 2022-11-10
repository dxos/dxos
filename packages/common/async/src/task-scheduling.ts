import { Context } from '@dxos/context';
import { MaybePromise } from '@dxos/util';

export const runInContext = (ctx: Context, fn: () => void) => {
  try {
    fn();
  } catch(err: any) {
    ctx.raise(err);
  }
}

export const runInContextAsync = async (ctx: Context, fn: () => MaybePromise<void>) => {
  try {
    await fn();
  } catch(err: any) {
    ctx.raise(err);
  }
}

export const scheduleTask = (ctx: Context, fn: () => MaybePromise<void>, afterMs?: number) => {
  const timeout = setTimeout(async () => {
    await runInContextAsync(ctx, fn);
  }, afterMs);

  ctx.onDispose(() => {
    clearTimeout(timeout);
  });
}
