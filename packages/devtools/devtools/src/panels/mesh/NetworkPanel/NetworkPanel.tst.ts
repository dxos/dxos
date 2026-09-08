//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from 'tstyche';

import { type PeerState } from '@dxos/protocols/buf/dxos/mesh/presence_pb';
import { type PeerState as LegacyPeerState } from '@dxos/protocols/proto/dxos/mesh/presence';

import { type NetworkGraphNode } from './NetworkPanel';

// A green build only proves the annotation compiles. These pin that the annotated type is the buf
// message — `$typeName` is the discriminator a structurally similar protobuf.js value cannot carry
// — and that the substituted field moved with it.

declare const node: NetworkGraphNode;
declare const peer: NonNullable<NetworkGraphNode['peer']>;

describe('NetworkPanel PeerState', () => {
  it('is the buf message', () => {
    expect(node.peer).type.toBeAssignableTo<PeerState | undefined>();
    expect(peer.$typeName).type.toBe<'dxos.mesh.presence.PeerState'>();
  });

  it('carries `peerId` as the buf key message, not the domain key class', () => {
    // protobuf.js substituted `dxos.keys.PublicKey` for the `PublicKey` class, which is why
    // `.truncate()` at the call site had to move to an explicit conversion.
    expect(peer.peerId).type.toBeAssignableTo<{ data: Uint8Array } | undefined>();
    expect(peer.peerId).type.not.toBeAssignableTo<{ truncate: () => string } | undefined>();
  });

  it('is no longer the protobuf.js type', () => {
    // Guards against the two types being structurally interchangeable, which would make the
    // conversion above vacuous.
    expect<LegacyPeerState>().type.not.toBeAssignableTo<PeerState>();
  });
});
