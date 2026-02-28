//
// Copyright 2022 DXOS.org
//

import base from 'base-x';

import { create, toBinary, fromBinary } from '@dxos/protocols/buf';
import { type Invitation, InvitationSchema, Invitation_Type } from '@dxos/protocols/buf/dxos/client/invitation_pb';

const base62 = base('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');

/**
 * Encodes and decodes an invitation proto into/from alphanumeric chars.
 */
export class InvitationEncoder {
  static decode(text: string): Invitation {
    const decodedInvitation = fromBinary(InvitationSchema, base62.decode(text));
    if (decodedInvitation.type === Invitation_Type.MULTIUSE) {
      decodedInvitation.type = Invitation_Type.INTERACTIVE;
      decodedInvitation.multiUse = true;
    }
    return decodedInvitation;
  }

  static encode(invitation: Invitation): string {
    const partial = create(InvitationSchema, {
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
    return base62.encode(toBinary(InvitationSchema, partial));
  }
}
