//
// Copyright 2022 DXOS.org
//

import { expect } from 'earljs';

import { Any } from '@dxos/codec-protobuf';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { schema } from '@dxos/protocols';
import { Message as SignalMessage, SwarmEvent } from '@dxos/protocols/proto/dxos/mesh/signal';
import { createTestBroker, TestBroker } from '@dxos/signal';
import { afterAll, afterTest, beforeAll, describe, test } from '@dxos/test';

import { SignalRPCClient } from './signal-rpc-client';

describe('SignalRPCClient', () => {
  let broker: TestBroker;

  beforeAll(async () => {
    broker = await createTestBroker();
  });

  afterAll(() => {
    broker.stop();
  });

  const setupClient = async () => {
    const client = new SignalRPCClient(broker.url());
    afterTest(async () => await client.close());
    return client;
  };

  test('signal between 2 peers', async () => {
    const client1 = await setupClient();
    const client2 = await setupClient();

    const peerId1 = PublicKey.random();
    const peerId2 = PublicKey.random();

    const stream1 = await client1.receiveMessages(peerId1);
    const payload: Any = {
      type_url: 'example.testing.data.TestPayload',
      value: schema.getCodecForType('example.testing.data.TestPayload').encode({ data: 'Some payload' })
    };

    const received: Promise<SignalMessage> = new Promise((resolve) => {
      stream1.subscribe(
        (message) => {
          resolve(message);
        },
        (error) => {
          if (error) {
            log.catch(error);
            throw error;
          }
        }
      );
    });

    await client2.sendMessage({
      author: peerId2,
      recipient: peerId1,
      payload
    });

    expect((await received).author).toEqual(peerId2.asUint8Array());
    expect((await received).payload).toBeAnObjectWith(payload);
    stream1.close();
  }).timeout(2_000);

  test('join', async () => {
    const client1 = await setupClient();
    const client2 = await setupClient();

    const peerId1 = PublicKey.random();
    const peerId2 = PublicKey.random();
    const topic = PublicKey.random();

    const stream1 = await client1.join({ topic, peerId: peerId1 });
    const promise = new Promise<SwarmEvent>((resolve) => {
      stream1.subscribe(
        (event: SwarmEvent) => {
          if (event.peerAvailable && peerId2.equals(event.peerAvailable.peer!)) {
            resolve(event);
          }
        },
        (error: any) => {
          if (error) {
            log.error(error);
            throw error;
          }
        }
      );
    });
    const stream2 = await client2.join({ topic, peerId: peerId2 });

    expect((await promise).peerAvailable?.peer).toEqual(peerId2.asBuffer());
    stream1.close();
    stream2.close();
  }).timeout(2_000);
});
