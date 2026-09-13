//
// Copyright 2026 DXOS.org
//

import { Duplex } from 'node:stream';
import { describe, expect, onTestFinished, test } from 'vitest';

import { sleep } from '@dxos/async';
import { PublicKey } from '@dxos/keys';

import { type TransportOptions } from '../transport.ts';
import { type RtcConnectionFactory } from './rtc-connection-factory.ts';
import { RtcPeerConnection } from './rtc-peer-connection.ts';
import { chooseInitiatorPeer } from './utils.ts';

describe('RtcPeerConnection', () => {
  // A connection is shared across swarms, so a channel can arrive before this side has a transport for it.
  // The initiator's first frame on it is the only channel handshake its muxer sends.
  test('a frame that reaches a channel before a transport claims it is delivered', async () => {
    const { connection, peer } = createAnswerer();

    const first = peer.createTransportChannel(createOptions('first').options);
    onTestFinished(async () => {
      await first.close();
    });
    await first.open();
    await expect.poll(() => peer.currentConnection).toBe(connection);

    const channel = createChannel('second');
    connection.ondatachannel!({ channel } as any as RTCDataChannelEvent);
    channel.deliver('handshake');

    const { options, delivered } = createOptions('second');
    const second = peer.createTransportChannel(options);
    onTestFinished(async () => {
      await second.close();
    });
    await second.open();

    await expect.poll(() => delivered).toStrictEqual(['handshake']);
  });

  // The connection outlives a transport while another swarm still uses it, so a topic can be reopened
  // before the peer's replacement channel has arrived.
  test("a reopened topic waits for the peer's new channel rather than taking the closed one", async () => {
    const { connection, peer } = createAnswerer();

    const first = peer.createTransportChannel(createOptions('first').options);
    onTestFinished(async () => {
      await first.close();
    });
    await first.open();
    await expect.poll(() => peer.currentConnection).toBe(connection);

    const closedChannel = createChannel('second');
    connection.ondatachannel!({ channel: closedChannel } as any as RTCDataChannelEvent);
    const previous = peer.createTransportChannel(createOptions('second').options);
    await previous.open();
    await expect.poll(() => previous.isRtcChannelCreationInProgress).toBe(false);
    await previous.close();
    expect(closedChannel.readyState).toBe('closed');

    const { options, delivered } = createOptions('second');
    const reopened = peer.createTransportChannel(options);
    onTestFinished(async () => {
      await reopened.close();
    });
    await reopened.open();
    // The reopened transport claims its channel before the peer's replacement arrives.
    await sleep(20);

    const channel = createChannel('second');
    connection.ondatachannel!({ channel } as any as RTCDataChannelEvent);
    channel.deliver('handshake');

    await expect.poll(() => delivered).toStrictEqual(['handshake']);
  });
});

const createAnswerer = () => {
  const connection = { close: () => {} } as any as RTCPeerConnection;
  const factory: RtcConnectionFactory = {
    initialize: async () => {},
    createConnection: async () => connection,
    initConnection: async () => {},
    onConnectionDestroyed: async () => {},
  };
  const [a, b] = [PublicKey.random().toHex(), PublicKey.random().toHex()];
  const initiator = chooseInitiatorPeer(a, b);
  const peer = new RtcPeerConnection(factory, {
    ownPeerKey: initiator === a ? b : a,
    remotePeerKey: initiator,
    sendSignal: async () => {},
  });
  return { connection, peer };
};

const createOptions = (topic: string) => {
  const delivered: string[] = [];
  const stream = new Duplex({
    read: () => {},
    write: (chunk, _, callback) => {
      delivered.push(Buffer.from(chunk).toString());
      callback();
    },
  });
  return { delivered, options: { topic, stream } as any as TransportOptions };
};

/** Already open, as a channel announced by `ondatachannel` usually is. */
const createChannel = (label: string) => {
  const channel = {
    label,
    readyState: 'open' as RTCDataChannelState,
    binaryType: 'blob',
    onmessage: null as ((event: { data: unknown }) => void) | null,
    close: () => {
      channel.readyState = 'closed';
    },
    send: () => {},
    /** Mirrors the browser: a message with no listener is gone. */
    deliver: (text: string) => channel.onmessage?.({ data: new TextEncoder().encode(text).buffer }),
  };
  return channel;
};
