//
// Copyright 2026 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import { type JsonObject } from '@bufbuild/protobuf';
import { describe, expect, onTestFinished, test } from 'vitest';

import { PublicKey } from '@dxos/keys';
import { SignalSchema } from '@dxos/protocols/buf/dxos/mesh/swarm_pb';

import { type TransportOptions } from '../transport.ts';
import { type RtcConnectionFactory } from './rtc-connection-factory.ts';
import { RtcPeerConnection } from './rtc-peer-connection.ts';
import { chooseInitiatorPeer } from './utils.ts';

describe('RtcPeerConnection', () => {
  test('an empty candidate is never added to the connection', async () => {
    const { connection, peer, options } = createAnswerer('topic');

    const transport = peer.createTransportChannel(options);
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

    await expect.poll(() => connection.addedCandidates.map((init) => init.candidate)).toStrictEqual([candidate]);
  });
});

const createSignal = (data: JsonObject) => create(SignalSchema, { payload: { data } });

const unsupported = (): never => {
  throw new Error('Not supported by FakePeerConnection.');
};

/** Answers any offer without a network and records the candidates it is given. */
class FakePeerConnection extends EventTarget implements RTCPeerConnection {
  readonly addedCandidates: RTCIceCandidateInit[] = [];

  readonly canTrickleIceCandidates = null;
  readonly connectionState: RTCPeerConnectionState = 'new';
  readonly currentLocalDescription = null;
  readonly currentRemoteDescription = null;
  readonly iceConnectionState: RTCIceConnectionState = 'new';
  readonly iceGatheringState: RTCIceGatheringState = 'new';
  readonly localDescription = null;
  readonly pendingLocalDescription = null;
  readonly pendingRemoteDescription = null;
  readonly remoteDescription = null;
  readonly sctp = null;
  readonly signalingState: RTCSignalingState = 'stable';

  onconnectionstatechange = null;
  ondatachannel = null;
  onicecandidate = null;
  onicecandidateerror = null;
  oniceconnectionstatechange = null;
  onicegatheringstatechange = null;
  onnegotiationneeded = null;
  onsignalingstatechange = null;
  ontrack = null;

  addTrack = unsupported;
  addTransceiver = unsupported;
  createDataChannel = unsupported;
  createOffer = unsupported;
  getConfiguration = unsupported;
  getReceivers = unsupported;
  getSenders = unsupported;
  getStats = unsupported;
  getTransceivers = unsupported;
  removeTrack = unsupported;
  restartIce = unsupported;
  setConfiguration = unsupported;

  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    this.addedCandidates.push(candidate);
  }

  close(): void {}

  createAnswer(): Promise<RTCSessionDescriptionInit>;
  createAnswer(
    successCallback: RTCSessionDescriptionCallback,
    failureCallback: RTCPeerConnectionErrorCallback,
  ): Promise<void>;
  async createAnswer(): Promise<RTCSessionDescriptionInit | void> {
    return { type: 'answer', sdp: 'answer' };
  }

  async setLocalDescription(): Promise<void> {}

  async setRemoteDescription(): Promise<void> {}
}

const createAnswerer = (topic: string) => {
  const connection = new FakePeerConnection();
  const factory: RtcConnectionFactory = {
    initialize: async () => {},
    createConnection: async () => connection,
    initConnection: async () => {},
    onConnectionDestroyed: async () => {},
  };
  const [a, b] = [PublicKey.random().toHex(), PublicKey.random().toHex()];
  const remotePeerKey = chooseInitiatorPeer(a, b);
  const ownPeerKey = remotePeerKey === a ? b : a;
  const sendSignal = async () => {};
  const peer = new RtcPeerConnection(factory, { ownPeerKey, remotePeerKey, sendSignal });
  const options: TransportOptions = {
    ownPeerKey,
    remotePeerKey,
    topic,
    initiator: false,
    stream: { readable: new ReadableStream<Uint8Array>(), writable: new WritableStream<Uint8Array>() },
    sendSignal,
  };
  return { connection, peer, options };
};
