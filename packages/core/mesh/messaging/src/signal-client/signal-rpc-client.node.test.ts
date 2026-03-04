//
// Copyright 2022 DXOS.org
//

import { afterAll, beforeAll, describe, expect, onTestFinished, test } from 'vitest';

import { type Any, anyPack, AnySchema } from '@dxos/protocols/buf';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { create, toBinary } from '@dxos/protocols/buf';
import { type Message as SignalMessage } from '@dxos/protocols/buf/dxos/mesh/signal_pb';
import { TestPayloadSchema } from '@dxos/protocols/buf/example/testing/data_pb';
import { type SignalServerRunner, runTestSignalServer } from '@dxos/signal';

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
  const setupClient = async () => {
    const client = new SignalRPCClient({ url: broker.url() });
    onTestFinished(async () => await client.close());
    return client;
  };

  test('signal between 2 peers', { timeout: 2_000 }, async () => {
    const client1 = await setupClient();
    const client2 = await setupClient();

    const peerId1 = PublicKey.random();
    const peerId2 = PublicKey.random();

    const stream1 = await client1.receiveMessages(peerId1);
    const payload: Any = anyPack(TestPayloadSchema, create(TestPayloadSchema, { data: 'Some payload' }));
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

    const msg = await received;
    expect(PublicKey.from(msg.author)).toEqual(peerId2);
    expect(msg.payload?.typeUrl).toEqual('example.testing.data.TestPayload');
    expect(new Uint8Array(msg.payload!.value)).toEqual(new Uint8Array(payload.value));
    void stream1.close();
  });

  test('join', { timeout: 2_000 }, async () => {
    const client1 = await setupClient();
    const client2 = await setupClient();

    const peerId1 = PublicKey.random();
    const peerId2 = PublicKey.random();
    const topic = PublicKey.random();

    const stream1 = await client1.join({ topic, peerId: peerId1 });
    const promise = new Promise<any>((resolve) => {
      stream1.subscribe(
        (event: any) => {
          if (event.event?.case === 'peerAvailable' && peerId2.equals(event.event.value.peer)) {
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

    const result = await promise;
    expect(result.event.case).toEqual('peerAvailable');
    expect(PublicKey.from(result.event.value.peer)).toEqual(peerId2);
    void stream1.close();
    void stream2.close();
  });
});
