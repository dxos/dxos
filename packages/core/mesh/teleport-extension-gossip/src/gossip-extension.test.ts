//
// Copyright 2022 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import { describe, expect, onTestFinished, test } from 'vitest';

import { Trigger } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { anyPackPrefixed, fromDate, fromPublicKey, requirePublicKey } from '@dxos/protocols/buf';
import { PeerStateSchema } from '@dxos/protocols/buf/dxos/mesh/presence_pb';
import { type GossipMessage, GossipMessageSchema } from '@dxos/protocols/buf/dxos/mesh/teleport/gossip_pb';
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

    await extension1.sendAnnounce(
      create(GossipMessageSchema, {
        peerId: fromPublicKey(peer1.peerId),
        channelId: 'dxos.mesh.teleport.gossip',
        timestamp: fromDate(new Date()),
        messageId: fromPublicKey(PublicKey.random()),
        payload: anyPackPrefixed(
          PeerStateSchema,
          create(PeerStateSchema, {
            connections: [fromPublicKey(peer2.peerId)],
            identityKey: fromPublicKey(PublicKey.random()),
          }),
        ),
      }),
    );

    await extension2.sendAnnounce(
      create(GossipMessageSchema, {
        peerId: fromPublicKey(peer2.peerId),
        channelId: 'dxos.mesh.teleport.gossip',
        timestamp: fromDate(new Date()),
        messageId: fromPublicKey(PublicKey.random()),
        payload: anyPackPrefixed(
          PeerStateSchema,
          create(PeerStateSchema, {
            connections: [fromPublicKey(peer1.peerId)],
            identityKey: fromPublicKey(PublicKey.random()),
          }),
        ),
      }),
    );

    expect(requirePublicKey((await trigger1.wait({ timeout: 50 })).peerId).toHex()).toEqual(peer2.peerId.toHex());
    expect(requirePublicKey((await trigger2.wait({ timeout: 50 })).peerId).toHex()).toEqual(peer1.peerId.toHex());
  });
});
