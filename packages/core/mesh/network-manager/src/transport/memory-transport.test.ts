//
// Copyright 2021 DXOS.org
//

import { TestStream } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { afterTest, describe, test } from '@dxos/test';
import { range } from '@dxos/util';

import { MemoryTransport } from './memory-transport';

// TODO(burdon): Flaky test.
//  Cannot log after tests are done. Did you forget to wait for something async in your test?
//  Attempted to log "Ignoring unsupported ICE candidate.".

// TODO(burdon): Move to TestBuilder.
const createPair = () => {
  const topic = PublicKey.random();
  const peer1Id = PublicKey.random();
  const peer2Id = PublicKey.random();

  const stream1 = new TestStream();
  const connection1 = new MemoryTransport({
    stream: stream1,
    sendSignal: async (signal) => {
      await connection2.signal(signal);
    },
    initiator: true,
  });

  afterTest(() => connection1.close());
  afterTest(() => connection1.errors.assertNoUnhandledErrors());

  const stream2 = new TestStream();
  const connection2 = new MemoryTransport({
    stream: stream2,
    sendSignal: async (signal) => {
      await connection1.signal(signal);
    },
    initiator: false,
  });

  afterTest(() => connection2.close());
  afterTest(() => connection2.errors.assertNoUnhandledErrors());

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
    const { stream1, stream2 } = createPair();
    await TestStream.assertConnectivity(stream1, stream2);
  });

  test('10 pairs of peers connecting at the same time', async () => {
    await Promise.all(
      range(10).map(async () => {
        const { stream1, stream2 } = createPair();
        await TestStream.assertConnectivity(stream1, stream2);
      }),
    );
  });
});
