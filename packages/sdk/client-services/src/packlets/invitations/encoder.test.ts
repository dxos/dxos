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
      swarmKey: PublicKey.random()
    };

    const encoded = InvitationEncoder.encode(invitation);
    const decoded = InvitationEncoder.decode(encoded);
    expect(decoded.swarmKey).to.deep.eq(invitation.swarmKey);
  });
});
