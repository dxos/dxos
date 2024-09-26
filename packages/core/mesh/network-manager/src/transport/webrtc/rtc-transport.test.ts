//
// Copyright 2020 DXOS.org
//

import { onTestFinished, describe, expect, test } from 'vitest';

import { sleep, TestStream } from '@dxos/async';
import { PublicKey } from '@dxos/keys';

import { getRtcConnectionFactory } from './rtc-connection-factory';
import { RtcPeerConnection } from './rtc-peer-connection';
import { type RtcTransportChannel } from './rtc-transport-channel';
import { handleChannelErrors } from './test-utils';
import { chooseInitiatorPeer } from './utils';
import { type TransportOptions } from '../transport';

const connectionFactory = getRtcConnectionFactory();

describe('RtcTransport', () => {
  test('channel open and close', async () => {
    const peer = await createConnection();
    const channel = createChannel(peer);

    await channel.open();
    const wait = channel.closed.waitForCount(1);
    await channel.close();
    await wait;

    expect(peer.connection.transportChannelCount).to.eq(0);
    await sleep(5);
    expect(channel.isRtcChannelCreationInProgress).toBeFalsy();
  });

  test('establish connection and send data through with protocol', async () => {
    const { initiator, another } = await createConnectedPeers();
    const initiatorChannel = createChannel(initiator);
    const anotherChannel = createChannel(another);

    await initiatorChannel.open();
    await anotherChannel.open();

    await TestStream.assertConnectivity(initiator.stream, another.stream, { timeout: 1500 });
  });

  test('initiator opens a channel before another peer', async () => {
    const { initiator, another } = await createConnectedPeers();
    const initiatorChannel = createChannel(initiator);
    const anotherChannel = createChannel(another);

    await initiatorChannel.open();
    await sleep(50);
    await anotherChannel.open();

    await TestStream.assertConnectivity(initiator.stream, another.stream, { timeout: 1500 });
  });

  test('initiator opens a channel after another peer', async () => {
    const { initiator, another } = await createConnectedPeers();
    const initiatorChannel = createChannel(initiator);
    const anotherChannel = createChannel(another);

    await anotherChannel.open();
    await sleep(50);
    await initiatorChannel.open();

    await TestStream.assertConnectivity(initiator.stream, another.stream, { timeout: 1500 });
  });

  test('signal delivery idempotency', async () => {
    const { initiator, another } = await createConnectedPeers({ duplicateSignals: true });
    const initiatorChannel = createChannel(initiator);
    const anotherChannel = createChannel(another);

    await anotherChannel.open();
    await sleep(50);
    await initiatorChannel.open();

    await TestStream.assertConnectivity(initiator.stream, another.stream, { timeout: 1500 });
  });

  test('initiator closes before connectivity is established', async () => {
    const { initiator, another } = await createConnectedPeers();
    const initiatorChannel = createChannel(initiator);
    const anotherChannel = createChannel(another);

    const errors = handleChannelErrors(anotherChannel);

    await initiatorChannel.open();
    await sleep(20);
    await anotherChannel.open();
    await initiatorChannel.close();

    initiatorChannel.errors.assertNoUnhandledErrors();
    anotherChannel.errors.assertNoUnhandledErrors();
  });

  test('initiator opens a channel after another peer closed it', async () => {
    const { initiator, another } = await createConnectedPeers({ duplicateSignals: true });
    const initiatorChannel = createChannel(initiator);
    const anotherChannel = createChannel(another);

    await anotherChannel.open();
    await sleep(20);
    await anotherChannel.close();
    await initiatorChannel.open();
    await initiatorChannel.close();

    expect(anotherChannel.isRtcChannelCreationInProgress).toBeFalsy();
    initiatorChannel.errors.assertNoUnhandledErrors();
    anotherChannel.errors.assertNoUnhandledErrors();
  });

  const createConnectedPeers = async (options?: { duplicateSignals?: boolean }) => {
    const peer1Signal = createSignalSender(options);
    const peer2Signal = createSignalSender(options);

    const peer1 = await createConnection({ sendSignal: peer1Signal.sendSignal }, peer2Signal.onChannelCreated);
    const peer2 = await createConnection(
      {
        ownPeerKey: peer1.options.remotePeerKey,
        remotePeerKey: peer1.options.ownPeerKey,
        topic: peer1.options.topic,
        sendSignal: peer2Signal.sendSignal,
      },
      peer1Signal.onChannelCreated,
    );

    return chooseInitiator(peer1, peer2);
  };

  const createSignalSender = (options?: { duplicateSignals?: boolean }) => {
    const deliverSignal = (channel: RtcTransportChannel, signal: any) => {
      void channel.onSignal(signal);
      if (options?.duplicateSignals) {
        void channel.onSignal(signal);
      }
    };
    let remoteChannel: RtcTransportChannel | undefined;
    const signalBuffer: any[] = [];
    const sendSignal = async (signal: any) => {
      await sleep(10);
      if (remoteChannel) {
        deliverSignal(remoteChannel, signal);
      } else {
        signalBuffer.push(signal);
      }
    };
    const onChannelCreated = (channel: RtcTransportChannel): void => {
      remoteChannel = channel;
      for (const signal of signalBuffer) {
        deliverSignal(channel, signal);
      }
    };
    return { sendSignal, onChannelCreated };
  };

  const createConnection = async (
    optionOverrides?: Partial<TransportOptions>,
    onChannelCreated: (channel: RtcTransportChannel) => void = () => {},
  ): Promise<TestSetup> => {
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
    return { options, connection, stream, onChannelOpen: onChannelCreated };
  };

  const chooseInitiator = (peer1: TestSetup, peer2: TestSetup) => {
    const [initiator, another] =
      chooseInitiatorPeer(peer1.options.ownPeerKey, peer2.options.ownPeerKey) === peer1.options.ownPeerKey
        ? [peer1, peer2]
        : [peer2, peer1];
    return { initiator, another };
  };

  const createChannel = (args: TestSetup) => {
    const channel = args.connection.createTransportChannel(args.options);
    const originalOpen = channel.open.bind(channel);
    (channel as any).open = async () => {
      await originalOpen();
      args.onChannelOpen(channel);
    };
    onTestFinished(async () => {
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
  onChannelOpen: (channel: RtcTransportChannel) => void;
};
