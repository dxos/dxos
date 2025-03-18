//
// Copyright 2022 DXOS.org
//

import { onTestFinished, describe, expect, test } from 'vitest';

import { Trigger } from '@dxos/async';
import { type WithTypeUrl } from '@dxos/codec-protobuf';
import { PublicKey } from '@dxos/keys';
import { type PeerState } from '@dxos/protocols/proto/dxos/mesh/presence';
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

    const deviceKey1 = PublicKey.random();
    const deviceKey2 = PublicKey.random();
    await extension1.sendAnnounce({
      deviceKey: deviceKey1,
      channelId: 'dxos.mesh.teleport.gossip',
      timestamp: new Date(),
      messageId: PublicKey.random().toHex(),
      payload: {
        '@type': 'dxos.mesh.presence.PeerState',
        connections: [deviceKey2],
        deviceKey: deviceKey1,
      } satisfies WithTypeUrl<PeerState>,
    });

    await extension2.sendAnnounce({
      deviceKey: deviceKey2,
      channelId: 'dxos.mesh.teleport.gossip',
      timestamp: new Date(),
      messageId: PublicKey.random().toHex(),
      payload: {
        '@type': 'dxos.mesh.presence.PeerState',
        connections: [deviceKey1],
        deviceKey: deviceKey2,
      },
    });

    expect((await trigger1.wait({ timeout: 50 })).deviceKey.toHex()).toEqual(deviceKey2.toHex());
    expect((await trigger2.wait({ timeout: 50 })).deviceKey.toHex()).toEqual(deviceKey1.toHex());
  });
});
