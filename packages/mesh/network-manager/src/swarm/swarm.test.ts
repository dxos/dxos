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

import { SignalMessage } from '../proto/gen/dxos/mesh/signalMessage';
import { SignalMessaging } from '../signal';
import { MessageRouter } from '../signal/message-router';
import { FullyConnectedTopology } from '../topology';
import { createWebRTCTransportFactory, WebRTCTransport } from '../transport';
import { Swarm } from './swarm';

const log = debug('dxos:network-manager:swarm:test');

describe('Swarm', () => {
  class MockSignalConnection implements SignalMessaging {
    constructor (
      readonly _swarm: () => Swarm,
      readonly _delay = 10
    ) {}

    async offer (msg: SignalMessage) {
      await sleep(this._delay);
      return this._swarm().onOffer(msg);
    }

    async message (msg: SignalMessage) {
      await sleep(this._delay);
      await this._swarm().onMessage(msg);
    }
  }

  const setup = ({ router = false } = {}) => {
    const topic = PublicKey.random();
    const peerId1 = PublicKey.random();
    const peerId2 = PublicKey.random();
    // eslint-disable-next-line prefer-const
    let swarm1: Swarm;
    // eslint-disable-next-line prefer-const
    let swarm2: Swarm;

    const mr1: MessageRouter = new MessageRouter({
      sendMessage: msg => mr2.receiveMessage(msg),
      onMessage: msg => swarm1.onMessage(msg),
      onOffer: msg => swarm1.onOffer(msg)
    });
    afterTest(() => mr1.destroy());

    const mr2: MessageRouter = new MessageRouter({
      sendMessage: msg => mr1.receiveMessage(msg),
      onMessage: msg => swarm2.onMessage(msg),
      onOffer: msg => swarm2.onOffer(msg)
    });
    afterTest(() => mr2.destroy());

    const sm1: SignalMessaging = router ? mr1 : new MockSignalConnection(() => swarm2);

    const sm2: SignalMessaging = router ? mr2 : new MockSignalConnection(() => swarm1);

    swarm1 = new Swarm(
      topic,
      peerId1,
      new FullyConnectedTopology(),
      () => new Protocol(),
      sm1,
      createWebRTCTransportFactory(),
      undefined
    );

    swarm2 = new Swarm(
      topic,
      peerId2,
      new FullyConnectedTopology(),
      () => new Protocol(),
      sm2,
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
    const { swarm1, swarm2, peerId1, peerId2 } = setup();

    expect(swarm1.connections.length).toEqual(0);
    expect(swarm2.connections.length).toEqual(0);

    const promise = Promise.all([
      promiseTimeout(swarm1.connected.waitForCount(1), 3000, new Error('Swarm1 connect timeout.')),
      promiseTimeout(swarm2.connected.waitForCount(1), 3000, new Error('Swarm2 connect timeout.'))
    ]);

    // Behavior of the Signal Server.
    swarm1.onSwarmEvent({
      peerAvailable: {
        peer: peerId1.asUint8Array(),
        since: new Date()
      }
    });

    swarm1.onSwarmEvent({
      peerAvailable: {
        peer: peerId2.asUint8Array(),
        since: new Date()
      }
    });

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

    swarm1.onSwarmEvent({
      peerAvailable: {
        peer: peerId2.asUint8Array(),
        since: new Date()
      }
    });

    swarm2.onSwarmEvent({
      peerAvailable: {
        peer: peerId1.asUint8Array(),
        since: new Date()
      }
    });

    await Promise.all([
      swarm1.connected.waitForCount(1),
      swarm2.connected.waitForCount(1)
    ]);
  }).timeout(5_000);

  test('second peer discovered after delay', async () => {
    const { swarm1, swarm2, peerId1, peerId2 } = setup();

    expect(swarm1.connections.length).toEqual(0);
    expect(swarm2.connections.length).toEqual(0);

    swarm1.onSwarmEvent({
      peerAvailable: {
        peer: peerId2.asUint8Array(),
        since: new Date()
      }
    });
    await sleep(15);
    swarm2.onSwarmEvent({
      peerAvailable: {
        peer: peerId1.asUint8Array(),
        since: new Date()
      }
    });

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

  test('swarming with message router', async () => {
    const { swarm1, swarm2, peerId2 } = setup({ router: true });

    const promise = Promise.all([
      promiseTimeout(swarm1.connected.waitForCount(1), 3000, new Error('Swarm1 connect timeout.')),
      promiseTimeout(swarm2.connected.waitForCount(1), 3000, new Error('Swarm2 connect timeout.'))
    ]);

    swarm1.onSwarmEvent({
      peerAvailable: {
        peer: peerId2.asUint8Array(),
        since: new Date()
      }
    });

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
    await swarm1.destroy();
    await swarm2.destroy();
  }).timeout(5_000);
});
