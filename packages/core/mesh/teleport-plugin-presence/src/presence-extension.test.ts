//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import waitForExpect from 'wait-for-expect';

import { latch, Trigger } from '@dxos/async';
import { PeerState } from '@dxos/protocols/proto/dxos/mesh/teleport/presence';
import { TestBuilder } from '@dxos/teleport/testing';
import { afterTest, describe, test } from '@dxos/test';

import { PresenceExtension } from './presence-extension';

describe('PresenceExtension', () => {
  test('Two peers discover each other', async () => {
    const builder = new TestBuilder();
    afterTest(() => builder.destroy());
    const { peer1, peer2 } = await builder.createPipedPeers();

    const trigger1 = new Trigger<PeerState>();
    const extension1 = new PresenceExtension({
      connections: [peer2.peerId],
      announceInterval: 50,
      onAnnounce: async (peerState: PeerState) => {
        trigger1.wake(peerState);
      }
    });
    peer1.teleport!.addExtension('dxos.mesh.teleport.presence', extension1);

    const trigger2 = new Trigger<PeerState>();
    const extension2 = new PresenceExtension({
      connections: [peer1.peerId],
      announceInterval: 50,
      onAnnounce: async (peerState: PeerState) => {
        trigger2.wake(peerState);
      }
    });
    peer2.teleport!.addExtension('dxos.mesh.teleport.presence', extension2);

    expect((await trigger1.wait({ timeout: 100 })).peerId).toEqual(peer2.peerId);
    expect((await trigger2.wait({ timeout: 100 })).peerId).toEqual(peer1.peerId);
  });

  test('Peer reannounces itself by interval', async () => {
    const builder = new TestBuilder();
    afterTest(() => builder.destroy());
    const { peer1, peer2 } = await builder.createPipedPeers();

    const [announced3Times, inc] = latch({ count: 3 });
    const extension1 = new PresenceExtension({
      connections: [peer2.peerId],
      announceInterval: 25,
      onAnnounce: async (peerState: PeerState) => {
        inc();
      }
    });
    peer1.teleport!.addExtension('dxos.mesh.teleport.presence', extension1);

    const extension2 = new PresenceExtension({
      connections: [peer1.peerId],
      announceInterval: 25,
      onAnnounce: async (peerState: PeerState) => {}
    });
    peer2.teleport!.addExtension('dxos.mesh.teleport.presence', extension2);

    await announced3Times();
  });
});
