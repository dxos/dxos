//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { PublicKey } from '@dxos/keys';

import { schema } from '../proto/index.ts';
import { buf } from './index.ts';
import { GossipMessageSchema } from './proto/gen/dxos/mesh/teleport/gossip_pb.ts';
import { decodeCompat, encodeCompat } from './shape-compat.ts';

// Gossip announces travel between peers over teleport, so a peer on one release decodes bytes a
// peer on another wrote. `SpacesService.postMessage`/`subscribeMessages` therefore stay on
// `protoMessage`: the two codecs disagree on how an `Any` payload is framed, as pinned below.

const legacyCodec = schema.getCodecForType('dxos.mesh.teleport.gossip.GossipMessage');

const message = {
  peerId: PublicKey.random(),
  channelId: 'hello',
  messageId: PublicKey.random(),
  timestamp: new Date(1_700_000_000_000),
  payload: { '@type': 'google.protobuf.Struct', 'data': 'Hello, world!' },
};

describe('gossip buf compat', () => {
  test('an Any payload survives a buf round-trip', ({ expect }) => {
    const bufMessage = buf.fromBinary(GossipMessageSchema, encodeCompat(GossipMessageSchema, message));
    const decoded = decodeCompat<typeof message>(GossipMessageSchema, buf.toBinary(GossipMessageSchema, bufMessage));
    expect(decoded.payload).to.deep.contain({ data: 'Hello, world!' });
  });

  test('but the two codecs frame that payload differently on the wire', ({ expect }) => {
    // protobuf.js writes the `@type` discriminator as a literal key inside the `Struct`, while buf
    // carries it only as the `Any` typeUrl. Byte equality here would mean gossip can move to buf.
    expect(Buffer.from(encodeCompat(GossipMessageSchema, message)).toString('hex')).not.toEqual(
      Buffer.from(legacyCodec.encode(message)).toString('hex'),
    );
  });
});
