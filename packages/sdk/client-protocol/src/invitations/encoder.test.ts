//
// Copyright 2022 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { PublicKey, SpaceId } from '@dxos/keys';
import {
  type Invitation,
  Invitation_AuthMethod,
  Invitation_Kind,
  Invitation_State,
  Invitation_Type,
} from '@dxos/protocols/buf/dxos/client/invitation_pb';

import { InvitationEncoder } from './encoder';

// Proto codec round-trips Timestamp as Date, so use Date directly.
const CREATED = new Date(1739956589 * 1000);

const baseInvitation = {
  invitationId: PublicKey.random().toHex(),
  type: Invitation_Type.INTERACTIVE,
  kind: Invitation_Kind.SPACE,
  authMethod: Invitation_AuthMethod.NONE,
  state: Invitation_State.INIT,
  swarmKey: PublicKey.random(),
  spaceKey: PublicKey.random(),
  spaceId: SpaceId.random(),
  created: CREATED,
  lifetime: 86400,
} as never as Invitation;

describe('Invitation utils', () => {
  test('encodes and decodes an invitation', () => {
    const encoded = InvitationEncoder.encode(baseInvitation);
    const decoded = InvitationEncoder.decode(encoded);
    expect(decoded).to.deep.eq(baseInvitation);
  });

  test('secrets are never encoded into invitation code', () => {
    const withSecrets: Record<string, unknown> = {
      ...(baseInvitation as Record<string, unknown>),
      authCode: 'example',
      identityKey: PublicKey.random(),
    };
    const encoded = InvitationEncoder.encode(withSecrets as never);
    const decoded = InvitationEncoder.decode(encoded);
    expect(decoded.authCode).to.not.exist;
    expect(decoded.identityKey).to.not.exist;
    expect(decoded).to.deep.eq(baseInvitation);
  });

  test('guestKeypair for known public key auth method is encoded', () => {
    const withKeypair: Record<string, unknown> = {
      ...(baseInvitation as Record<string, unknown>),
      guestKeypair: {
        publicKey: PublicKey.random(),
        privateKey: PublicKey.random().asBuffer(),
      },
    };
    const invitation = withKeypair as never as Invitation;

    const encoded = InvitationEncoder.encode(invitation);
    const decoded = InvitationEncoder.decode(encoded);
    expect(decoded.authCode).to.not.exist;
    expect(decoded.identityKey).to.not.exist;
    expect(decoded).to.deep.eq(invitation);
  });
});
