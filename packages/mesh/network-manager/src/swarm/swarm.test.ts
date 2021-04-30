//
// Copyright 2020 DXOS.org
//

import { expect, mockFn } from 'earljs';
import waitForExpect from 'wait-for-expect';

import { sleep } from '@dxos/async';
import { PublicKey } from '@dxos/crypto';
import { Protocol } from '@dxos/protocol';

import { FullyConnectedTopology } from '../topology/fully-connected-topology';
import { Swarm } from './swarm';
import { createWebRtcConnectionFactory, WebrtcConnection } from './webrtc-connection';
import { afterTest } from '../testutils';

const setup = () => {
  const topic = PublicKey.random();
  const peerId1 = PublicKey.random();
  const peerId2 = PublicKey.random();
  const swarm1: Swarm = new Swarm(
    topic,
    peerId1,
    new FullyConnectedTopology(),
    () => new Protocol(),
    async msg => {
      await sleep(10); // Simulating network delay
      return swarm2.onOffer(msg);
    },
    async msg => {
      await sleep(10); // Simulating network delay
      await swarm2.onSignal(msg);
    },
    () => {},
    createWebRtcConnectionFactory(),
    undefined
  );
  const swarm2: Swarm = new Swarm(
    topic,
    peerId2,
    new FullyConnectedTopology(),
    () => new Protocol(),
    async msg => {
      await sleep(10); // Simulating network delay
      return swarm1.onOffer(msg);
    },
    async msg => {
      await sleep(10); // Simulating network delay
      await swarm1.onSignal(msg);
    },
    () => {},
    createWebRtcConnectionFactory(),
    undefined
  );
  afterTest(() => swarm1.destroy())
  afterTest(() => swarm2.destroy())

  return { swarm1, swarm2, peerId1, peerId2 }
}

test('connects two peers in a swarm', async () => {
  const { swarm1, swarm2, peerId1, peerId2 } = setup()

  expect(swarm1.connections.length).toEqual(0);
  expect(swarm2.connections.length).toEqual(0);

  swarm1.onPeerCandidatesChanged([peerId2]);
  swarm2.onPeerCandidatesChanged([peerId1]);

  await Promise.all([
    swarm1.connected.waitForCount(1),
    swarm1.connected.waitForCount(1)
  ]);

  const swarm1Connection = swarm1.connections[0];
  const swarm2Connection = swarm2.connections[0];
  const onData = mockFn<(data: Buffer) => void>().returns(undefined);
  (swarm2Connection as WebrtcConnection).peer!.on('data', onData);

  const data = Buffer.from('1234');
  (swarm1Connection as WebrtcConnection).peer!.send(data);
  await waitForExpect(() => {
    expect(onData).toHaveBeenCalledWith([data]);
  });
});

test.only('two peers try to originate connections to each other simultaneously', async () => {
  const { swarm1, swarm2, peerId1, peerId2 } = setup()

  expect(swarm1.connections.length).toEqual(0);
  expect(swarm2.connections.length).toEqual(0);

  swarm1.onPeerCandidatesChanged([peerId2]);
  swarm2.onPeerCandidatesChanged([peerId1]);

  await Promise.all([
    swarm1.connected.waitForCount(1),
    swarm1.connected.waitForCount(1)
  ]);
}, 5_000);

test('second peer discovered after delat', async () => {
  const { swarm1, swarm2, peerId1, peerId2 } = setup()

  expect(swarm1.connections.length).toEqual(0);
  expect(swarm2.connections.length).toEqual(0);

  swarm1.onPeerCandidatesChanged([peerId2]);
  await sleep(15);
  swarm2.onPeerCandidatesChanged([peerId1]);

  await Promise.all([
    swarm1.connected.waitForCount(1),
    swarm1.connected.waitForCount(1)
  ]);

  const swarm1Connection = swarm1.connections[0];
  const swarm2Connection = swarm2.connections[0];
  const onData = mockFn<(data: Buffer) => void>().returns(undefined);
  (swarm2Connection as WebrtcConnection).peer!.on('data', onData);

  const data = Buffer.from('1234');
  (swarm1Connection as WebrtcConnection).peer!.send(data);
  await waitForExpect(() => {
    expect(onData).toHaveBeenCalledWith([data]);
  });
});
