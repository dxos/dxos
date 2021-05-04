//
// Copyright 2020 DXOS.org
//

import { expect, mockFn } from 'earljs';
import waitForExpect from 'wait-for-expect';

import { discoveryKey, PublicKey } from '@dxos/crypto';
import { Protocol } from '@dxos/protocol';
import { sleep } from '@dxos/util';

import { TestProtocolPlugin, testProtocolProvider } from '../testing/test-protocol';
import { afterTest } from '../testutils';
import { ConnectionState } from './connection';
import { WebrtcConnection } from './webrtc-connection';

describe('WebrtcConnection', () => {
  // This doesn't clean up correctly and crashes with SIGSEGV at the end. Probably an issue with wrtc package.
  test('open and close', async () => {
    const connection = new WebrtcConnection(
      true,
      new Protocol(),
      PublicKey.random(),
      PublicKey.random(),
      PublicKey.random(),
      PublicKey.random(),
      async msg => {}
    );
    expect(connection.state).toEqual(ConnectionState.INITIAL);

    connection.connect();

    expect(connection.state).toEqual(ConnectionState.INITIATING_CONNECTION);

    await sleep(10); // Let simple-peer process events
    await connection.close();

    expect(connection.state).toEqual(ConnectionState.CLOSED);
  });

  test('establish connection and send data through with protocol', async () => {
    const topic = PublicKey.random();
    const peer1Id = PublicKey.random();
    const peer2Id = PublicKey.random();
    const sessionId = PublicKey.random();

    const plugin1 = new TestProtocolPlugin(peer1Id.asBuffer());
    const protocolProvider1 = testProtocolProvider(topic.asBuffer(), peer1Id.asBuffer(), plugin1);
    const connection1 = new WebrtcConnection(
      true,
      protocolProvider1({ channel: discoveryKey(topic) }),
      peer1Id,
      peer2Id,
      sessionId,
      topic,
      async msg => {
        await sleep(10);
        await connection2.signal(msg);
      }
    );
    afterTest(() => connection1.close());
    afterTest(() => connection1.errors.assertNoUnhandledErrors());

    const plugin2 = new TestProtocolPlugin(peer2Id.asBuffer());
    const protocolProvider2 = testProtocolProvider(topic.asBuffer(), peer2Id.asBuffer(), plugin2);
    const connection2 = new WebrtcConnection(
      false,
      protocolProvider2({ channel: discoveryKey(topic) }),
      peer2Id,
      peer1Id,
      sessionId,
      topic,
      async msg => {
        await sleep(10);
        await connection1.signal(msg);
      }
    );
    afterTest(() => connection2.close());
    afterTest(() => connection2.errors.assertNoUnhandledErrors());

    connection1.connect();
    connection2.connect();

    expect(connection1.state).toEqual(ConnectionState.INITIATING_CONNECTION);
    expect(connection2.state).toEqual(ConnectionState.WAITING_FOR_CONNECTION);

    await Promise.all([
      connection1.stateChanged.waitFor(s => s === ConnectionState.CONNECTED),
      connection2.stateChanged.waitFor(s => s === ConnectionState.CONNECTED)
    ]);

    const mockReceive = mockFn<[Protocol, string]>().returns(undefined);
    plugin1.on('receive', mockReceive);

    plugin2.on('connect', async (protocol) => {
      plugin2.send(peer1Id.asBuffer(), 'Foo');
    });

    await waitForExpect(() => {
      expect(mockReceive).toHaveBeenCalledWith([expect.a(Protocol), 'Foo']);
    });
  }, 5_000);
});
