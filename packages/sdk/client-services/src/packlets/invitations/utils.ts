//
// Copyright 2024 DXOS.org
//

import { type Mutex, type MutexGuard } from '@dxos/async';
import { cancelWithContext, type Context, ContextDisposedError } from '@dxos/context';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';

export const stateToString = (state: Invitation.State): string => {
  return Object.entries(Invitation.State).find(([key, val]) => val === state)?.[0] ?? 'unknown';
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
