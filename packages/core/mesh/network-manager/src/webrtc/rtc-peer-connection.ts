//
// Copyright 2024 DXOS.org
//

import { synchronized, Trigger } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { log, logInfo } from '@dxos/log';
import { ConnectivityError } from '@dxos/protocols';
import { type Signal } from '@dxos/protocols/proto/dxos/mesh/swarm';
import { trace } from '@dxos/tracing';

import { type RtcConnectionFactory } from './rtc-connection-factory';
import { RtcTransportChannel } from './rtc-transport-channel';
import type { IceProvider } from '../signal';
import { type TransportOptions } from '../transport';

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
  private readonly _channels = new Map<string, RtcTransportChannel>();
  // A peer is ready to receive ICE candidates when local and remote description were set.
  private readonly _readyForCandidates = new Trigger();
  /**
   * Different from peer.connection.initiator.
   * If two connections to the same peer are created in we might be the initiator of the first,
   * but not of the other one.
   * Use a stable peer pair property (like key ordering) to decide who's initiating connection establishment
   * and data channel creation.
   */
  private readonly _initiator: boolean;

  /**
   * TODO(yaroslav): generate connection identifiers and include them into offer/answer/ice candidate messages
   * TODO(yaroslav): keep the remote connection ID to understand when a new connection was opened on the other side
   * peer1: openConnection, sendOffer, network disconnect, closeConnection
   * peer2: receiveOffer, sendAnswer
   * peer1: reconnect, openConnection, receiveAnswer, panic
   */
  private _connection?: RTCPeerConnection;

  constructor(
    private readonly _factory: RtcConnectionFactory,
    private readonly _options: RtcPeerChannelFactoryOptions,
  ) {
    this._initiator = _options.ownPeerKey < _options.remotePeerKey;
  }

  public get channelCount() {
    return this._channels.size;
  }

  public get currentConnection(): RTCPeerConnection | undefined {
    return this._connection;
  }

  public async createDataChannel(topic: string): Promise<RTCDataChannel> {
    const connection = await this._openConnection();
    if (this._initiator) {
      return connection.createDataChannel(topic);
    } else {
      return new Promise((resolve, reject) => {
        this._channelCreatedCallbacks.set(topic, { resolve, reject });
      });
    }
  }

  public createTransportChannel(options: TransportOptions): RtcTransportChannel {
    const channel = new RtcTransportChannel(this, options);
    this._channels.set(options.topic, channel);
    channel.closed.on(() => {
      this._channels.delete(options.topic);
      if (this._channels.size === 0) {
        void this._closeConnection();
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
      // Called when a data channel creation is requested, if connection wasn't established yet.
      // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/negotiationneeded_event
      onnegotiationneeded: async () => {
        if (connection !== this._connection) {
          log.warn('onnegotiationneeded called after a connection was destroyed');
          return;
        }
        log('onnegotiationneeded', { initiator: this._initiator });

        if (this._initiator) {
          try {
            const offer = await connection.createOffer();
            await connection.setLocalDescription(offer);
            await this._sendDescription(offer);
          } catch (err: any) {
            this._abortConnection(connection, err);
          }
        }
      },

      // When ICE candidate identified (should be sent to remote peer) and when ICE gathering finalized.
      // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/icecandidate_event
      onicecandidate: async (event) => {
        if (connection !== this._connection) {
          log.warn('onicecandidate called after a connection was destroyed');
          return;
        }

        if (event.candidate) {
          log('onicecandidate', { type: event.type });
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
          log.warn('oniceconnectionstatechange called after a connection was destroyed');
          return;
        }
        log('oniceconnectionstatechange');
        if (this._connection.iceConnectionState === 'failed') {
          this._abortConnection(connection, createIceFailureError(iceCandidateErrors));
        }
      },

      // When new track (or channel) is added.
      // State: { new, connecting, connected, disconnected, failed, closed }
      // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/connectionstatechange_event
      onconnectionstatechange: () => {
        if (connection !== this._connection) {
          log.warn('onconnectionstatechange called after a connection was destroyed');
          return;
        }
        log('onconnectionstatechange', { state: this._connection?.connectionState });
        if (connection.connectionState === 'failed') {
          this._abortConnection(connection, new Error('Connection failed.'));
        }
      },

      // When channel is added to connection.
      // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/datachannel_event
      ondatachannel: (event) => {
        if (connection !== this._connection) {
          log.warn('ondatachannel called after a connection was destroyed');
          return;
        }
        log('ondatachannel', { label: event.channel.label });
        const pendingCallback = this._channelCreatedCallbacks.get(event.channel.label);
        if (pendingCallback) {
          this._channelCreatedCallbacks.delete(event.channel.label);
          pendingCallback.resolve(event.channel);
        }
      },
    });

    this._connection = connection;
    this._readyForCandidates.reset();
    return this._connection;
  }

  @synchronized
  private _abortConnection(connection: RTCPeerConnection, error: Error) {
    if (connection !== this._connection) {
      log.error('attempted to abort an inactive connection', { error });
      return;
    }
    log('aborting...');
    for (const [topic, pendingCallback] of this._channelCreatedCallbacks.entries()) {
      pendingCallback.reject(error);
      this._channels.delete(topic);
    }
    this._channelCreatedCallbacks.clear();
    for (const channel of this._channels.values()) {
      channel.onConnectionError(error);
    }
    this._channels.clear();
    this._safeResetConnection();
    log('connection aborted');
  }

  @synchronized
  private _closeConnection() {
    invariant(this._channels.size === 0);
    if (this._connection) {
      log('closing connection...');
      this._safeResetConnection();
      log('connection closed');
    }
  }

  @synchronized
  public async onSignal(signal: Signal) {
    const connection = this._connection;
    if (!connection) {
      log.warn('signal ignored because connection was closed', { type: signal.payload.data.type });
      return;
    }

    const data = signal.payload.data;
    switch (data.type) {
      case 'offer': {
        if (connection.connectionState !== 'new') {
          log.error('received offer but peer not in state new', { peer: this._connection });
          this._abortConnection(
            connection,
            new Error('invalid signalling state: received offer when peer is not in state new'),
          );
          break;
        }

        try {
          await connection.setRemoteDescription({ type: data.type, sdp: data.sdp });
          const answer = await connection.createAnswer();
          await connection.setLocalDescription(answer);
          await this._sendDescription(answer);
          this._onSessionNegotiated(connection);
        } catch (err) {
          log.error('cannot handle offer from signalling server', { err });
          this._abortConnection(connection, new Error('error handling offer'));
        }
        break;
      }

      case 'answer':
        try {
          await connection.setRemoteDescription({ type: data.type, sdp: data.sdp });
          this._onSessionNegotiated(connection);
        } catch (err) {
          log.error('cannot handle answer from signalling server', { err });
          this._abortConnection(connection, new Error('error handling answer'));
        }
        break;

      case 'candidate':
        log.info('onIceCandidate', { candidate: data.candidate.candidate });
        try {
          // ICE candidates are associated with a session, so we need to wait for the remote description to be set.
          await this._readyForCandidates.wait();
          await connection.addIceCandidate(data.candidate.candidate);
        } catch (err) {
          log.catch(err);
        }
        break;

      default:
        log.error('unknown signal type', { type: data.type, signal });
        this._abortConnection(connection, new Error(`unknown signal type ${data.type}`));
    }
  }

  private _onSessionNegotiated(connection: RTCPeerConnection) {
    if (connection === this._connection) {
      this._readyForCandidates.wake();
    } else {
      log.warn('session was negotiated after connection became inactive');
    }
  }

  private _safeResetConnection(connection: RTCPeerConnection | undefined = this._connection) {
    const resetFields = connection === this._connection;
    try {
      this._connection?.close();
    } catch (err) {
      log.catch(err);
    }
    if (resetFields) {
      this._connection = undefined;
      this._readyForCandidates.wake();
    }
  }

  private async _loadConnectionConfig() {
    const config = { ...this._options.webrtcConfig };
    const providedIceServers = (await this._options.iceProvider?.getIceServers()) ?? [];
    if (providedIceServers.length > 0) {
      config.iceServers = [...(config.iceServers ?? []), ...providedIceServers];
    }
    return config;
  }

  private async _sendIceCandidate(candidate: RTCIceCandidate) {
    try {
      await this._options.sendSignal({
        payload: {
          data: {
            type: 'candidate',
            candidate: {
              ...candidate,
              // These fields never seem to be not null, but connecting to Chrome doesn't work if they are.
              sdpMLineIndex: candidate.sdpMLineIndex ?? 0,
              sdpMid: candidate.sdpMid ?? 0,
            },
          },
        },
      });
    } catch (err) {
      log.warn('signaling error', { err });
    }
  }

  private async _sendDescription(description: RTCSessionDescriptionInit) {
    // Type is 'offer' | 'answer'.
    const data = { type: description.type, sdk: description.sdp };
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
      channels: [...this._channels.keys()].map((topic) => topic),
      config: this._connection?.getConfiguration(),
    };
  }

  @logInfo
  private get _loggerContext() {
    return {
      ownPeerKey: this._options.ownPeerKey,
      remotePeerKey: this._options.remotePeerKey,
      channels: this._channels.size,
    };
  }
}

type IceCandidateErrorDetails = { url: string; errorCode: number; errorText: string };

const createIceFailureError = (details: IceCandidateErrorDetails[]) => {
  const candidateErrors = details.map(({ url, errorCode, errorText }) => `${errorCode} ${url}: ${errorText}`);
  return new ConnectivityError(`ICE failed:\n${candidateErrors.join('\n')}`);
};

type ChannelCreatedCallback = {
  resolve: (channel: RTCDataChannel) => void;
  reject: (reason?: any) => void;
};
