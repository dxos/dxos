//
// Copyright 2026 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import { type JsonObject } from '@bufbuild/protobuf';
import { Duplex } from 'node:stream';
import { describe, expect, onTestFinished, test } from 'vitest';

import { sleep } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { SignalSchema } from '@dxos/protocols/buf/dxos/mesh/swarm_pb';

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
    expect(channel.binaryType).toBe('arraybuffer');
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
    expect(closedChannel.closed).toBe(true);

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

  test('an empty candidate is never added to the connection', async () => {
    const added: RTCIceCandidateInit[] = [];
    const { connection, peer } = createAnswerer();
    Object.assign(connection, {
      connectionState: 'new',
      setRemoteDescription: async () => {},
      createAnswer: async () => ({ type: 'answer', sdp: 'answer' }),
      setLocalDescription: async () => {},
      addIceCandidate: async (candidate: RTCIceCandidateInit) => {
        added.push(candidate);
      },
    });

    const transport = peer.createTransportChannel(createOptions('topic').options);
    onTestFinished(async () => {
      await transport.close();
    });
    await transport.open();
    await expect.poll(() => peer.currentConnection).toBe(connection);

    await peer.onSignal(createSignal({ type: 'offer', sdp: 'offer' }));
    await peer.onSignal(
      createSignal({ type: 'candidate', candidate: { candidate: '', sdpMLineIndex: '0', sdpMid: '0' } }),
    );
    const candidate = 'candidate:1 1 udp 2122260223 192.0.2.1 54321 typ host';
    await peer.onSignal(createSignal({ type: 'candidate', candidate: { candidate, sdpMLineIndex: '0', sdpMid: '0' } }));

    await expect.poll(() => added.map((init) => init.candidate)).toStrictEqual([candidate]);
  });

  test('a transport that closes while waiting leaves the replacement channel to its successor', async () => {
    const { connection, peer } = createAnswerer();

    const first = peer.createTransportChannel(createOptions('first').options);
    onTestFinished(async () => {
      await first.close();
    });
    await first.open();
    await expect.poll(() => peer.currentConnection).toBe(connection);

    const waiting = peer.createTransportChannel(createOptions('second').options);
    await waiting.open();
    // Its claim is pending before it gives up.
    await sleep(20);
    await waiting.close();

    const replacement = createChannel('second');
    connection.ondatachannel!({ channel: replacement } as any as RTCDataChannelEvent);
    replacement.deliver('handshake');

    const { options, delivered } = createOptions('second');
    const successor = peer.createTransportChannel(options);
    onTestFinished(async () => {
      await successor.close();
    });
    await successor.open();

    await expect.poll(() => delivered).toStrictEqual(['handshake']);
    expect(replacement.closed).toBe(false);
  });
});

const createSignal = (data: JsonObject) => create(SignalSchema, { payload: { data } });

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
    closed: false,
    // Leaves `readyState` alone, as node-datachannel does until its native close completes.
    close: () => {
      channel.closed = true;
    },
    send: () => {},
    /** Mirrors the browser: a message with no listener is gone. */
    deliver: (text: string) => channel.onmessage?.({ data: new TextEncoder().encode(text).buffer }),
  };
  return channel;
};
