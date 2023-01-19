//
// Copyright 2022 DXOS.org
//

import expect from 'expect';

import { Trigger } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { PeerState } from '@dxos/protocols/proto/dxos/mesh/teleport/presence';
import { TestBuilder, TestPeer } from '@dxos/teleport/testing';
import { afterTest, describe, test } from '@dxos/test';

import { PresenceExtension } from './presence-extension';

describe('PresenceExtension', () => {
  test('Two peers discover each other', async () => {
    const builder = new TestBuilder();
    afterTest(() => builder.destroy());
    const [peer1, peer2] = builder.createPeers({ factory: () => new TestPeer() });
    const [connection1, connection2] = await builder.connect(peer1, peer2);

    const trigger1 = new Trigger<PeerState>();
    const extension1 = new PresenceExtension({
      onAnnounce: async (peerState: PeerState) => {
        trigger1.wake(peerState);
      }
    });
    connection1.teleport.addExtension('dxos.mesh.teleport.presence', extension1);

    const trigger2 = new Trigger<PeerState>();
    const extension2 = new PresenceExtension({
      onAnnounce: async (peerState: PeerState) => {
        trigger2.wake(peerState);
      }
    });
    connection2.teleport.addExtension('dxos.mesh.teleport.presence', extension2);

    await extension1.sendAnnounce({
      peerId: peer1.peerId,
      connections: [peer2.peerId],
      timestamp: new Date(),
      messageId: PublicKey.random(),
      identityKey: PublicKey.random()
    });

    await extension2.sendAnnounce({
      peerId: peer2.peerId,
      connections: [peer1.peerId],
      timestamp: new Date(),
      messageId: PublicKey.random(),
      identityKey: PublicKey.random()
    });

    expect((await trigger1.wait({ timeout: 50 })).peerId).toEqual(peer2.peerId);
    expect((await trigger2.wait({ timeout: 50 })).peerId).toEqual(peer1.peerId);
  });
});
