//
// Copyright 2020 DXOS.org
//

import expect from 'expect';
import { Duplex } from 'stream';

import { sleep, TestStream } from '@dxos/async';
import { afterTest, describe, test } from '@dxos/test';

import { WebRTCTransport } from './webrtc-transport';

describe('WebRTCTransport', () => {
  // This doesn't clean up correctly and crashes with SIGSEGV / SIGABRT at the end. Probably an issue with wrtc package.
  test('open and close', async () => {
    const connection = new WebRTCTransport({
      initiator: true,
      stream: new Duplex(),
      sendSignal: async () => {}
    });

    let callsCounter = 0;
    const closedCb = () => {
      callsCounter++;
    };

    connection.closed.once(closedCb);
    await sleep(10); // Let simple-peer process events.
    await connection.destroy();

    await sleep(10); // Process events.
    expect(callsCounter).toEqual(1);
  })
    .timeout(1_000)
    .retries(3);

  test('establish connection and send data through with protocol', async () => {
    const stream1 = new TestStream();
    const connection1 = new WebRTCTransport({
      initiator: true,
      stream: stream1,
      sendSignal: async (signal) => {
        await sleep(10);
        await connection2.signal(signal);
      }
    });
    afterTest(() => connection1.destroy());
    afterTest(() => connection1.errors.assertNoUnhandledErrors());

    const stream2 = new TestStream();
    const connection2 = new WebRTCTransport({
      initiator: false,
      stream: stream2,
      sendSignal: async (signal) => {
        await sleep(10);
        await connection1.signal(signal);
      }
    });
    afterTest(() => connection2.destroy());
    afterTest(() => connection2.errors.assertNoUnhandledErrors());

    await TestStream.assertConnectivity(stream1, stream2);
  })
    .timeout(2_000)
    .retries(3);
});
