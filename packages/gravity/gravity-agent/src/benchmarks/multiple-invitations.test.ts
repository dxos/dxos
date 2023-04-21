//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { asyncTimeout } from '@dxos/async';
import { Expando, SpaceProxy } from '@dxos/client';
import { performInvitation } from '@dxos/client-services/testing';
import { log } from '@dxos/log';
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
    log.info(`created space, properties id ${baseSpace.properties.id}`);
    await baseSpace.waitUntilReady();
    const key = baseSpace.key;

    const data = { some: 'random', object: 'for testing' };
    const { id: expandoId } = baseSpace.db.add(new Expando(data));
    log.info(`added expando, id ${expandoId}`);

    for (let index = 0; index < numberOFPeers; index++) {
      if (index === numberOFPeers - 1) {
        break;
      }

      log.info(`STRESTEST Peer${index} loading space...`);
      const space = peers[index].client.getSpace(key);
      expect(space).to.exist;
      await asyncTimeout(space!.waitUntilReady(), 10_000);
      expect((space?.db.getObjectById(expandoId) as Expando).toJSON()).to.include(data);
      log.info(`STRESTEST Peer${index} loaded space`);

      log.info(`STRESTEST Peer${index} inviting Peer${index + 1}`);
      const [host, guest] = await asyncTimeout(
        Promise.all(
          performInvitation({
            host: space as SpaceProxy,
            guest: peers[index + 1].client
          })
        ),
        10_000
      );

      if (host.error) {
        log.error('STRESTEST Host error', host.error);
        throw host.error;
      }
      if (guest.error) {
        log.error('STRESTEST Guest error', host.error);
        throw guest.error;
      }

      log.info('STRESTEST Invitation complete');
    }
  })
    .tag('stress')
    .timeout(100000);
});
