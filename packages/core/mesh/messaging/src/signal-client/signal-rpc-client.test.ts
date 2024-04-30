//
// Copyright 2022 DXOS.org
//

import { expect } from 'earljs';

import { type Any } from '@dxos/codec-protobuf';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { schema } from '@dxos/protocols';
import { type Message as SignalMessage, type SwarmEvent } from '@dxos/protocols/proto/dxos/mesh/signal';
import { runTestSignalServer, type SignalServerRunner } from '@dxos/signal';
import { TaskContext, afterAll, beforeAll, describe, test } from 'vitest';

import { SignalRPCClient } from './signal-rpc-client';

describe('SignalRPCClient', () => {
  let broker: SignalServerRunner;

  beforeAll(async () => {
    broker = await runTestSignalServer();
  });

  afterAll(() => {
    void broker.stop();
  });

  // TODO(burdon): Convert to TestBuilder pattern.
  const setupClient = async (t: TaskContext) => {
    const client = new SignalRPCClient({ url: broker.url() });
    t.onTestFinished(async () => await client.close());
    return client;
  };

  test('signal between 2 peers', { timeout: 2_000, retry: 2 }, async (t) => {
    const client1 = await setupClient(t);
    const client2 = await setupClient(t);

    const peerId1 = PublicKey.random();
    const peerId2 = PublicKey.random();

    const stream1 = await client1.receiveMessages(peerId1);
    const payload: Any = {
      type_url: 'example.testing.data.TestPayload',
      value: schema.getCodecForType('example.testing.data.TestPayload').encode({ data: 'Some payload' }),
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
        },
      );
    });

    await client2.sendMessage({
      author: peerId2,
      recipient: peerId1,
      payload,
    });

    expect((await received).author).toEqual(peerId2.asUint8Array());
    expect((await received).payload).toBeAnObjectWith(payload);
    void stream1.close();
  });

  test('join', { timeout: 2_000, retry: 2 }, async (t) => {
    const client1 = await setupClient(t);
    const client2 = await setupClient(t);

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
        },
      );
    });
    const stream2 = await client2.join({ topic, peerId: peerId2 });

    expect((await promise).peerAvailable?.peer).toEqual(peerId2.asBuffer());
    void stream1.close();
    void stream2.close();
  });
});
