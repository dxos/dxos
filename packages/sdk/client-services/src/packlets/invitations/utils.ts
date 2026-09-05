//
// Copyright 2024 DXOS.org
//

import { type Mutex, type MutexGuard } from '@dxos/async';
import { type Context, ContextDisposedError, cancelWithContext } from '@dxos/context';
import { buf, bufWkt } from '@dxos/protocols/buf';
import { Invitation, InvitationSchema, Invitation_AuthMethod, Invitation_State } from '@dxos/protocols/buf/dxos/client/invitation_pb';
import { decodeCompat, encodeCompat } from '@dxos/protocols/buf-shape-compat';
import { SpaceMember_Role } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { Invitation as LegacyInvitation } from '@dxos/protocols/proto/dxos/client/services';
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

/**
 * Reads the peer-protocol auth method as the invitation's buf auth method.
 *
 * `dxos.halo.invitations` still carries `Invitation.AuthMethod` through the protobuf.js codec, so
 * the enum arrives nominally distinct from the buf one despite being the same proto enum.
 */
export const toBufAuthMethod = (authMethod: LegacyInvitation.AuthMethod | undefined): Invitation_AuthMethod => {
  switch (authMethod) {
    case LegacyInvitation.AuthMethod.NONE:
      return Invitation_AuthMethod.NONE;
    case LegacyInvitation.AuthMethod.SHARED_SECRET:
      return Invitation_AuthMethod.SHARED_SECRET;
    case LegacyInvitation.AuthMethod.KNOWN_PUBLIC_KEY:
      return Invitation_AuthMethod.KNOWN_PUBLIC_KEY;
    case undefined:
      return Invitation_AuthMethod.NONE;
  }
};

/** Writes the invitation's buf auth method as the peer-protocol one. Inverse of {@link toBufAuthMethod}. */
export const fromBufAuthMethod = (authMethod: Invitation_AuthMethod | undefined): LegacyInvitation.AuthMethod => {
  switch (authMethod) {
    case Invitation_AuthMethod.NONE:
      return LegacyInvitation.AuthMethod.NONE;
    case Invitation_AuthMethod.SHARED_SECRET:
      return LegacyInvitation.AuthMethod.SHARED_SECRET;
    case Invitation_AuthMethod.KNOWN_PUBLIC_KEY:
      return LegacyInvitation.AuthMethod.KNOWN_PUBLIC_KEY;
    case undefined:
      return LegacyInvitation.AuthMethod.NONE;
  }
};

/**
 * Reads a stored invitation as the buf message the services now speak.
 *
 * `EchoMetadata.invitations` is still written by the protobuf.js codec, so the two shapes meet in
 * the manager; both codecs agree byte for byte, which makes the encoding the conversion. Goes when
 * the metadata group moves to buf.
 */
export const toBufInvitation = (invitation: LegacyInvitation): Invitation =>
  buf.fromBinary(InvitationSchema, encodeCompat(InvitationSchema, invitation));

/** Writes a buf invitation in the shape the metadata store persists. Inverse of {@link toBufInvitation}. */
export const fromBufInvitation = (invitation: Invitation): LegacyInvitation =>
  decodeCompat(InvitationSchema, buf.toBinary(InvitationSchema, invitation));

/**
 * Drops the message brand so a partial invitation can seed `buf.create`.
 *
 * `Partial<Invitation>` carries `$typeName` as optional, which `MessageInit` refuses; the fields
 * themselves are what a caller means by a partial invitation.
 */
export const invitationInit = ({
  $typeName,
  $unknown,
  ...fields
}: Partial<Invitation>): Omit<Partial<Invitation>, '$typeName' | '$unknown'> => fields;
