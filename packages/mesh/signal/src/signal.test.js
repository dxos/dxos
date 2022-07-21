//
// Copyright 2021 DXOS.org
//

import swarm from '@geut/discovery-swarm-webrtc';
import wrtc from '@koush/wrtc';
import crypto from 'crypto';
import debug from 'debug';
import pEvent from 'p-event';

import { createBroker } from './broker';

const log = debug('dxos:test:signal');

jest.setTimeout(100 * 1000);

const checkDiscoveryUpdate = (brokers, check) => Promise.all(brokers.map((broker) => pEvent(broker.localBus, '$broker.discovery-update', () => check(broker))));

// TODO(telackey): This test does not work for me.
test.skip('join/leave/connection webrtc peer', async () => {
  const topic = crypto.randomBytes(32);

  const brokers = [...Array(10).keys()].map(i => createBroker(topic, { port: 5000 + i, logger: false, hyperswarm: { bootstrap: false } }));

  log('> starting brokers');
  await Promise.all(brokers.map(b => b.start()));

  const clients = [...Array(3).keys()].map(i => swarm({
    bootstrap: [`ws://127.0.0.1:${5000 + i}`],
    simplePeer: {
      wrtc
    }
  }));

  const peerIds = clients.map(c => c.id);
  const waitForJoin = checkDiscoveryUpdate(brokers, broker => {
    const { peerMap } = broker.shared;

    return peerIds.reduce((prev, peerId) => prev && peerMap.peers.find(p => p.topic.equals(topic) && p.id.equals(peerId)), true);
  });

  const waitForPeerConnections = new Promise(resolve => {
    let connections = 0;
    const done = (conn, { initiator }) => {
      if (initiator) {
        connections++;
      }
      if (connections >= 2) {
        clients.forEach(client => client.off('connection', done));
        resolve();
      }
    };
    clients.forEach(client => client.on('connection', done));
  });

  log('> waiting for joining');
  clients.forEach(client => client.join(topic));
  await waitForJoin;

  log('> waiting for webrtc connections');
  await waitForPeerConnections;

  log('> waiting for leaving');
  const waitForLeave = checkDiscoveryUpdate(brokers, broker => {
    const { peerMap } = broker.shared;
    return peerMap.getPeersByTopic(topic).length === 0;
  });

  clients.forEach(client => client.leave(topic));
  await waitForLeave;
  log('> all left');

  log('> stopping signals');
  await Promise.all(clients.map(client => client.signal.close()));
  log('> stopping brokers');
  await Promise.all(brokers.map(b => b.stop()));
  log('> stopped');
});
