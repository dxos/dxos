//
// Copyright 2020 DXOS.org
//

import expect from 'expect';
import { Duplex } from 'stream';
import waitForExpect from 'wait-for-expect';

import { sleep } from '@dxos/async';
import { discoveryKey } from '@dxos/crypto';
import { PublicKey } from '@dxos/keys';
import { Protocol } from '@dxos/mesh-protocol';
import { afterTest } from '@dxos/testutils';

import { TestProtocolPlugin, testProtocolProvider } from '../testing';
import { WebRTCTransport } from './webrtc-transport';

describe('WebRTCTransport', function () {
  // This doesn't clean up correctly and crashes with SIGSEGV / SIGABRT at the end. Probably an issue with wrtc package.
  it('open and close', async function () {
    const connection = new WebRTCTransport(
      true,
      new Duplex(),
      PublicKey.random(),
      PublicKey.random(),
      PublicKey.random(),
      PublicKey.random(),
      async msg => {}
    );

    let callsCounter = 0;
    const closedCb = () => {
      callsCounter++;
    };
    connection.closed.once(closedCb);

    await sleep(10); // Let simple-peer process events.
    await connection.close();

    await sleep(1); // Process events.

    expect(callsCounter).toEqual(1);
  }).timeout(1_000).retries(3);

  it('establish connection and send data through with protocol', async function () {
    const topic = PublicKey.random();
    const peer1Id = PublicKey.random();
    const peer2Id = PublicKey.random();
    const sessionId = PublicKey.random();

    const plugin1 = new TestProtocolPlugin(peer1Id.asBuffer());
    const protocolProvider1 = testProtocolProvider(topic.asBuffer(), peer1Id.asBuffer(), plugin1);
    const connection1 = new WebRTCTransport(
      true,
      protocolProvider1({ channel: discoveryKey(topic), initiator: true }).stream,
      peer1Id,
      peer2Id,
      sessionId,
      topic,
      async msg => {
        await sleep(10);
        await connection2.signal(msg.data.signal);
      }
    );
    afterTest(() => connection1.close());
    afterTest(() => connection1.errors.assertNoUnhandledErrors());

    const plugin2 = new TestProtocolPlugin(peer2Id.asBuffer());
    const protocolProvider2 = testProtocolProvider(topic.asBuffer(), peer2Id.asBuffer(), plugin2);
    const connection2 = new WebRTCTransport(
      false,
      protocolProvider2({ channel: discoveryKey(topic), initiator: false }).stream,
      peer2Id,
      peer1Id,
      sessionId,
      topic,
      async msg => {
        await sleep(10);
        await connection1.signal(msg.data.signal);
      }
    );
    afterTest(() => connection2.close());
    afterTest(() => connection2.errors.assertNoUnhandledErrors());

    const received: any[] = [];
    const mockReceive = (p: Protocol, s: string) => {
      received.push(p, s);
      return undefined;
    };
    plugin1.on('receive', mockReceive);

    plugin2.on('connect', async (protocol) => {
      await plugin2.send(peer1Id.asBuffer(), '{"message": "Hello"}');
    });

    await waitForExpect(() => {
      expect(received.length).toBe(2);
      expect(received[0]).toBeInstanceOf(Protocol);
      expect(received[1]).toBe('{"message": "Hello"}');
    });
  }).timeout(2_000).retries(3);
});
