//
// Copyright 2022 DXOS.org
//

import base from 'base-x';

import { schema } from '@dxos/protocols/proto';
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
    // Proto3 does not encode default enum values on the wire, so when an invitation was
    // serialized with `kind: DEVICE` (= 0) the field comes back as `undefined`. Restore the
    // default explicitly so downstream consumers (`ServiceContext.getInvitationHandler`) can
    // still dispatch by kind.
    if (decodedInvitation.kind === undefined) {
      decodedInvitation.kind = Invitation.Kind.DEVICE;
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
        spaceId: invitation.spaceId,
        lifetime: invitation.lifetime,
        created: invitation.created,
        // TODO(wittjosiah): Make these optional to encode for greater privacy.
        ...(invitation.spaceKey ? { spaceKey: invitation.spaceKey } : {}),
        ...(invitation.target ? { target: invitation.target } : {}),
      }),
    );
  }
}
