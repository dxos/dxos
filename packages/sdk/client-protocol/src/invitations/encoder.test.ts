//
// Copyright 2022 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { PublicKey, SpaceId } from '@dxos/keys';
import { buf, bufWkt, fromPublicKey, toPublicKey } from '@dxos/protocols/buf';
import {
  type Invitation,
  Invitation_AuthMethod,
  Invitation_Kind,
  Invitation_State,
  Invitation_Type,
  InvitationSchema,
} from '@dxos/protocols/buf/dxos/client/invitation_pb';
import { PrivateKeySchema } from '@dxos/protocols/buf/dxos/keys_pb';

import { InvitationEncoder } from './encoder';

const CREATED = new Date(1739956589 * 1000);

describe('Invitation utils', () => {
  test('encodes and decodes an invitation', () => {
    const invitation = makeInvitation();
    const encoded = InvitationEncoder.encode(invitation);
    const decoded = InvitationEncoder.decode(encoded);
    expect(decoded).to.deep.eq(invitation);
  });

  test('secrets are never encoded into invitation code', () => {
    const invitation = makeInvitation();
    const encoded = InvitationEncoder.encode(
      buf.create(InvitationSchema, {
        ...invitation,
        authCode: 'example',
        identityKey: fromPublicKey(PublicKey.random()),
      }),
    );
    const decoded = InvitationEncoder.decode(encoded);
    expect(decoded.authCode).to.not.exist;
    expect(decoded.identityKey).to.not.exist;
    expect(decoded).to.deep.eq(invitation);
  });

  test('guestKeypair for known public key auth method is encoded', () => {
    const invitation = makeInvitation({
      guestKeypair: {
        publicKey: fromPublicKey(PublicKey.random()),
        privateKey: buf.create(PrivateKeySchema, { data: PublicKey.random().asUint8Array() }),
      },
    });

    const encoded = InvitationEncoder.encode(invitation);
    const decoded = InvitationEncoder.decode(encoded);
    expect(decoded.authCode).to.not.exist;
    expect(decoded.identityKey).to.not.exist;
    expect(decoded).to.deep.eq(invitation);
  });

  test('encodes and decodes a device invitation', () => {
    const invitation = makeInvitation({ kind: Invitation_Kind.DEVICE, spaceKey: undefined, spaceId: undefined });
    const encoded = InvitationEncoder.encode(invitation);
    const decoded = InvitationEncoder.decode(encoded);
    expect(decoded).to.deep.eq(invitation);
  });

  // An invitation code is shared between devices and users, so it outlives any one build: a code
  // minted by the protobuf.js encoder must still decode after the switch to buf.
  test('decodes a code minted by the protobuf.js encoder', () => {
    const GOLDEN =
      '1hTIvhk5lLtb36OgP0L6tA2fBWAQuWcqob4e29WNauEhoqjBwGmop6kJx1Ulr2cguj9xJhT94tcJNlB3EUpwVHRldKxCuiRXF7fmM9fAsxef24NpUnDbvBVsb6j1uazOEck8WIyp2NNy48kX9cHmeujSZfUkSOCwrhlpXJAszNkR1tty3t6sIxuZDPSG5aaIQvfSIpmmdJkBskrhDOPAdM9nnBjoYiyt33DgagRJUzCVZIfi9eMa6da0hRKkGrfeghUGF8MvdfG8WzgSKk0w2u8mXM1o4';

    const decoded = InvitationEncoder.decode(GOLDEN);
    expect(decoded.invitationId).to.eq('0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20');
    expect(decoded.type).to.eq(Invitation_Type.INTERACTIVE);
    expect(decoded.kind).to.eq(Invitation_Kind.SPACE);
    expect(decoded.authMethod).to.eq(Invitation_AuthMethod.SHARED_SECRET);
    expect(toPublicKey(decoded.swarmKey)?.toHex()).to.eq(
      '0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20',
    );
    expect(toPublicKey(decoded.spaceKey)?.toHex()).to.eq(
      '2021222324252627282920212223242526272829202122232425262728292021',
    );
    expect(decoded.spaceId).to.eq(SpaceId.encode(new Uint8Array(20).fill(7)));
    expect(decoded.created && Number(bufWkt.timestampMs(decoded.created))).to.eq(CREATED.getTime());
    expect(decoded.lifetime).to.eq(86400);
    expect(decoded.target).to.eq('example-target');

    // Not byte-identical to GOLDEN: protobuf.js wrote explicit zeros for `type`, `state` and
    // `created.nanos`, which buf elides as proto3 defaults. None of those fields is `optional`, so
    // absent and zero mean the same thing to either codec and a re-minted code stays interchangeable.
    expect(InvitationEncoder.decode(InvitationEncoder.encode(decoded))).to.deep.eq(decoded);
  });
});

/** A complete space invitation the encoder round-trips, with `fields` overriding the defaults. */
const makeInvitation = (fields: buf.MessageInitShape<typeof InvitationSchema> = {}): Invitation =>
  buf.create(InvitationSchema, {
    invitationId: PublicKey.random().toHex(),
    type: Invitation_Type.INTERACTIVE,
    kind: Invitation_Kind.SPACE,
    authMethod: Invitation_AuthMethod.NONE,
    state: Invitation_State.INIT,
    swarmKey: fromPublicKey(PublicKey.random()),
    spaceKey: fromPublicKey(PublicKey.random()),
    spaceId: SpaceId.random(),
    created: bufWkt.timestampFromDate(CREATED),
    lifetime: 86400,
    ...fields,
  });
