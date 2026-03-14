//
// Copyright 2020 DXOS.org
//

import { describe, expect, onTestFinished, test } from 'vitest';

import { TestStream, sleep } from '@dxos/async';
import { PublicKey } from '@dxos/keys';

import { type TransportOptions } from '../transport';

import { getRtcConnectionFactory } from './rtc-connection-factory';
import { RtcPeerConnection } from './rtc-peer-connection';
import { type RtcTransportChannel } from './rtc-transport-channel';
import { chooseInitiatorPeer } from './utils';

const connectionFactory = getRtcConnectionFactory();

// Segfault in node-datachannel.
describe.skip('RtcTransport', () => {
  test('channel open and close', async () => {
    const peer = await createConnection();
    const channel = createChannel(peer);

    await channel.open();
    const wait = channel.closed.waitForCount(1);
    await channel.close();
    await wait;

    expect(peer.connection.transportChannelCount).to.eq(0);
    await expect.poll(() => channel.isRtcChannelCreationInProgress).toBeFalsy();
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

    await expect.poll(() => anotherChannel.isRtcChannelCreationInProgress).toBeFalsy();
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
      // There's a race in libdatachannel between ice candidate gathering, connectivity checks and dtls connection
      // establishment, which seems to be 100% reproducible when there are only host candidates.
      // When there are no iceServers the first pair attempt starts too fast and gets interrupted by an arriving
      // remote candidate. Dtls has a retry backoff which starts with 1 second delay, so all tests finish in 1s+.
      if (signal.payload.data.type === 'candidate' && !isInitiator) {
        return;
      }
      void channel.onSignal(signal);
      if (options?.duplicateSignals) {
        void channel.onSignal(signal);
      }
    };
    let remoteChannel: RtcTransportChannel | undefined;
    let isInitiator = false;
    const signalBuffer: any[] = [];
    const sendSignal = async (signal: any) => {
      await sleep(10);
      if (remoteChannel) {
        deliverSignal(remoteChannel, signal);
      } else {
        signalBuffer.push(signal);
      }
    };
    const onChannelCreated = (channel: RtcTransportChannel, initiator: boolean) => {
      isInitiator = initiator;
      remoteChannel = channel;
      for (const signal of signalBuffer) {
        deliverSignal(channel, signal);
      }
    };
    return { sendSignal, onChannelCreated };
  };

  const createConnection = async (
    optionOverrides?: Partial<TransportOptions>,
    onChannelCreated: (channel: RtcTransportChannel, initiator: boolean) => void = () => {},
  ): Promise<TestSetup> => {
    const remotePeerKey = optionOverrides?.remotePeerKey ?? PublicKey.random().toHex();
    const ownPeerKey = optionOverrides?.ownPeerKey ?? PublicKey.random().toHex();
    const initiator = chooseInitiatorPeer(remotePeerKey, ownPeerKey) === ownPeerKey;
    const stream = new TestStream();
    const options: TransportOptions = {
      initiator,
      stream,
      sendSignal: async () => {},
      remotePeerKey,
      ownPeerKey,
      topic: PublicKey.random().toHex(),
      ...optionOverrides,
    };
    const connection = new RtcPeerConnection(connectionFactory, options);
    return { options, connection, stream, onChannelOpen: (channel) => onChannelCreated(channel, initiator) };
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
      await channel.close();
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
