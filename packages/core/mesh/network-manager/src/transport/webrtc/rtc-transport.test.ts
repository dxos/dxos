//
// Copyright 2020 DXOS.org
//

import { expect } from 'chai';

import { sleep, TestStream } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { afterTest, describe, test } from '@dxos/test';

import { getRtcConnectionFactory } from './rtc-connection-factory';
import { RtcPeerConnection } from './rtc-peer-connection';
import { type TransportOptions } from '../transport';

const connectionFactory = getRtcConnectionFactory();

describe('RtcPeerConnection', () => {
  test('channel open and close', async () => {
    const peer = await createConnection({ initiator: true });
    const channel = createChannel(peer);

    await channel.open();
    const wait = channel.closed.waitForCount(1);
    await channel.close();
    await wait;

    expect(peer.connection.transportChannelCount).to.eq(0);
  });

  test('establish connection and send data through with protocol', async () => {
    const peer1 = await createConnection({
      initiator: true,
      sendSignal: async (signal) => {
        await sleep(10);
        await channel2.onSignal(signal);
      },
    });
    const channel1 = createChannel(peer1);

    const peer2 = await createConnection({
      ownPeerKey: peer1.options.remotePeerKey,
      remotePeerKey: peer1.options.ownPeerKey,
      topic: peer1.options.topic,
      sendSignal: async (signal) => {
        await sleep(10);
        await channel1.onSignal(signal);
      },
    });
    const channel2 = createChannel(peer2);

    await channel1.open();
    await channel2.open();

    await TestStream.assertConnectivity(peer1.stream, peer2.stream, { timeout: 1500 });
  });

  const createConnection = async (optionOverrides: Partial<TransportOptions>): Promise<TestSetup> => {
    const stream = new TestStream();
    const options: TransportOptions = {
      initiator: false,
      stream,
      sendSignal: async () => {},
      remotePeerKey: PublicKey.random().toHex(),
      ownPeerKey: PublicKey.random().toHex(),
      topic: PublicKey.random().toHex(),
      ...optionOverrides,
    };
    const connection = new RtcPeerConnection(connectionFactory, options);
    return { options, connection, stream };
  };

  const createChannel = (args: TestSetup) => {
    const channel = args.connection.createTransportChannel(args.options);
    afterTest(async () => {
      if (channel.isOpen) {
        await channel.close();
      }
    });
    return channel;
  };
});

type TestSetup = {
  stream: TestStream;
  connection: RtcPeerConnection;
  options: TransportOptions;
};
