//
// Copyright 2021 DXOS.org
//

import crypto from 'crypto';
import { PassThrough } from 'stream';
import waitForExpect from 'wait-for-expect';

import { Network } from './network';
import { NetworkGenerator } from './network-generator';

const genericTest = async (network: Network) => {
  expect(network.peers[0]).toHaveProperty('name');

  const conn1 = network.connections[0];
  expect(conn1.stream).toBeInstanceOf(PassThrough);
  expect(conn1.fromPeer).toHaveProperty('name');
  expect(conn1.toPeer).toHaveProperty('name');

  let connectionLength = network.connections.length;
  await network.deleteConnection(conn1.fromPeer.id, conn1.toPeer.id);
  await waitForExpect(async () => {
    expect(network.connections.length).toBeLessThan(connectionLength);
  });

  connectionLength = network.connections.length;
  await network.deletePeer(network.connections[0].fromPeer.id);
  await waitForExpect(async () => {
    expect(network.connections.length).toBeLessThan(connectionLength);
  });

  await network.destroy();
  expect(network.peers.length).toBe(0);
  expect(network.connections.length).toBe(0);
};

test('generate a grid topology', async () => {
  const generator = new NetworkGenerator({
    createPeer: async (id) => ({ id, name: `peer${id}` })
  });

  generator.error.on(err => console.log(err));

  const network = await generator.grid(10, 10);
  expect(network.peers.length).toBe(100);
  expect(network.connections.length).toBe(180);
  await genericTest(network);
});

test('generate a balancedBinTree of 2 n', async () => {
  const generator = new NetworkGenerator({
    createPeer: async (id) => ({ id, name: `peer${id}` }),
    createConnection: async (fromPeer, toPeer) => new PassThrough()
  });

  generator.error.on(err => console.log(err));

  const network = await generator.balancedBinTree(2);
  expect(network.peers.length).toBe(7);
  expect(network.connections.length).toBe(6);
  await genericTest(network);
});

test('insert pre-made peers', async () => {
  let createPeerCalledCount = 0;
  const generator = new NetworkGenerator({
    createPeer: async (id) => {
      createPeerCalledCount++;
      return { id, name: `peer${id}` };
    },
    createConnection: async (fromPeer, toPeer) => new PassThrough()
  });

  generator.error.on(err => console.log(err));

  const network = await generator.noLinks();
  expect(network.peers.length).toBe(0);
  expect(network.connections.length).toBe(0);

  // `genericTest` above doesn't work for less than three peers so we add three.
  const id1 = crypto.randomBytes(32);
  const id2 = crypto.randomBytes(32);
  const id3 = crypto.randomBytes(32);
  const peer1 = { id: id1, name: `insertedPeer${id1}` };
  const peer2 = { id: id2, name: `insertedPeer${id2}` };
  const peer3 = { id: id3, name: `insertedPeer${id2}` };
  network.insertPeer(peer1);
  network.insertPeer(peer2);
  network.insertPeer(peer3);

  expect(network.peers.length).toBe(3);
  expect(network.connections.length).toBe(0);

  await network.addConnection(id1, id2);
  await network.addConnection(id1, id3);
  expect(network.connections.length).toBe(2);

  expect(createPeerCalledCount).toBe(0);
  await genericTest(network);
});
