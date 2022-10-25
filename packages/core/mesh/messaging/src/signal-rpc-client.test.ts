//
// Copyright 2022 DXOS.org
//

import { expect } from 'earljs';

import { Any } from '@dxos/codec-protobuf';
import { PublicKey } from '@dxos/keys';
import {
  Message as SignalMessage,
  SwarmEvent
} from '@dxos/protocols/proto/dxos/mesh/signal';
import { createTestBroker, TestBroker } from '@dxos/signal';

import { SignalRPCClient } from './signal-rpc-client';

describe('SignalRPCClient', function () {
  let broker: TestBroker;

  before(async function () {
    broker = await createTestBroker();
  });

  after(function () {
    broker.stop();
  });

  const setupClient = async () => {
    const client = new SignalRPCClient(broker.url());
    return client;
  };

  it('signal between 2 peers', async function () {
    const client1 = await setupClient();
    const client2 = await setupClient();

    const peerId1 = PublicKey.random();
    const peerId2 = PublicKey.random();

    const stream1 = await client1.receiveMessages(peerId1);
    const message: Any = {
      type_url: 'test',
      value: Uint8Array.from([1, 2, 3])
    };

    await client2.sendMessage({
      author: peerId2,
      recipient: peerId1,
      payload: message
    });

    const received: SignalMessage = await new Promise((resolve) => {
      stream1.subscribe(
        (message) => {
          resolve(message);
        },
        (error) => {
          if (error) {
            console.log(error);
            throw error;
          }
        }
      );
    });
    expect(received.author).toEqual(peerId2.asUint8Array());
    stream1.close();
  }).timeout(10000);

  it('join', async function () {
    const client1 = await setupClient();
    const client2 = await setupClient();

    const peerId1 = PublicKey.random();
    const peerId2 = PublicKey.random();
    const topic = PublicKey.random();

    const stream1 = await client1.join({ topic, peerId: peerId1 });
    const promise = new Promise<SwarmEvent>((resolve) => {
      stream1.subscribe(
        (event: SwarmEvent) => {
          // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
          if (peerId2.equals(event.peerAvailable?.peer!)) {
            resolve(event);
          }
        },
        (error: any) => {
          if (error) {
            console.log(error);
            throw error;
          }
        }
      );
    });
    const stream2 = await client2.join({ topic, peerId: peerId2 });

    expect((await promise).peerAvailable?.peer).toEqual(peerId2.asBuffer());
    stream1.close();
    stream2.close();
  }).timeout(10000);
});
