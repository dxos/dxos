//
// Copyright 2022 DXOS.org
//

import base from 'base-x';

import { buf } from '@dxos/protocols/buf';
import { type Invitation, Invitation_Type, InvitationSchema } from '@dxos/protocols/buf/dxos/client/invitation_pb';

// Encode with URL-safe alpha-numeric characters.
const base62 = base('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');

/**
 * Encodes and decodes an invitation proto into/from alphanumeric chars, or into/from JSON for a container that is
 * already encoded (a share link's payload).
 */
export class InvitationEncoder {
  static decode(text: string): Invitation {
    return normalize(buf.fromBinary(InvitationSchema, base62.decode(text)));
  }

  static encode(invitation: Invitation): string {
    return base62.encode(buf.toBinary(InvitationSchema, portable(invitation)));
  }

  /** The fields {@link encode} carries, as protobuf JSON. */
  static toJson(invitation: Invitation): buf.JsonValue {
    return buf.toJson(InvitationSchema, portable(invitation));
  }

  static fromJson(json: buf.JsonValue): Invitation {
    return normalize(buf.fromJson(InvitationSchema, json));
  }
}

/** Only what a guest needs to accept the invitation: never its auth code or the host's identity. */
const portable = (invitation: Invitation): Invitation =>
  buf.create(InvitationSchema, {
    invitationId: invitation.invitationId,
    type: invitation.type,
    kind: invitation.kind,
    authMethod: invitation.authMethod,
    swarmKey: invitation.swarmKey,
    state: invitation.state,
    timeout: invitation.timeout,
    guestKeypair: invitation.guestKeypair,
    spaceId: invitation.spaceId,
    lifetime: invitation.lifetime,
    created: invitation.created,
    // TODO(wittjosiah): Make these optional to encode for greater privacy.
    ...(invitation.spaceKey ? { spaceKey: invitation.spaceKey } : {}),
    ...(invitation.target ? { target: invitation.target } : {}),
  });

const normalize = (invitation: Invitation): Invitation => {
  if (invitation.type === Invitation_Type.MULTIUSE) {
    invitation.type = Invitation_Type.INTERACTIVE;
    invitation.multiUse = true;
  }
  return invitation;
};
