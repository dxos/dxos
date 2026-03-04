//
// Copyright 2022 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { PublicKey, SpaceId } from '@dxos/keys';
import { create, encodePublicKey, timestampFromDate } from '@dxos/protocols/buf';
import {
  AdmissionKeypairSchema,
  InvitationSchema,
  Invitation_AuthMethod,
  Invitation_Kind,
  Invitation_State,
  Invitation_Type,
} from '@dxos/protocols/buf/dxos/client/invitation_pb';

import { InvitationEncoder } from './encoder';

// Proto codec round-trips Timestamp as Date, so use Date directly.
const CREATED = new Date(1739956589 * 1000);

const baseInvitation = create(InvitationSchema, {
  invitationId: PublicKey.random().toHex(),
  type: Invitation_Type.INTERACTIVE,
  kind: Invitation_Kind.SPACE,
  authMethod: Invitation_AuthMethod.NONE,
  state: Invitation_State.INIT,
  swarmKey: encodePublicKey(PublicKey.random()),
  spaceKey: encodePublicKey(PublicKey.random()),
  spaceId: SpaceId.random(),
  created: timestampFromDate(CREATED),
  lifetime: 86400,
});

describe('Invitation utils', () => {
  test('encodes and decodes an invitation', () => {
    const encoded = InvitationEncoder.encode(baseInvitation);
    const decoded = InvitationEncoder.decode(encoded);
    expect(decoded).to.deep.eq(baseInvitation);
  });

  test('secrets are never encoded into invitation code', () => {
    const withSecrets = {
      ...baseInvitation,
      authCode: 'example',
      identityKey: encodePublicKey(PublicKey.random()),
    };
    const encoded = InvitationEncoder.encode(withSecrets);
    const decoded = InvitationEncoder.decode(encoded);
    expect(decoded.authCode).to.not.exist;
    expect(decoded.identityKey).to.not.exist;
    expect(decoded).to.deep.eq(baseInvitation);
  });

  test('guestKeypair for known public key auth method is encoded', () => {
    const keypair = create(AdmissionKeypairSchema, {
      publicKey: encodePublicKey(PublicKey.random()),
      privateKey: { data: PublicKey.random().asUint8Array() },
    });
    const invitation = create(InvitationSchema, {
      ...baseInvitation,
      guestKeypair: keypair,
    });

    const encoded = InvitationEncoder.encode(invitation);
    const decoded = InvitationEncoder.decode(encoded);
    expect(decoded.authCode).to.not.exist;
    expect(decoded.identityKey).to.not.exist;
    expect(decoded).to.deep.eq(invitation);
  });
});
