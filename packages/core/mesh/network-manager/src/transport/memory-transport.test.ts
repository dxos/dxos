//
// Copyright 2021 DXOS.org
//

import { TestStream } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { onTestFinished, describe, test } from 'vitest'
import { range } from '@dxos/util';

import { MemoryTransport } from './memory-transport';

// TODO(burdon): Flaky test.
//  Cannot log after tests are done. Did you forget to wait for something async in your test?
//  Attempted to log "Ignoring unsupported ICE candidate.".

// TODO(burdon): Move to TestBuilder.
const createPair = async () => {
  const topic = PublicKey.random();
  const peer1Id = PublicKey.random();
  const peer2Id = PublicKey.random();

  const stream1 = new TestStream();
  const connection1 = new MemoryTransport({
    stream: stream1,
    sendSignal: async (signal) => {
      await connection2.onSignal(signal);
    },
    initiator: true,
  });

  onTestFinished(() => connection1.close());
  onTestFinished(() => connection1.errors.assertNoUnhandledErrors());

  const stream2 = new TestStream();
  const connection2 = new MemoryTransport({
    stream: stream2,
    sendSignal: async (signal) => {
      await connection1.onSignal(signal);
    },
    initiator: false,
  });

  onTestFinished(() => connection2.close());
  onTestFinished(() => connection2.errors.assertNoUnhandledErrors());

  await connection1.open();
  await connection2.open();

  return {
    connection1,
    connection2,
    stream1,
    stream2,
    peer1Id,
    peer2Id,
    topic,
  };
};

describe('MemoryTransport', () => {
  test('establish connection and send data through with protocol', async () => {
    const { stream1, stream2 } = await createPair();
    await TestStream.assertConnectivity(stream1, stream2);
  });

  test('10 pairs of peers connecting at the same time', async () => {
    await Promise.all(
      range(10).map(async () => {
        const { stream1, stream2 } = await createPair();
        await TestStream.assertConnectivity(stream1, stream2);
      }),
    );
  });
});
