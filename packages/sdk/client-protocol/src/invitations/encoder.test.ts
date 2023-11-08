//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { PublicKey } from '@dxos/keys';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { describe, test } from '@dxos/test';

import { InvitationEncoder } from './encoder';

describe('Invitation utils', () => {
  test('encodes and decodes an invitation', () => {
    const invitation: Invitation = {
      invitationId: PublicKey.random().toHex(),
      type: Invitation.Type.INTERACTIVE,
      kind: Invitation.Kind.SPACE,
      authMethod: Invitation.AuthMethod.NONE,
      state: Invitation.State.INIT,
      swarmKey: PublicKey.random(),
      spaceKey: PublicKey.random(),
    };

    const encoded = InvitationEncoder.encode(invitation);
    const decoded = InvitationEncoder.decode(encoded);
    expect(decoded).to.deep.eq(invitation);
  });

  test('secrets are never encoded into invitation code', () => {
    const invitation: Invitation = {
      invitationId: PublicKey.random().toHex(),
      type: Invitation.Type.INTERACTIVE,
      kind: Invitation.Kind.SPACE,
      authMethod: Invitation.AuthMethod.NONE,
      state: Invitation.State.INIT,
      swarmKey: PublicKey.random(),
      spaceKey: PublicKey.random(),
    };

    const encoded = InvitationEncoder.encode({
      ...invitation,
      authCode: 'example',
      identityKey: PublicKey.random(),
    });
    const decoded = InvitationEncoder.decode(encoded);
    expect(decoded.authCode).to.not.exist;
    expect(decoded.identityKey).to.not.exist;
    expect(decoded).to.deep.eq(invitation);
  });
});
