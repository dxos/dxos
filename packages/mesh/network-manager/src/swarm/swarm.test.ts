//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import { expect, mockFn } from 'earljs';
import { it as test } from 'mocha';
import waitForExpect from 'wait-for-expect';

import { sleep, promiseTimeout } from '@dxos/async';
import { Protocol } from '@dxos/mesh-protocol';
import { PublicKey } from '@dxos/protocols';
import { afterTest } from '@dxos/testutils';

import { Message } from '../proto/gen/dxos/mesh/signal';
import { SignalMessaging } from '../signal';
import { FullyConnectedTopology } from '../topology';
import { createWebRTCTransportFactory, WebRTCTransport } from '../transport';
import { Swarm } from './swarm';

const log = debug('dxos:network-manager:swarm:test');

class MockSignalConnection implements SignalMessaging {
  constructor (
    readonly _swarm: () => Swarm,
    readonly _delay = 10
  ) {}

  async offer (msg: Message) {
    await sleep(this._delay);
    return this._swarm().onOffer(msg);
  }

  async signal (msg: Message) {
    await sleep(this._delay);
    await this._swarm().onSignal(msg);
  }
}

const setup = () => {
  const topic = PublicKey.random();
  const peerId1 = PublicKey.random();
  const peerId2 = PublicKey.random();

  const swarm1: Swarm = new Swarm(
    topic,
    peerId1,
    new FullyConnectedTopology(),
    () => new Protocol(),
    new MockSignalConnection(() => swarm2),
    () => {},
    createWebRTCTransportFactory(),
    undefined
  );

  const swarm2: Swarm = new Swarm(
    topic,
    peerId2,
    new FullyConnectedTopology(),
    () => new Protocol(),
    new MockSignalConnection(() => swarm1),
    () => {},
    createWebRTCTransportFactory(),
    undefined
  );

  afterTest(async () => {
    await swarm1.destroy();
    await swarm2.destroy();
  });

  return { swarm1, swarm2, peerId1, peerId2 };
};

test('connects two peers in a swarm', async () => {
  const { swarm1, swarm2, peerId2 } = setup();

  expect(swarm1.connections.length).toEqual(0);
  expect(swarm2.connections.length).toEqual(0);

  const promise = Promise.all([
    promiseTimeout(swarm1.connected.waitForCount(1), 3000, new Error('Swarm1 connect timeout.')),
    promiseTimeout(swarm2.connected.waitForCount(1), 3000, new Error('Swarm2 connect timeout.'))
  ]);

  swarm1.onPeerCandidatesChanged([peerId2]);

  log('Candidates changed');
  await promise;
  log('Swarms connected');

  const swarm1Connection = swarm1.connections[0];
  const swarm2Connection = swarm2.connections[0];
  const onData = mockFn<(data: Buffer) => void>().returns(undefined);
  (swarm2Connection.transport as WebRTCTransport).peer!.on('data', onData);

  const data = Buffer.from('1234');
  (swarm1Connection.transport as WebRTCTransport).peer!.send(data);
  await waitForExpect(() => {
    expect(onData).toHaveBeenCalledWith([data]);
  });
}).timeout(5_000);

test('two peers try to originate connections to each other simultaneously', async () => {
  const { swarm1, swarm2, peerId1, peerId2 } = setup();

  expect(swarm1.connections.length).toEqual(0);
  expect(swarm2.connections.length).toEqual(0);

  swarm1.onPeerCandidatesChanged([peerId2]);
  swarm2.onPeerCandidatesChanged([peerId1]);

  await Promise.all([
    swarm1.connected.waitForCount(1),
    swarm2.connected.waitForCount(1)
  ]);
}).timeout(5_000);

test('second peer discovered after delay', async () => {
  const { swarm1, swarm2, peerId1, peerId2 } = setup();

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
  (swarm2Connection.transport as WebRTCTransport).peer!.on('data', onData);

  const data = Buffer.from('1234');
  (swarm1Connection.transport as WebRTCTransport).peer!.send(data);
  await waitForExpect(() => {
    expect(onData).toHaveBeenCalledWith([data]);
  });
}).timeout(5_000);
