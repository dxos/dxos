//
// Copyright 2019 DxOS.
//

//
// Copyright 2021 DXOS.org
//

import crypto from 'crypto';
import debug from 'debug';
import path from 'ngraph.path';
import waitForExpect from 'wait-for-expect';

import { Protocol } from '@dxos/protocol';
import { ProtocolNetworkGenerator } from '@dxos/protocol-network-generator';

import { Presence } from './presence';

const log = debug('test');
debug.enable('test');

const TIMEOUT = 30 * 1000;

jest.setTimeout(TIMEOUT);

const random = arr => arr[Math.floor(Math.random() * arr.length)];

const generator = new ProtocolNetworkGenerator((topic, peerId) => {
  const presence = new Presence(peerId, {
    metadata: { shareStr: 'test1', shareBuf: Buffer.from('test2') }
  });

  const createStream = () => new Protocol({
    streamOptions: {
      live: true
    }
  })
    .setSession({ peerId })
    .setExtension(presence.createExtension())
    .init(topic)
    .stream;

  return { id: peerId, presence, createStream };
});

function links (graph) {
  const links = [];
  graph.forEachLink(link => {
    const t = [link.fromId, link.toId].sort();
    links.push(t.join(' --> '));
  });
  return links;
}

test.skip('presence', async () => {
  const waitOneWayMessage = {};
  waitOneWayMessage.promise = new Promise((resolve) => {
    waitOneWayMessage.resolve = resolve;
  });

  const topic = crypto.randomBytes(32);
  const network = await generator.balancedBinTree({
    topic,
    waitForFullConnection: false,
    parameters: [3]
  });

  network.on('peer-deleted', peer => {
    log(`peer ${peer.id.toString('hex')} destroyed`);
    peer.presence.stop();
  });

  const peer1 = random(network.peers);

  await waitForExpect(() => {
    expect(network.connections.length).toBe(peer1.presence.graph.getLinksCount());
  }, TIMEOUT, 2 * 1000);

  log('original network');
  links(network.graph).forEach(val => log(val));

  log('presence network');
  links(peer1.presence.graph).forEach(val => log(val));

  await waitForExpect(() => {
    const pathFinder = path.nba(peer1.presence.graph);
    const fromId = peer1.id.toString('hex');

    const result = network.peers
      .filter(peer => peer !== peer1)
      .reduce((prev, peer) => {
        return prev && pathFinder.find(fromId, peer.id.toString('hex')).length > 0;
      }, true);

    expect(result).toBe(true);
  }, TIMEOUT, 5 * 1000);

  peer1.presence.graph.forEachNode(node => {
    expect(node.data.metadata).toEqual({ shareStr: 'test1', shareBuf: Buffer.from('test2') });
  });

  log('network full connected');

  await network.destroy();

  await waitForExpect(() => {
    expect(peer1.presence.graph.getNodesCount()).toBe(1);
  }, TIMEOUT, 2 * 1000);
});
