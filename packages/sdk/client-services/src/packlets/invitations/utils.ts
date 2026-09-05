//
// Copyright 2024 DXOS.org
//

import { type Mutex, type MutexGuard } from '@dxos/async';
import { type Context, ContextDisposedError, cancelWithContext } from '@dxos/context';
import { bufWkt } from '@dxos/protocols/buf';
import { Invitation, Invitation_State } from '@dxos/protocols/buf/dxos/client/invitation_pb';
import { SpaceMember_Role } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { SpaceMember } from '@dxos/protocols/proto/dxos/halo/credentials';

export const stateToString = (state: Invitation_State): string => {
  return Object.entries(Invitation_State).find(([key, val]) => val === state)?.[0] ?? 'unknown';
};

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
 * Reads the invitation's buf role as the role the credentials API takes.
 *
 * `dxos.halo.credentials.SpaceMember.Role` is generated twice while the two codecs coexist, so the
 * two enums are nominally distinct despite sharing every member; mapping them explicitly keeps the
 * conversion total and survives either side gaining a member.
 */
export const toSpaceMemberRole = (role: SpaceMember_Role | undefined): SpaceMember.Role => {
  switch (role) {
    case SpaceMember_Role.INVALID:
      return SpaceMember.Role.INVALID;
    case SpaceMember_Role.ADMIN:
      return SpaceMember.Role.ADMIN;
    case SpaceMember_Role.EDITOR:
      return SpaceMember.Role.EDITOR;
    case SpaceMember_Role.READER:
      return SpaceMember.Role.READER;
    case SpaceMember_Role.OWNER:
      return SpaceMember.Role.OWNER;
    case SpaceMember_Role.REMOVED:
      return SpaceMember.Role.REMOVED;
    // An invitation without a role admits an administrator, as it did before the role was carried.
    case undefined:
      return SpaceMember.Role.ADMIN;
  }
};
