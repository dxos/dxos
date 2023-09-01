//
// Copyright 2020 DXOS.org
//

import { Duplex } from 'stream';

import { sleep, TestStream } from '@dxos/async';
import { afterTest, describe, test } from '@dxos/test';

import { SimplePeerTransport } from './simplepeer-transport';

describe('SimplePeerTransport', () => {
  // This doesn't clean up correctly and crashes with SIGSEGV / SIGABRT at the end. Probably an issue with wrtc package.
  test('open and close', async () => {
    const connection = new SimplePeerTransport({
      initiator: true,
      stream: new Duplex(),
      sendSignal: async () => {},
    });

    const wait = connection.closed.waitForCount(1);
    await connection.destroy();
    await wait;
  })
    .timeout(1_000)
    .retries(3);

  test('establish connection and send data through with protocol', async () => {
    const stream1 = new TestStream();
    const connection1 = new SimplePeerTransport({
      initiator: true,
      stream: stream1,
      sendSignal: async (signal) => {
        await sleep(10);
        await connection2.signal(signal);
      },
    });
    afterTest(() => connection1.destroy());
    afterTest(() => connection1.errors.assertNoUnhandledErrors());

    const stream2 = new TestStream();
    const connection2 = new SimplePeerTransport({
      initiator: false,
      stream: stream2,
      sendSignal: async (signal) => {
        await sleep(10);
        await connection1.signal(signal);
      },
    });
    afterTest(() => connection2.destroy());
    afterTest(() => connection2.errors.assertNoUnhandledErrors());

    await TestStream.assertConnectivity(stream1, stream2);
  })
    .timeout(2_000)
    .retries(3);
});
