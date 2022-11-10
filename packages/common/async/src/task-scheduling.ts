import { Context } from '@dxos/context';

export const runInContext = (ctx: Context, fn: () => void) => {
  try {
    fn();
  } catch(err: any) {
    ctx.raise(err);
  }
}

export const runInContextAsync = async (ctx: Context, fn: () => Promise<void>) => {
  try {
    await fn();
  } catch(err: any) {
    ctx.raise(err);
  }
}

export const scheduleTask = (ctx: Context, fn: () => Promise<void>, afterMs?: number) => {
  const timeout = setTimeout(async () => {
    await runInContextAsync(ctx, fn);
  }, afterMs);

  ctx.onDispose(() => {
    clearTimeout(timeout);
  });
}
