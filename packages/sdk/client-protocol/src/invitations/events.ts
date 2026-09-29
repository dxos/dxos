//
// Copyright 2026 DXOS.org
//

import { type Invitation, Invitation_AuthMethod, Invitation_Kind } from '@dxos/protocols/buf/dxos/client/invitation_pb';

/**
 * The invitation trace events: `create` from the client that shares an invitation, and `admit` and `accept` from
 * the services of the host and guest peers, which see every success exactly once however the invitation started.
 */
export const INVITATION_EVENTS = {
  create: 'client.invitation.create',
  admit: 'client.invitation.admit',
  accept: 'client.invitation.accept',
} as const;

/** What an invitation trace event reports about the invitation: never its keys, secrets or guest identity. */
export const invitationEventAttributes = (
  invitation: Pick<Invitation, 'kind' | 'spaceId' | 'authMethod' | 'multiUse'>,
): Record<string, string | boolean | undefined> => ({
  kind: invitation.kind === Invitation_Kind.DEVICE ? 'device' : 'space',
  spaceId: invitation.spaceId,
  authMethod: Invitation_AuthMethod[invitation.authMethod]?.toLowerCase(),
  multiUse: invitation.multiUse ?? false,
});
