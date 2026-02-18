//
// Copyright 2022 DXOS.org
//

import base from 'base-x';

import { type Invitation, Invitation_Type } from '@dxos/protocols/buf/dxos/client/invitation_pb';
import { schema } from '@dxos/protocols/proto';

// Encode with URL-safe alpha-numeric characters.
const base62 = base('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');

// Proto codec for binary serialization (protobuf.js).
const codec = schema.getCodecForType('dxos.client.services.Invitation');

/**
 * Encodes and decodes an invitation proto into/from alphanumeric chars.
 */
export class InvitationEncoder {
  static decode(text: string): Invitation {
    // Proto codec returns proto-shaped data; enum values are numerically compatible.
    const decodedInvitation = codec.decode(base62.decode(text));
    if ((decodedInvitation.type as number) === Invitation_Type.MULTIUSE) {
      decodedInvitation.type = Invitation_Type.INTERACTIVE as never;
      decodedInvitation.multiUse = true;
    }
    return decodedInvitation as never;
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
        spaceId: invitation.spaceId,
        lifetime: invitation.lifetime,
        created: invitation.created,
        // TODO(wittjosiah): Make these optional to encode for greater privacy.
        ...(invitation.spaceKey ? { spaceKey: invitation.spaceKey } : {}),
        ...(invitation.target ? { target: invitation.target } : {}),
      } as never),
    );
  }
}
