//
// Copyright 2024 DXOS.org
//

import { type Mutex, type MutexGuard } from '@dxos/async';
import { type Context, ContextDisposedError, cancelWithContext } from '@dxos/context';
import { bufWkt } from '@dxos/protocols/buf';
import { type Invitation, Invitation_State } from '@dxos/protocols/buf/dxos/client/invitation_pb';
import { SpaceMember_Role } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

/** Names an invitation state for logging; falls back to `unknown` for a value outside the enum. */
export const stateToString = (state: Invitation_State): string => {
  return Object.entries(Invitation_State).find(([key, val]) => val === state)?.[0] ?? 'unknown';
};

/**
 * When the invitation expires, or `undefined` where it carries no lifetime.
 *
 * An invitation with no `created` timestamp is treated as created now, which is what the host does
 * when it mints one.
 */
export const computeExpirationTime = (invitation: Partial<Invitation>): Date | undefined => {
  if (!invitation.lifetime) {
    return;
  }
  const created = invitation.created ? Number(bufWkt.timestampMs(invitation.created)) : Date.now();
  return new Date(created + invitation.lifetime * 1000);
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

/**
 * The role an invitation admits with.
 *
 * An invitation without a role admits an administrator, as it did before the role was carried.
 */
export const toSpaceMemberRole = (role: SpaceMember_Role | undefined): SpaceMember_Role =>
  role ?? SpaceMember_Role.ADMIN;
