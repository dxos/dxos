//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { PublicKey } from '@dxos/keys';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { AuthMethod } from '@dxos/protocols/proto/dxos/halo/invitations';
import { describe, test } from '@dxos/test';

import { InvitationEncoder } from './encoder';

describe('Invitation utils', () => {
  test('encodes and decodes an invitation', () => {
    const invitation: Invitation = {
      invitationId: PublicKey.random().toHex(),
      type: Invitation.Type.INTERACTIVE,
      authMethod: AuthMethod.NONE,
      state: Invitation.State.INIT,
      swarmKey: PublicKey.random()
    };

    const encoded = InvitationEncoder.encode(invitation);
    const decoded = InvitationEncoder.decode(encoded);
    expect(decoded).to.deep.eq(invitation);
  });

  test('authentication code is never encoded into invitation code', () => {
    const invitation: Invitation = {
      invitationId: PublicKey.random().toHex(),
      type: Invitation.Type.INTERACTIVE,
      authMethod: AuthMethod.NONE,
      state: Invitation.State.INIT,
      swarmKey: PublicKey.random()
    };

    const encoded = InvitationEncoder.encode({ ...invitation, authenticationCode: 'example' });
    const decoded = InvitationEncoder.decode(encoded);
    expect(decoded.authenticationCode).to.not.exist;
    expect(decoded).to.deep.eq(invitation);
  });
});
