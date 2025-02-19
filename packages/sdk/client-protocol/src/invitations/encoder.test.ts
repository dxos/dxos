//
// Copyright 2022 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { PublicKey, SpaceId } from '@dxos/keys';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';

import { InvitationEncoder } from './encoder';

const CREATED = new Date(1739956589 * 1000);

const baseInvitation: Invitation = {
  invitationId: PublicKey.random().toHex(),
  type: Invitation.Type.INTERACTIVE,
  kind: Invitation.Kind.SPACE,
  authMethod: Invitation.AuthMethod.NONE,
  state: Invitation.State.INIT,
  swarmKey: PublicKey.random(),
  spaceKey: PublicKey.random(),
  spaceId: SpaceId.random(),
  created: CREATED,
  lifetime: 86400,
};

describe('Invitation utils', () => {
  test('encodes and decodes an invitation', () => {
    const encoded = InvitationEncoder.encode(baseInvitation);
    const decoded = InvitationEncoder.decode(encoded);
    expect(decoded).to.deep.eq(baseInvitation);
  });

  test('secrets are never encoded into invitation code', () => {
    const encoded = InvitationEncoder.encode({
      ...baseInvitation,
      authCode: 'example',
      identityKey: PublicKey.random(),
    });
    const decoded = InvitationEncoder.decode(encoded);
    expect(decoded.authCode).to.not.exist;
    expect(decoded.identityKey).to.not.exist;
    expect(decoded).to.deep.eq(baseInvitation);
  });

  test('guestKeypair for known public key auth method is encoded', () => {
    const invitation: Invitation = {
      ...baseInvitation,
      guestKeypair: {
        publicKey: PublicKey.random(),
        privateKey: PublicKey.random().asBuffer(),
      },
    };

    const encoded = InvitationEncoder.encode(invitation);
    const decoded = InvitationEncoder.decode(encoded);
    expect(decoded.authCode).to.not.exist;
    expect(decoded.identityKey).to.not.exist;
    expect(decoded).to.deep.eq(invitation);
  });
});
