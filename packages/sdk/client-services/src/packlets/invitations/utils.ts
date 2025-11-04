//
// Copyright 2024 DXOS.org
//

import { type Mutex, type MutexGuard } from '@dxos/async';
import { type Context, ContextDisposedError, cancelWithContext } from '@dxos/context';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';

export const stateToString = (state: Invitation.State): string =>
  Object.entries(Invitation.State).find(([key, val]) => val === state)?.[0] ?? 'unknown';

export const computeExpirationTime = (invitation: Partial<Invitation>): Date | undefined => {
  if (!invitation.lifetime) {
    return;
  }
  return new Date((invitation.created?.getTime() ?? Date.now()) + invitation.lifetime * 1000);
};

export const tryAcquireBeforeContextDisposed = async (ctx: Context, mutex: Mutex): Promise<MutexGuard> => {
  let guard: MutexGuard | undefined;
  return cancelWithContext(
    ctx,
    (async () => {
      guard = await mutex.acquire();
      if (ctx.disposed) {
        guard.release();
        guard = undefined;
        throw new ContextDisposedError();
      }
      return guard;
    })(),
  );
};
