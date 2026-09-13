//
// Copyright 2026 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import { type JsonObject } from '@bufbuild/protobuf';
import { Duplex } from 'node:stream';
import { describe, expect, onTestFinished, test } from 'vitest';

import { PublicKey } from '@dxos/keys';
import { SignalSchema } from '@dxos/protocols/buf/dxos/mesh/swarm_pb';

import { type TransportOptions } from '../transport.ts';
import { type RtcConnectionFactory } from './rtc-connection-factory.ts';
import { RtcPeerConnection } from './rtc-peer-connection.ts';
import { chooseInitiatorPeer } from './utils.ts';

describe('RtcPeerConnection', () => {
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
