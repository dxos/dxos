//
// Copyright 2022 DXOS.org
//

import { describe, expect, onTestFinished, test } from 'vitest';

import { Trigger } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { type GossipMessage } from '@dxos/protocols/proto/dxos/mesh/teleport/gossip';
import { TestBuilder, TestPeer } from '@dxos/teleport/testing';

import { GossipExtension } from './gossip-extension';

describe('GossipExtension', () => {
  test('Two peers discover each other', async () => {
    const builder = new TestBuilder();
    onTestFinished(() => builder.destroy());
    const [peer1, peer2] = builder.createPeers({ factory: () => new TestPeer() });
    const [connection1, connection2] = await builder.connect(peer1, peer2);

    const trigger1 = new Trigger<GossipMessage>();
    const extension1 = new GossipExtension({
      onAnnounce: async (message: GossipMessage) => {
        trigger1.wake(message);
      },
    });
    connection1.teleport.addExtension('dxos.mesh.teleport.gossip', extension1);

    const trigger2 = new Trigger<GossipMessage>();
    const extension2 = new GossipExtension({
      onAnnounce: async (message: GossipMessage) => {
        trigger2.wake(message);
      },
    });
    connection2.teleport.addExtension('dxos.mesh.teleport.gossip', extension2);

    await extension1.sendAnnounce({
      peerId: peer1.peerId,
      channelId: 'dxos.mesh.teleport.gossip',
      timestamp: new Date(),
      messageId: PublicKey.random(),
      payload: {
        '@type': 'dxos.mesh.presence.PeerState',
        connections: [peer2.peerId],
        identityKey: PublicKey.random(),
      },
    });

    await extension2.sendAnnounce({
      peerId: peer2.peerId,
      channelId: 'dxos.mesh.teleport.gossip',
      timestamp: new Date(),
      messageId: PublicKey.random(),
      payload: {
        '@type': 'dxos.mesh.presence.PeerState',
        connections: [peer1.peerId],
        identityKey: PublicKey.random(),
      },
    });

    expect((await trigger1.wait({ timeout: 50 })).peerId.toHex()).toEqual(peer2.peerId.toHex());
    expect((await trigger2.wait({ timeout: 50 })).peerId.toHex()).toEqual(peer1.peerId.toHex());
  });
});
