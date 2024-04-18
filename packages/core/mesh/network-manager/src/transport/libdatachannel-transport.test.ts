//
// Copyright 2023 DXOS.org
//

import { Duplex } from 'stream';

import { sleep, TestStream } from '@dxos/async';
import { log } from '@dxos/log';
import { onTestFinished, describe, test } from 'vitest';

import { LibDataChannelTransport } from './libdatachannel-transport';
import { SimplePeerTransport } from './simplepeer-transport';
import { inEnvironment } from '@dxos/test/testutils';

describe('LibDataChannelTransport', () => {
  test.runIf(inEnvironment('nodejs'))('open and close', { timeout: 1_000, retry: 3 }, async ({ task }) => {
    const connection = new LibDataChannelTransport({
      initiator: true,
      stream: new Duplex(),
      sendSignal: async () => {},
    });

    await connection.open();
    const wait = connection.closed.waitForCount(1);
    await connection.close();
    await wait;
  });

  test.runIf(inEnvironment('nodejs'))(
    'establish connection and send data through with protocol',
    { timeout: 2_000, retry: 3 },
    async () => {
      const stream1 = new TestStream();
      const connection1 = new LibDataChannelTransport({
        initiator: true,
        stream: stream1,
        sendSignal: async (signal) => {
          await sleep(10);
          await connection2.onSignal(signal);
        },
      });
      await connection1.open();
      onTestFinished(() => connection1.close());
      onTestFinished(() => connection1.errors.assertNoUnhandledErrors());

      const stream2 = new TestStream();
      const connection2 = new LibDataChannelTransport({
        initiator: false,
        stream: stream2,
        sendSignal: async (signal) => {
          await sleep(10);
          await connection1.onSignal(signal);
        },
      });
      await connection2.open();
      onTestFinished(() => connection2.close());
      onTestFinished(() => connection2.errors.assertNoUnhandledErrors());

      await TestStream.assertConnectivity(stream1, stream2, { timeout: 2_000 });
    },
  );

  test.runIf(inEnvironment('nodejs'))(
    'establish connection between LibDataChannel and SimplePeer',
    { timeout: 2_000, retry: 3 },
    async () => {
      const stream1 = new TestStream();
      const connection1 = new LibDataChannelTransport({
        initiator: true,
        stream: stream1,
        sendSignal: async (signal) => {
          log.debug('signal', signal);

          await sleep(10);
          await connection2.onSignal(signal);
        },
      });
      await connection1.open();
      onTestFinished(() => connection1.close());
      onTestFinished(() => connection1.errors.assertNoUnhandledErrors());

      const stream2 = new TestStream();
      const connection2 = new SimplePeerTransport({
        initiator: false,
        stream: stream2,
        sendSignal: async (signal) => {
          log.debug('signal', signal);

          await sleep(10);
          await connection1.onSignal(signal);
        },
      });
      await connection2.open();
      onTestFinished(() => connection2.close());
      onTestFinished(() => connection2.errors.assertNoUnhandledErrors());

      await TestStream.assertConnectivity(stream1, stream2, { timeout: 2_000 });
    },
  );
});
