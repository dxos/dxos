//
// Copyright 2022 DXOS.org
//

import base from 'base-x';

import { schema } from '@dxos/protocols';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';

// Encode with URL-safe alpha-numeric characters.
const base62 = base('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');

const codec = schema.getCodecForType('dxos.client.services.Invitation');

/**
 * Encodes and decodes an invitation proto into/from alphanumeric chars.
 */
export class InvitationEncoder {
  static decode(text: string): Invitation {
    const decodedInvitation = codec.decode(base62.decode(text));
    if (decodedInvitation.type === Invitation.Type.MULTIUSE) {
      decodedInvitation.type = Invitation.Type.INTERACTIVE;
      decodedInvitation.multiUse = true;
    }
    return decodedInvitation;
  }

  static encode(invitation: Invitation): string {
    return base62.encode(
      codec.encode({
        invitationId: invitation.invitationId,
        type: invitation.type,
        kind: invitation.kind,
        authMethod: invitation.authMethod,
        swarmKey: invitation.swarmKey,
        state: invitation.state,
        timeout: invitation.timeout,
        guestKeypair: invitation.guestKeypair,
        // TODO(wittjosiah): Make these optional to encode for greater privacy.
        ...(invitation.spaceKey ? { spaceKey: invitation.spaceKey } : {}),
        ...(invitation.target ? { target: invitation.target } : {}),
      }),
    );
  }
}
