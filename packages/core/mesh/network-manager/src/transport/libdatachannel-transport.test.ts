//
// Copyright 2023 DXOS.org
//

import { Duplex } from 'stream';

import { sleep, TestStream } from '@dxos/async';
import { log } from '@dxos/log';
import { afterTest, describe, test } from '@dxos/test';

import { LibDataChannelTransport } from './libdatachannel-transport';
import { SimplePeerTransport } from './simplepeer-transport';

describe.only('LibDataChannelTransport', () => {
  test('open and close', async () => {
    const connection = new LibDataChannelTransport({
      initiator: true,
      stream: new Duplex(),
      sendSignal: async () => {},
    });

    await connection.open();
    const wait = connection.closed.waitForCount(1);
    await connection.close();
    await wait;
  })
    .onlyEnvironments('nodejs')
    .timeout(1_000)
    .retries(3);

  test('establish connection and send data through with protocol', async () => {
    const stream1 = new TestStream();
    const connection1 = new LibDataChannelTransport({
      initiator: true,
      stream: stream1,
      sendSignal: async (signal) => {
        await sleep(10);
        await connection2.signal(signal);
      },
    });
    await connection1.open();
    afterTest(() => connection1.close());
    afterTest(() => connection1.errors.assertNoUnhandledErrors());

    const stream2 = new TestStream();
    const connection2 = new LibDataChannelTransport({
      initiator: false,
      stream: stream2,
      sendSignal: async (signal) => {
        await sleep(10);
        await connection1.signal(signal);
      },
    });
    await connection2.open();
    afterTest(() => connection2.close());
    afterTest(() => connection2.errors.assertNoUnhandledErrors());

    await TestStream.assertConnectivity(stream1, stream2, { timeout: 2_000 });
  })
    .onlyEnvironments('nodejs')
    .timeout(2_000)
    .retries(3);

  test('establish connection between LibDataChannel and SimplePeer', async () => {
    const stream1 = new TestStream();
    const connection1 = new LibDataChannelTransport({
      initiator: true,
      stream: stream1,
      sendSignal: async (signal) => {
        log.debug('signal', signal);

        await sleep(10);
        await connection2.signal(signal);
      },
    });
    await connection1.open();
    afterTest(() => connection1.close());
    afterTest(() => connection1.errors.assertNoUnhandledErrors());

    const stream2 = new TestStream();
    const connection2 = new SimplePeerTransport({
      initiator: false,
      stream: stream2,
      sendSignal: async (signal) => {
        log.debug('signal', signal);

        await sleep(10);
        await connection1.signal(signal);
      },
    });
    await connection2.open();
    afterTest(() => connection2.close());
    afterTest(() => connection2.errors.assertNoUnhandledErrors());

    await TestStream.assertConnectivity(stream1, stream2, { timeout: 2_000 });
  })
    .onlyEnvironments('nodejs')
    .timeout(2_000)
    .retries(3);
});
