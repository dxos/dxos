//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { Expando, SpaceProxy } from '@dxos/client';
import { performInvitation } from '@dxos/client-services/testing';
import { describe, test, afterTest } from '@dxos/test';
import { Builder } from '@dxos/test-builder';

import { Agent } from '../agent';
import { testPeerFactory } from './testing';

describe('Multiple invitations', () => {
  test('N peers join in the same space', async () => {
    const builder = new Builder();
    afterTest(() => builder.destroy());
    const numberOFPeers = 20;
    const peers: Agent[] = [];

    for (let i = 0; i < numberOFPeers; i++) {
      const peer = builder.createPeer({ factory: testPeerFactory });
      await peer.initialize();
      await peer.client.halo.createIdentity({ displayName: `Peer ${i}` });
      peers.push(peer);
    }

    const baseSpace = await peers[0].client.createSpace();
    await baseSpace.waitUntilReady();
    const key = baseSpace.key;

    const data = { some: 'random', object: 'for testing' };
    const { id: expandoId } = baseSpace.db.add(new Expando(data));

    for (let index = 0; index < numberOFPeers; index++) {
      if (index === numberOFPeers - 1) {
        break;
      }
      const space = peers[index].client.getSpace(key);
      expect(space).to.exist;
      await space!.waitUntilReady();
      expect((space?.db.getObjectById(expandoId) as Expando).toJSON()).to.include(data);

      await Promise.all(
        performInvitation({
          host: space as SpaceProxy,
          guest: peers[index + 1].client
        })
      );
    }
  })
    .tag('stress')
    .timeout(100000);
});
