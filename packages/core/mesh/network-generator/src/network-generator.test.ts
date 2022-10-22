//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';
import crypto from 'node:crypto';
import { PassThrough } from 'node:stream';
import waitForExpect from 'wait-for-expect';

import { Network } from './network';
import { NetworkGenerator } from './network-generator';

const testShutdown = async (network: Network) => {
  expect(network.peers[0]).to.have.property('name');

  const connection = network.connections[0];
  expect(connection.stream).to.be.instanceOf(PassThrough);
  expect(connection.fromPeer).to.have.property('name');
  expect(connection.toPeer).to.have.property('name');

  let numConnections = network.connections.length;
  await network.deleteConnection(connection.fromPeer.id, connection.toPeer.id);
  await waitForExpect(async () => {
    expect(network.connections.length).to.be.lessThan(numConnections);
  });

  numConnections = network.connections.length;
  await network.deletePeer(network.connections[0].fromPeer.id);
  await waitForExpect(async () => {
    expect(network.connections.length).to.be.lessThan(numConnections);
  });

  await network.destroy();
  expect(network.peers.length).to.equal(0);
  expect(network.connections.length).to.equal(0);
};

describe('NetworkGenerator', function () {
  it('generate a grid topology', async function () {
    const generator = new NetworkGenerator({
      createPeer: async (id) => ({ id, name: `peer${id}` })
    });

    generator.error.on(err => console.log(err));

    const network = await generator.grid(10, 10);
    expect(network.peers.length).to.equal(100);
    expect(network.connections.length).to.equal(180);
    await testShutdown(network);
  });

  it('generate a balancedBinTree of 2 n', async function () {
    const generator = new NetworkGenerator({
      createPeer: async (id) => ({ id, name: `peer${id}` }),
      createConnection: async (fromPeer, toPeer) => new PassThrough()
    });

    generator.error.on(err => console.log(err));

    const network = await generator.balancedBinTree(2);
    expect(network.peers.length).to.equal(7);
    expect(network.connections.length).to.equal(6);
    await testShutdown(network);
  });

  it('insert pre-made peers', async function () {
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
    expect(network.peers.length).to.equal(0);
    expect(network.connections.length).to.equal(0);

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

    expect(network.peers.length).to.equal(3);
    expect(network.connections.length).to.equal(0);

    await network.addConnection(id1, id2);
    await network.addConnection(id1, id3);
    expect(network.connections.length).to.equal(2);

    expect(createPeerCalledCount).to.equal(0);
    await testShutdown(network);
  });
});
