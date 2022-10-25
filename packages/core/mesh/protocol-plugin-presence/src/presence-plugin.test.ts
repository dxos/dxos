//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';
import crypto from 'crypto';
import debug from 'debug';
import { Graph } from 'ngraph.graph';
import path from 'ngraph.path';
import waitForExpect from 'wait-for-expect';

import { PublicKey } from '@dxos/keys';
import { Protocol } from '@dxos/mesh-protocol';
import { ProtocolNetworkGenerator } from '@dxos/protocol-network-generator';

import { PresencePlugin } from './presence-plugin';

const log = debug('test');
debug.enable('test');

const TIMEOUT = 30 * 1000;

const random = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

const generator = new ProtocolNetworkGenerator(
  async (topic, peerId): Promise<any> => {
    const presence = new PresencePlugin(peerId, {
      metadata: { shareStr: 'test1', shareBuf: Buffer.from('test2') }
    });

    const createStream = ({ initiator }: { initiator: boolean | undefined }) =>
      new Protocol({
        streamOptions: {
          live: true
        },
        discoveryKey: topic,
        initiator: !!initiator,
        userSession: { peerId: PublicKey.stringify(peerId) }
      })
        .setExtension(presence.createExtension())
        .init().stream;

    return { id: peerId, presence, createStream };
  }
);

const links = (graph: Graph) => {
  const links: string[] = [];
  graph.forEachLink((link) => {
    const t = [link.fromId, link.toId].sort();
    links.push(t.join(' --> '));
  });
  return links;
};

it('presence', async function () {
  this.timeout(TIMEOUT);

  const topic = crypto.randomBytes(32);
  const network = await generator.balancedBinTree({
    topic,
    waitForFullConnection: false,
    parameters: [3]
  });

  network.on('peer-deleted', (peer: any) => {
    log(`peer ${peer.id.toString('hex')} destroyed`);
    peer.presence.stop();
  });

  const peer1 = random(network.peers) as any;

  await waitForExpect(
    () => {
      expect(network.connections.length).to.equal(
        peer1.presence.graph.getLinksCount()
      );
    },
    TIMEOUT,
    2 * 1000
  );

  log('original network');
  links(network.graph).forEach((val) => log(val));

  log('presence network');
  links(peer1.presence.graph).forEach((val) => log(val));

  await waitForExpect(
    () => {
      const pathFinder = path.nba(peer1.presence.graph);
      const fromId = peer1.id.toString('hex');

      const result = network.peers
        .filter((peer: any) => peer !== peer1)
        .reduce(
          (prev: any, peer: any) =>
            prev && pathFinder.find(fromId, peer.id.toString('hex')).length > 0,
          true
        );

      expect(result).to.be.true;
    },
    TIMEOUT,
    5 * 1000
  );

  peer1.presence.graph.forEachNode((node: any) => {
    expect(node.data.metadata).to.deep.equal({
      shareStr: 'test1',
      shareBuf: Buffer.from('test2')
    });
  });

  log('network full connected');

  await network.destroy();

  await waitForExpect(
    () => {
      expect(peer1.presence.graph.getNodesCount()).to.equal(1);
    },
    TIMEOUT,
    2 * 1000
  );
});
