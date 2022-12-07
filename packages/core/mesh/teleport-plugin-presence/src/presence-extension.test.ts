//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import waitForExpect from 'wait-for-expect';

import { latch } from '@dxos/async';
import { PeerState } from '@dxos/protocols/proto/dxos/mesh/teleport/presence';
import { TestBuilder } from '@dxos/teleport/testing';
import { afterTest, describe, test } from '@dxos/test';

import { PresenceExtension } from './presence-extension';

describe('PresenceExtension', () => {
  test('Two peers announce each other', async () => {
    const builder = new TestBuilder();
    afterTest(() => builder.destroy());
    const { peer1, peer2 } = await builder.createPipedPeers();

    const received1: PeerState[] = [];
    const extension1 = new PresenceExtension({
      connections: [peer2.peerId],
      resendAnnounce: 50,
      onAnnounce: async (peerState: PeerState) => {
        received1.push(peerState);
      }
    });
    peer1.teleport!.addExtension('dxos.mesh.teleport.presence', extension1);

    const received2: PeerState[] = [];
    const extension2 = new PresenceExtension({
      connections: [peer1.peerId],
      resendAnnounce: 50,
      onAnnounce: async (peerState: PeerState) => {
        received2.push(peerState);
      }
    });
    peer2.teleport!.addExtension('dxos.mesh.teleport.presence', extension2);

    await waitForExpect(() => expect(received1[0].peerId).toEqual(peer2.peerId));
    await waitForExpect(() => expect(received2[0].peerId).toEqual(peer1.peerId));
  });

  test('Peer reannounces itself by interval', async () => {
    const builder = new TestBuilder();
    afterTest(() => builder.destroy());
    const { peer1, peer2 } = await builder.createPipedPeers();

    const [announced10Times, inc] = latch({ count: 10 });
    const extension1 = new PresenceExtension({
      connections: [peer2.peerId],
      resendAnnounce: 50,
      onAnnounce: async (peerState: PeerState) => {
        inc();
      }
    });
    peer1.teleport!.addExtension('dxos.mesh.teleport.presence', extension1);

    const extension2 = new PresenceExtension({
      connections: [peer1.peerId],
      resendAnnounce: 50,
      onAnnounce: async (peerState: PeerState) => {}
    });
    peer2.teleport!.addExtension('dxos.mesh.teleport.presence', extension2);

    await announced10Times();
  });
});
