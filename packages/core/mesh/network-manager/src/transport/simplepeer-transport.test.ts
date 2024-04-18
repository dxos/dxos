//
// Copyright 2020 DXOS.org
//

import { Duplex } from 'stream';

import { sleep, TestStream } from '@dxos/async';
import { onTestFinished, describe, test } from 'vitest';

import { SimplePeerTransport } from './simplepeer-transport';

describe('SimplePeerTransport', () => {
  // This doesn't clean up correctly and crashes with SIGSEGV / SIGABRT at the end. Probably an issue with wrtc package.
  test(
    'open and close',
    async () => {
      const connection = new SimplePeerTransport({
        initiator: true,
        stream: new Duplex(),
        sendSignal: async () => {},
      });

      await connection.open();
      const wait = connection.closed.waitForCount(1);
      await connection.close();
      await wait;
    },
    { timeout: 1_000, retry: 3 },
  );

  test(
    'establish connection and send data through with protocol',
    async () => {
      const stream1 = new TestStream();
      const connection1 = new SimplePeerTransport({
        initiator: true,
        stream: stream1,
        sendSignal: async (signal) => {
          await sleep(10);
          await connection2.onSignal(signal);
        },
      });
      onTestFinished(() => connection1.close());
      onTestFinished(() => connection1.errors.assertNoUnhandledErrors());

      const stream2 = new TestStream();
      const connection2 = new SimplePeerTransport({
        initiator: false,
        stream: stream2,
        sendSignal: async (signal) => {
          await sleep(10);
          await connection1.onSignal(signal);
        },
      });
      onTestFinished(() => connection2.close());
      onTestFinished(() => connection2.errors.assertNoUnhandledErrors());

      await connection1.open();
      await connection2.open();

      await TestStream.assertConnectivity(stream1, stream2);
    },
    { timeout: 2_000, retry: 3 },
  );
});
