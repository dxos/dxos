//
// Copyright 2021 DXOS.org
//

import crypto from 'crypto';
import debug from 'debug';
import pEvent from 'p-event';

import { createBroker } from './broker';

const log = debug('dxos:test:presence');

jest.setTimeout(100 * 1000);

function complete (nodeID, graph, max) {
  if (graph.nodes().length !== max) {
    return false;
  }

  const nodes = graph.nodes().filter(id => id !== nodeID);

  const edges = [];
  for (const edge of graph.edgeEntries(nodeID)) {
    const source = edge[2];
    const target = edge[3];
    edges.push(source === nodeID ? target : source);
  }

  if (edges.length < (max - 1)) {
    return false;
  }

  for (const id of nodes) {
    if (!edges.includes(id)) {
      return false;
    }
  }

  return true;
}

test('5 brokers full network connected', async () => {
  const MAX_BROKERS = 5;

  const topic = crypto.randomBytes(32);

  const brokers = [...Array(MAX_BROKERS).keys()].map(i => createBroker(topic, { port: 6000 + i, logger: false, hyperswarm: { bootstrap: false } }));

  const waitForPresenceGraph = Promise.all(brokers.map(async broker => {
    return pEvent(broker.localBus, '$broker.presence-update', (graph) => complete(broker.nodeID, graph, MAX_BROKERS));
  }));

  const waitForConnected = Promise.all(brokers.map(broker => {
    const nodes = brokers.filter(b => b.nodeID !== broker.nodeID).map(b => b.nodeID);
    return Promise.all(nodes.map(nodeID => pEvent(broker.localBus, '$node.connected', ({ node }) => node.id === nodeID)));
  }));

  log('> starting brokers');
  await Promise.all(brokers.map(b => b.start()));

  await waitForConnected;

  log('> waiting for the nodes to be full connected');
  await waitForPresenceGraph;

  log('> stopping brokers');
  return Promise.all(brokers.map(b => b.stop()));
});
