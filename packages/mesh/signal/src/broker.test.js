//
// Copyright 2020 DxOS.
//

const crypto = require('crypto');
const pEvent = require('p-event');
const debug = require('debug');

const { createBroker } = require('./broker');

const log = debug('dxos:test:broker');

jest.setTimeout(100 * 1000);

const MAX_BROKERS = 10;

test(`${MAX_BROKERS} brokers connectivity`, async () => {
  const topic = crypto.randomBytes(32);

  const brokers = [...Array(MAX_BROKERS).keys()].map(i => createBroker(topic, { port: 4000 + i, logger: false }));

  const waitForConnected = Promise.all(brokers.map(broker => {
    const nodes = brokers.filter(b => b.nodeID !== broker.nodeID).map(b => b.nodeID);
    return Promise.all(nodes.map(nodeID => pEvent(broker.localBus, '$node.connected', ({ node }) => node.id === nodeID)));
  }));

  log('> starting brokers');
  await Promise.all(brokers.map(b => b.start()));

  log('> waiting for the nodes to be connected');
  await waitForConnected;

  log('> stopping brokers');
  return Promise.all(brokers.map(b => b.stop()));
});
