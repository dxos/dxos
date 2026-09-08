//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { PublicKey } from '@dxos/keys';

import { schema } from '../proto/index.ts';
import { GossipMessageSchema } from './proto/gen/dxos/mesh/teleport/gossip_pb.ts';
import { decodeCompat, encodeCompat } from './shape-compat.ts';

// Gossip announces travel between peers over teleport, so a peer on one release decodes bytes a peer
// on another wrote. What that requires is decode agreement, not byte identity: the two codecs frame a
// `Struct` payload's '@type' differently (protobuf.js writes it as a key inside the `Struct`, buf
// carries it as the `Any` typeUrl), and the cases below establish that either side still reads the
// other's bytes to the same payload. `GossipService` itself already runs on the buf descriptor.

const legacyCodec = schema.getCodecForType('dxos.mesh.teleport.gossip.GossipMessage');

const message = {
  peerId: PublicKey.random(),
  channelId: 'hello',
  messageId: PublicKey.random(),
  timestamp: new Date(1_700_000_000_000),
  payload: { '@type': 'google.protobuf.Struct', 'data': 'Hello, world!' },
};

const payload = { '@type': 'google.protobuf.Struct', 'data': 'Hello, world!' };

describe('gossip buf compat', () => {
  test('a legacy peer reads buf-written bytes', ({ expect }) => {
    const decoded = legacyCodec.decode(encodeCompat(GossipMessageSchema, message));
    expect(decoded.channelId).to.equal('hello');
    // The discriminator matters as much as the data: without it a peer cannot identify the payload.
    expect(decoded.payload).to.deep.equal(payload);
  });

  test('a buf peer reads legacy-written bytes', ({ expect }) => {
    const decoded = decodeCompat<typeof message>(GossipMessageSchema, legacyCodec.encode(message));
    expect(decoded.channelId).to.equal('hello');
    expect(decoded.payload).to.deep.equal(payload);
  });

  test('the framing differs, which is why decode agreement is the thing asserted', ({ expect }) => {
    // Byte equality is not required of gossip -- nothing signs or hashes an announce, and the dedup
    // set keys on `messageId` rather than the encoded bytes -- so this only pins the known asymmetry.
    expect(Buffer.from(encodeCompat(GossipMessageSchema, message)).toString('hex')).not.toEqual(
      Buffer.from(legacyCodec.encode(message)).toString('hex'),
    );
  });
});
