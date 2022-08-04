//
// Copyright 2022 DXOS.org
//
import { expect } from 'earljs';

import { Any, Stream } from '@dxos/codec-protobuf';
import { PublicKey } from '@dxos/protocols';
import { createTestBroker, TestBroker } from '@dxos/signal';

import { Message, SwarmEvent } from '../proto/gen/dxos/mesh/signal';
import { SignalRPCClient } from './signal-rpc-client';
import { Event } from '@dxos/async';

describe('SignalRPCClient', () => {
  let broker: TestBroker;

  before(async () => {
    broker = await createTestBroker();
  });

  after(async () => {
    await broker.stop();
  });

  const setup = async () => {
    const client = new SignalRPCClient(broker.url());
    return client;
  };

  it('signal between 2 peers', async () => {
    const client1 = await setup();
    const client2 = await setup();

    const peerId1 = PublicKey.random();
    const peerId2 = PublicKey.random();

    const stream1 = await client1.receiveMessages(peerId1);
    const message: Any = {
      'type_url': 'test',
      value: Uint8Array.from([1, 2, 3])
    };
    await client2.sendMessage(peerId2, peerId1, message);

    const received: Message = await new Promise(resolve => {
      stream1.subscribe(message => {
        resolve(message);
      }, (error) => {
        if (error) {
          console.log(error);
          throw error;
        }
      });
    });
    expect(received.author).toEqual(peerId2.asUint8Array());
    stream1.close();
  }).timeout(10000);

  it('join', async () => {
    const client1 = await setup();
    const client2 = await setup();

    const peerId1 = PublicKey.random();
    const peerId2 = PublicKey.random();
    const topic = PublicKey.random();

    const stream1 = await client1.join(topic, peerId1);
    const promise = new Promise<SwarmEvent>(resolve => {
      stream1.subscribe((event: SwarmEvent) => {
        if(peerId2.equals(event.peerAvailable?.peer!)) {
          resolve(event);
        }
      }, (error) => {
        if (error) {
          console.log(error);
          throw error;
        }
      });
    });
    const stream2 = await client2.join(topic, peerId2);

    expect((await promise).peerAvailable?.peer).toEqual(peerId2.asBuffer());
    stream1.close();
    stream2.close();
  }).timeout(10000);
});
