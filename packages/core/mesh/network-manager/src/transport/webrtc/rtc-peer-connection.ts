//
// Copyright 2024 DXOS.org
//

import { Mutex, Trigger, synchronized } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { log, logInfo } from '@dxos/log';
import { ConnectivityError } from '@dxos/protocols';
import { type Signal } from '@dxos/protocols/proto/dxos/mesh/swarm';
import { trace } from '@dxos/tracing';

import type { IceProvider } from '../../signal';
import { type TransportOptions } from '../transport';

import { type RtcConnectionFactory } from './rtc-connection-factory';
import { RtcTransportChannel } from './rtc-transport-channel';
import { areSdpEqual, chooseInitiatorPeer } from './utils';

export type RtcPeerChannelFactoryOptions = {
  ownPeerKey: string;
  remotePeerKey: string;
  /**
   * Sends signal message to remote peer.
   */
  sendSignal: (signal: Signal) => Promise<void>;

  // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/RTCPeerConnection#iceservers
  webrtcConfig?: RTCConfiguration;
  iceProvider?: IceProvider;

  /**
   * TODO: remove after the new rtc code rollout. Used for staging interop with older version running in prod.
   */
  legacyInitiator?: boolean;
};

/**
 * A factory for rtc Transport implementations for a particular peer.
 * Contains WebRTC connection establishment logic.
 * When the first Transport is opened a connection is established and kept until all the transports are closed.
 */
@trace.resource()
export class RtcPeerConnection {
  // A peer who is not the initiator waits for another party to open a channel.
  private readonly _channelCreatedCallbacks = new Map<string, ChannelCreatedCallback>();
  // Channels indexed by topic.
  private readonly _transportChannels = new Map<string, RtcTransportChannel>();
  private readonly _dataChannels = new Map<string, RTCDataChannel>();
  // A peer is ready to receive ICE candidates when local and remote description were set.
  private readonly _readyForCandidates = new Trigger();

  private readonly _offerProcessingMutex = new Mutex();

  /**
   * Can't use peer.connection.initiator, because if two connections to the same peer are created in
   * different swarms, we might be the initiator of the first one, but not of the other one.
   * Use a stable peer keypair property (key ordering) to decide who's acting as the initiator of
   * transport connection establishment and data channel creation.
   */
  private readonly _initiator: boolean;

  private _connection?: RTCPeerConnection;

  constructor(
    private readonly _factory: RtcConnectionFactory,
    private readonly _options: RtcPeerChannelFactoryOptions,
  ) {
    this._initiator = chooseInitiatorPeer(_options.ownPeerKey, _options.remotePeerKey) === _options.ownPeerKey;
  }

  public get transportChannelCount() {
    return this._transportChannels.size;
  }

  public get currentConnection(): RTCPeerConnection | undefined {
    return this._connection;
  }

  public async createDataChannel(topic: string): Promise<RTCDataChannel> {
    const connection = await this._openConnection();
    if (!this._transportChannels.has(topic)) {
      if (!this._transportChannels.size) {
        void this._lockAndCloseConnection();
      }
      throw new Error('Transport closed while connection was being open');
    }
    if (this._initiator) {
      const channel = connection.createDataChannel(topic);
      this._dataChannels.set(topic, channel);
      return channel;
    } else {
      const existingChannel = this._dataChannels.get(topic);
      if (existingChannel) {
        return existingChannel;
      }
      log('waiting for initiator-peer to open a data channel');
      return new Promise((resolve, reject) => {
        this._channelCreatedCallbacks.set(topic, { resolve, reject });
      });
    }
  }

  public createTransportChannel(options: TransportOptions): RtcTransportChannel {
    const channel = new RtcTransportChannel(this, options);
    this._transportChannels.set(options.topic, channel);
    channel.closed.on(() => {
      this._transportChannels.delete(options.topic);
      if (this._transportChannels.size === 0) {
        void this._lockAndCloseConnection();
      }
    });
    return channel;
  }

  @synchronized
  private async _openConnection(): Promise<RTCPeerConnection> {
    if (this._connection) {
      return this._connection;
    }

    log('initializing connection...', () => ({ remotePeer: this._options.remotePeerKey }));

    const config = await this._loadConnectionConfig();

    //
    // Peer connection.
    // https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Connectivity
    // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection
    //
    const connection = await this._factory.createConnection(config);

    const iceCandidateErrors: IceCandidateErrorDetails[] = [];

    Object.assign<RTCPeerConnection, Partial<RTCPeerConnection>>(connection, {
      onnegotiationneeded: async () => {
        invariant(this._initiator);

        if (connection !== this._connection) {
          this._onConnectionCallbackAfterClose('onnegotiationneeded', connection);
          return;
        }

        log('onnegotiationneeded');
        try {
          const offer = await connection.createOffer();
          await connection.setLocalDescription(offer);
          await this._sendDescription(connection, offer);
        } catch (err: any) {
          void this._lockAndAbort(connection, err);
        }
      },

      // When ICE candidate identified (should be sent to remote peer) and when ICE gathering finalized.
      // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/icecandidate_event
      onicecandidate: async (event) => {
        if (connection !== this._connection) {
          this._onConnectionCallbackAfterClose('onicecandidate', connection);
          return;
        }

        if (event.candidate) {
          log('onicecandidate', { candidate: event.candidate.candidate });
          await this._sendIceCandidate(event.candidate);
        } else {
          log('onicecandidate gathering complete');
        }
      },

      // When error occurs while performing ICE negotiations through a STUN or TURN server.
      // It's ok for some candidates to fail if a working pair is eventually found.
      // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/icecandidateerror_event
      onicecandidateerror: (event: any) => {
        const { url, errorCode, errorText } = event as RTCPeerConnectionIceErrorEvent;
        iceCandidateErrors.push({ url, errorCode, errorText });
      },

      // When possible error during ICE gathering.
      // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/iceconnectionstatechange_event
      oniceconnectionstatechange: () => {
        if (connection !== this._connection) {
          this._onConnectionCallbackAfterClose('oniceconnectionstatechange', connection);
          return;
        }

        log('oniceconnectionstatechange', { state: connection.iceConnectionState });
        if (connection.iceConnectionState === 'failed') {
          void this._lockAndAbort(connection, createIceFailureError(iceCandidateErrors));
        }
      },

      // When new track (or channel) is added.
      // State: { new, connecting, connected, disconnected, failed, closed }
      // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/connectionstatechange_event
      onconnectionstatechange: () => {
        if (connection !== this._connection) {
          if (connection.connectionState !== 'closed' && connection.connectionState !== 'failed') {
            this._onConnectionCallbackAfterClose('onconnectionstatechange', connection);
          }
          return;
        }

        log('onconnectionstatechange', { state: connection.connectionState });
        if (connection.connectionState === 'failed') {
          void this._lockAndAbort(connection, new Error('Connection failed.'));
        }
      },

      onsignalingstatechange: () => {
        log('onsignalingstatechange', { state: connection.signalingState });
      },

      // When channel is added to connection.
      // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/datachannel_event
      ondatachannel: (event) => {
        invariant(!this._initiator, 'Initiator is expected to create data channels.');

        if (connection !== this._connection) {
          this._onConnectionCallbackAfterClose('ondatachannel', connection);
          return;
        }

        log('ondatachannel', { label: event.channel.label });
        this._dataChannels.set(event.channel.label, event.channel);
        const pendingCallback = this._channelCreatedCallbacks.get(event.channel.label);
        if (pendingCallback) {
          this._channelCreatedCallbacks.delete(event.channel.label);
          pendingCallback.resolve(event.channel);
        }
      },
    });

    this._connection = connection;
    this._readyForCandidates.reset();

    await this._factory.initConnection(connection, { initiator: this._initiator });

    return this._connection;
  }

  @synchronized
  private async _lockAndAbort(connection: RTCPeerConnection, error: Error): Promise<void> {
    this._abortConnection(connection, error);
  }

  private _abortConnection(connection: RTCPeerConnection, error: Error): void {
    if (connection !== this._connection) {
      log.error('attempted to abort an inactive connection', { error });
      this._safeCloseConnection(connection);
      return;
    }
    for (const [topic, pendingCallback] of this._channelCreatedCallbacks.entries()) {
      pendingCallback.reject(error);
      this._transportChannels.delete(topic);
    }
    this._channelCreatedCallbacks.clear();
    for (const channel of this._transportChannels.values()) {
      channel.onConnectionError(error);
    }
    this._transportChannels.clear();
    this._safeCloseConnection();
    log('connection aborted', { reason: error.message });
  }

  @synchronized
  private async _lockAndCloseConnection(): Promise<void> {
    invariant(this._transportChannels.size === 0);
    if (this._connection) {
      this._safeCloseConnection();
      log('connection closed');
    }
  }

  @synchronized
  public async onSignal(signal: Signal): Promise<void> {
    const connection = this._connection;
    if (!connection) {
      log.warn('a signal ignored because the connection was closed', { type: signal.payload.data.type });
      return;
    }

    const data = signal.payload.data;
    switch (data.type) {
      case 'offer': {
        await this._offerProcessingMutex.executeSynchronized(async () => {
          if (isRemoteDescriptionSet(connection, data)) {
            return;
          }
          if (connection.connectionState !== 'new') {
            this._abortConnection(connection, new Error(`Received an offer in ${connection.connectionState}.`));
            return;
          }

          try {
            await connection.setRemoteDescription({ type: data.type, sdp: data.sdp });
            const answer = await connection.createAnswer();
            await connection.setLocalDescription(answer);
            await this._sendDescription(connection, answer);
            this._onSessionNegotiated(connection);
          } catch (err) {
            this._abortConnection(connection, new Error('Error handling a remote offer.', { cause: err }));
          }
        });
        break;
      }

      case 'answer':
        await this._offerProcessingMutex.executeSynchronized(async () => {
          try {
            if (isRemoteDescriptionSet(connection, data)) {
              return;
            }
            if (connection.signalingState !== 'have-local-offer') {
              this._abortConnection(
                connection,
                new Error(`Unexpected answer from remote peer, signalingState was ${connection.signalingState}.`),
              );
              return;
            }
            await connection.setRemoteDescription({ type: data.type, sdp: data.sdp });
            this._onSessionNegotiated(connection);
          } catch (err) {
            this._abortConnection(connection, new Error('Error handling a remote answer.', { cause: err }));
          }
        });
        break;

      case 'candidate':
        void this._processIceCandidate(connection, data.candidate);
        break;

      default:
        this._abortConnection(connection, new Error(`Unknown signal type ${data.type}.`));
        break;
    }

    log('signal processed', { type: data.type });
  }

  private async _processIceCandidate(connection: RTCPeerConnection, candidate: RTCIceCandidate): Promise<void> {
    try {
      // ICE candidates are associated with a session, so we need to wait for the remote description to be set.
      await this._readyForCandidates.wait();
      if (connection === this._connection) {
        log('adding ice candidate', { candidate });
        await connection.addIceCandidate(candidate);
      }
    } catch (err) {
      log.catch(err);
    }
  }

  private _onSessionNegotiated(connection: RTCPeerConnection): void {
    if (connection === this._connection) {
      log('ready to process ice candidates');
      this._readyForCandidates.wake();
    } else {
      log.warn('session was negotiated after connection became inactive');
    }
  }

  private _onConnectionCallbackAfterClose(callback: string, connection: RTCPeerConnection): void {
    log.warn('callback invoked after a connection was destroyed, this is probably a bug', {
      callback,
      state: connection.connectionState,
    });
    this._safeCloseConnection(connection);
  }

  private _safeCloseConnection(connection: RTCPeerConnection | undefined = this._connection): void {
    const resetFields = this._connection && connection === this._connection;
    try {
      connection?.close();
    } catch (err) {
      log.catch(err);
    }
    if (resetFields) {
      this._connection = undefined;
      this._dataChannels.clear();
      this._readyForCandidates.wake();
      void this._factory.onConnectionDestroyed().catch((err) => log.catch(err));
      for (const [_, pendingCallback] of this._channelCreatedCallbacks.entries()) {
        pendingCallback.reject('Connection closed.');
      }
      this._channelCreatedCallbacks.clear();
    }
  }

  private async _loadConnectionConfig() {
    const config = { ...this._options.webrtcConfig };
    try {
      const providedIceServers = (await this._options.iceProvider?.getIceServers()) ?? [];
      if (providedIceServers.length > 0) {
        config.iceServers = [...(config.iceServers ?? []), ...providedIceServers];
      }
    } catch (error) {
      log.catch(error);
    }
    return config;
  }

  private async _sendIceCandidate(candidate: RTCIceCandidate): Promise<void> {
    try {
      await this._options.sendSignal({
        payload: {
          data: {
            type: 'candidate',
            candidate: {
              candidate: candidate.candidate,
              // These fields never seem to be not null, but connecting to Chrome doesn't work if they are.
              sdpMLineIndex: candidate.sdpMLineIndex ?? '0',
              sdpMid: candidate.sdpMid ?? '0',
            },
          },
        },
      });
    } catch (err) {
      log.warn('signaling error', { err });
    }
  }

  private async _sendDescription(connection: RTCPeerConnection, description: RTCSessionDescriptionInit): Promise<void> {
    if (connection !== this._connection) {
      // Connection was closed while description was being created.
      return;
    }
    // Type is 'offer' | 'answer'.
    const data = { type: description.type, sdp: description.sdp };
    await this._options.sendSignal({ payload: { data } });
  }

  @trace.info()
  protected get _connectionInfo() {
    const connectionInfo = this._connection && {
      connectionState: this._connection.connectionState,
      iceConnectionState: this._connection.iceConnectionState,
      iceGatheringState: this._connection.iceGatheringState,
      signalingState: this._connection.signalingState,
      remoteDescription: this._connection.remoteDescription,
      localDescription: this._connection.localDescription,
    };
    return {
      ...connectionInfo,
      ts: Date.now(),
      remotePeerKey: this._options.remotePeerKey,
      channels: [...this._transportChannels.keys()].map((topic) => topic),
      config: this._connection?.getConfiguration(),
    };
  }

  @logInfo
  private get _loggerContext() {
    return {
      ownPeerKey: this._options.ownPeerKey,
      remotePeerKey: this._options.remotePeerKey,
      initiator: this._initiator,
      channels: this._transportChannels.size,
    };
  }
}

const isRemoteDescriptionSet = (connection: RTCPeerConnection, data: { type: string; sdp: string }) => {
  if (!connection.remoteDescription?.type || connection.remoteDescription?.type !== data.type) {
    return false;
  }
  return areSdpEqual(connection.remoteDescription.sdp, data.sdp);
};

type IceCandidateErrorDetails = { url: string; errorCode: number; errorText: string };

const createIceFailureError = (details: IceCandidateErrorDetails[]) => {
  const candidateErrors = details.map(({ url, errorCode, errorText }) => `${errorCode} ${url}: ${errorText}`);
  return new ConnectivityError({ message: `ICE failed:\n${candidateErrors.join('\n')}` });
};

type ChannelCreatedCallback = {
  resolve: (channel: RTCDataChannel) => void;
  reject: (reason?: any) => void;
};
