//
// Copyright 2022 DXOS.org
//

import base from 'base-x';

import { buf } from '@dxos/protocols/buf';
import { type Invitation, Invitation_Type, InvitationSchema } from '@dxos/protocols/buf/dxos/client/invitation_pb';

// Encode with URL-safe alpha-numeric characters.
const base62 = base('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');

/**
 * Encodes and decodes an invitation proto into/from alphanumeric chars.
 */
export class InvitationEncoder {
  static decode(text: string): Invitation {
    const decodedInvitation = buf.fromBinary(InvitationSchema, base62.decode(text));
    if (decodedInvitation.type === Invitation_Type.MULTIUSE) {
      decodedInvitation.type = Invitation_Type.INTERACTIVE;
      decodedInvitation.multiUse = true;
    }
    return decodedInvitation;
  }

  static encode(invitation: Invitation): string {
    return base62.encode(
      buf.toBinary(
        InvitationSchema,
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
        }),
      ),
    );
  }
}
