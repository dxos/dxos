//
// Copyright 2024 DXOS.org
//

import { type Mutex, type MutexGuard } from '@dxos/async';
import { type Context, ContextDisposedError, cancelWithContext } from '@dxos/context';
import { timestampMs } from '@dxos/protocols/buf';
import {
  type Invitation,
  type Invitation_State,
  Invitation_StateSchema,
} from '@dxos/protocols/buf/dxos/client/invitation_pb';

export const stateToString = (state: Invitation_State): string => {
  const enumValues = Invitation_StateSchema.values;
  const match = enumValues.find((v) => v.number === state);
  return match?.name ?? 'unknown';
};

export const computeExpirationTime = (invitation: Partial<Invitation>): Date | undefined => {
  if (!invitation.lifetime) {
    return;
  }
  const createdMs = invitation.created ? Number(timestampMs(invitation.created)) : Date.now();
  return new Date(createdMs + invitation.lifetime * 1000);
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
