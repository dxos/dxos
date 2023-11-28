//
// Copyright 2023 DXOS.org
//

import node, { type SelectedCandidateInfo } from 'node-datachannel';
import defer, { type DeferredPromise } from 'p-defer';

import { DataChannel } from './rtc-data-channel';
import { DataChannelEvent, PeerConnectionIceEvent } from './rtc-events';
import { IceCandidate } from './rtc-ice-candidate';
import { SessionDescription } from './rtc-session-description';

export class PeerConnection extends EventTarget implements RTCPeerConnection {
  static async generateCertificate(keygenAlgorithm: AlgorithmIdentifier): Promise<RTCCertificate> {
    throw new Error('Not implemented');
  }

  canTrickleIceCandidates: boolean | null;
  sctp: RTCSctpTransport | null;

  onconnectionstatechange: ((this: RTCPeerConnection, ev: Event) => any) | null;
  ondatachannel: ((this: RTCPeerConnection, ev: RTCDataChannelEvent) => any) | null;
  onicecandidate: ((this: RTCPeerConnection, ev: RTCPeerConnectionIceEvent) => any) | null;
  onicecandidateerror: ((this: RTCPeerConnection, ev: Event) => any) | null;
  oniceconnectionstatechange: ((this: RTCPeerConnection, ev: Event) => any) | null;
  onicegatheringstatechange: ((this: RTCPeerConnection, ev: Event) => any) | null;
  onnegotiationneeded: ((this: RTCPeerConnection, ev: Event) => any) | null;
  onsignalingstatechange: ((this: RTCPeerConnection, ev: Event) => any) | null;
  ontrack: ((this: RTCPeerConnection, ev: RTCTrackEvent) => any) | null;

  #peerConnection: node.PeerConnection;
  #config: RTCConfiguration;
  #localOffer: DeferredPromise<RTCSessionDescriptionInit>;
  #localAnswer: DeferredPromise<RTCSessionDescriptionInit>;
  #dataChannels: Set<DataChannel>;

  constructor(init: RTCConfiguration = {}) {
    super();

    this.#config = init;
    this.#localOffer = defer();
    this.#localAnswer = defer();
    this.#dataChannels = new Set();

    const iceServers = init.iceServers ?? [];

    this.#peerConnection = new node.PeerConnection(`peer-${Math.random()}`, {
      // convert https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/RTCPeerConnection#iceservers to the format expected by https://github.com/murat-dogan/node-datachannel/blob/master/src/peer-connection-wrapper.cpp#L101
      iceServers: iceServers
        .map((server) => {
          const urls = Array.isArray(server.urls) ? server.urls : [server.urls];

          return urls.map((url) => {
            if (server.username && server.credential) {
              const [protocol, rest] = url.split(/:(.*)/);
              return `${protocol}:${server.username}:${server.credential}@${rest}`;
            }
            return url;
          });
        })
        .flat(),
      iceTransportPolicy: init?.iceTransportPolicy,
    });

    this.#peerConnection.onStateChange(() => {
      this.dispatchEvent(new Event('connectionstatechange'));
    });
    // https://github.com/murat-dogan/node-datachannel/pull/171
    // this.#peerConnection.onSignalingStateChange(() => {
    //  this.dispatchEvent(new Event('signalingstatechange'))
    // })
    this.#peerConnection.onGatheringStateChange(() => {
      this.dispatchEvent(new Event('icegatheringstatechange'));
    });
    this.#peerConnection.onDataChannel((channel) => {
      this.dispatchEvent(new DataChannelEvent(new DataChannel(channel)));
    });

    // forward events to properties
    this.addEventListener('connectionstatechange', (event) => {
      this.onconnectionstatechange?.(event);
    });
    this.addEventListener('signalingstatechange', (event) => {
      this.onsignalingstatechange?.(event);
    });
    this.addEventListener('icegatheringstatechange', (event) => {
      this.onicegatheringstatechange?.(event);
    });
    this.addEventListener('datachannel', (event) => {
      this.ondatachannel?.(event as RTCDataChannelEvent);
    });

    this.#peerConnection.onLocalDescription((sdp, type) => {
      if (type === 'offer') {
        this.#localOffer.resolve({
          sdp,
          type,
        });
      }

      if (type === 'answer') {
        this.#localAnswer.resolve({
          sdp,
          type,
        });
      }
    });

    this.#peerConnection.onLocalCandidate((candidate, mid) => {
      if (mid === 'unspec') {
        this.#localAnswer.reject(new Error(`Invalid description type ${mid}`));
        return;
      }

      const event = new PeerConnectionIceEvent(new IceCandidate({ candidate }));

      this.onicecandidate?.(event);
    });

    this.canTrickleIceCandidates = null;
    this.sctp = null;
    this.onconnectionstatechange = null;
    this.ondatachannel = null;
    this.onicecandidate = null;
    this.onicecandidateerror = null;
    this.oniceconnectionstatechange = null;
    this.onicegatheringstatechange = null;
    this.onnegotiationneeded = null;
    this.onsignalingstatechange = null;
    this.ontrack = null;
  }

  get connectionState(): RTCPeerConnectionState {
    return assertState(this.#peerConnection.state(), RTCPeerConnectionStates);
  }

  get iceConnectionState(): RTCIceConnectionState {
    return assertState(this.#peerConnection.state(), RTCIceConnectionStates);
  }

  get iceGatheringState(): RTCIceGatheringState {
    return assertState(this.#peerConnection.gatheringState(), RTCIceGatheringStates);
  }

  get signalingState(): RTCSignalingState {
    return assertState(this.#peerConnection.signalingState(), RTCSignalingStates);
  }

  get currentLocalDescription(): RTCSessionDescription | null {
    return toSessionDescription(this.#peerConnection.localDescription());
  }

  get localDescription(): RTCSessionDescription | null {
    return toSessionDescription(this.#peerConnection.localDescription());
  }

  get pendingLocalDescription(): RTCSessionDescription | null {
    return toSessionDescription(this.#peerConnection.localDescription());
  }

  get currentRemoteDescription(): RTCSessionDescription | null {
    // not exposed by node-datachannel
    console.log("node-datachannel doesn't expose currentRemoteDescription");
    return toSessionDescription(null);
  }

  get pendingRemoteDescription(): RTCSessionDescription | null {
    // not exposed by node-datachannel
    console.log("node-datachannel doesn't expose pendingRemoteDescription");
    return toSessionDescription(null);
  }

  get remoteDescription(): RTCSessionDescription | null {
    // not exposed by node-datachannel
    console.log("node-datachannel doesn't expose remoteDescription");
    return toSessionDescription(null);
  }

  async addIceCandidate(candidate?: RTCIceCandidateInit): Promise<void> {
    if (candidate == null || candidate.candidate == null) {
      throw new Error('Candidate invalid');
    }

    this.#peerConnection.addRemoteCandidate(candidate.candidate, candidate.sdpMid ?? '0');
  }

  getSelectedCandidatePair(): { local: SelectedCandidateInfo; remote: SelectedCandidateInfo } | null {
    return this.#peerConnection.getSelectedCandidatePair();
  }

  addTrack(track: MediaStreamTrack, ...streams: MediaStream[]): RTCRtpSender {
    throw new Error('addTrack Not implemented');
  }

  addTransceiver(trackOrKind: MediaStreamTrack | string, init?: RTCRtpTransceiverInit): RTCRtpTransceiver {
    throw new Error('addTransciever Not implemented');
  }

  close(): void {
    // close all channels before shutting down
    this.#dataChannels.forEach((channel) => {
      channel.close();
    });

    this.#peerConnection.close();
    this.#peerConnection.destroy();
  }

  bytesSent(): number {
    return this.#peerConnection.bytesSent();
  }

  bytesReceived(): number {
    return this.#peerConnection.bytesReceived();
  }

  createDataChannel(label: string, dataChannelDict: RTCDataChannelInit = {}): RTCDataChannel {
    const channel = this.#peerConnection.createDataChannel(label, dataChannelDict);
    const dataChannel = new DataChannel(channel, dataChannelDict);

    // ensure we can close all channels when shutting down
    this.#dataChannels.add(dataChannel);
    dataChannel.addEventListener('close', () => {
      this.#dataChannels.delete(dataChannel);
    });

    return dataChannel;
  }

  async createOffer(options?: RTCOfferOptions): Promise<RTCSessionDescriptionInit>;
  async createOffer(
    successCallback: RTCSessionDescriptionCallback,
    failureCallback: RTCPeerConnectionErrorCallback,
    options?: RTCOfferOptions,
  ): Promise<void>;

  async createOffer(...args: any[]): Promise<any> {
    return this.#localOffer.promise;
  }

  async createAnswer(options?: RTCAnswerOptions): Promise<RTCSessionDescriptionInit>;
  async createAnswer(
    successCallback: RTCSessionDescriptionCallback,
    failureCallback: RTCPeerConnectionErrorCallback,
  ): Promise<void>;

  async createAnswer(...args: any[]): Promise<any> {
    return this.#localAnswer.promise;
  }

  getConfiguration(): RTCConfiguration {
    return this.#config;
  }

  getReceivers(): RTCRtpReceiver[] {
    throw new Error('getReceivers Not implemented');
  }

  getSenders(): RTCRtpSender[] {
    throw new Error('getSenders Not implemented');
  }

  async getStats(selector?: MediaStreamTrack | null): Promise<RTCStatsReport> {
    throw new Error('getStats Not implemented');
  }

  getTransceivers(): RTCRtpTransceiver[] {
    throw new Error('getTranscievers Not implemented');
  }

  removeTrack(sender: RTCRtpSender): void {
    throw new Error('removeTrack Not implemented');
  }

  restartIce(): void {
    throw new Error('restartIce Not implemented');
  }

  setConfiguration(configuration: RTCConfiguration = {}): void {
    this.#config = configuration;
  }

  async setLocalDescription(description?: RTCLocalSessionDescriptionInit): Promise<void> {
    if (description == null || description.type == null) {
      throw new Error('Local description type must be set');
    }

    if (description.type !== 'offer') {
      console.log(`node-datachannel: setLocalDescription: only offer is supported, not ${description.type}`);
      // any other type causes libdatachannel to throw
      return;
    }

    // @ts-expect-error types are wrong
    this.#peerConnection.setLocalDescription(description.type);
  }

  async setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void> {
    if (description.sdp == null) {
      throw new Error('Remote SDP must be set');
    }

    // @ts-expect-error types are wrong
    this.#peerConnection.setRemoteDescription(description.sdp, description.type);
  }
}

export { PeerConnection as RTCPeerConnection };

const assertState = <T>(state: any, states: T[]): T => {
  if (state != null && !states.includes(state)) {
    throw new Error(`Invalid value encountered - "${state}" must be one of ${states}`);
  }

  return state as T;
};

const toSessionDescription = (description: { sdp?: string; type: string } | null): RTCSessionDescription | null => {
  if (description == null) {
    return null;
  }

  return new SessionDescription({
    sdp: description.sdp,
    type: assertState(description.type, RTCSdpTypes),
  });
};

const RTCPeerConnectionStates: RTCPeerConnectionState[] = [
  'closed',
  'connected',
  'connecting',
  'disconnected',
  'failed',
  'new',
];
const RTCSdpTypes: RTCSdpType[] = ['answer', 'offer', 'pranswer', 'rollback'];
const RTCIceConnectionStates: RTCIceConnectionState[] = [
  'checking',
  'closed',
  'completed',
  'connected',
  'disconnected',
  'failed',
  'new',
];
const RTCIceGatheringStates: RTCIceGatheringState[] = ['complete', 'gathering', 'new'];
const RTCSignalingStates: RTCSignalingState[] = [
  'closed',
  'have-local-offer',
  'have-local-pranswer',
  'have-remote-offer',
  'have-remote-pranswer',
  'stable',
];
