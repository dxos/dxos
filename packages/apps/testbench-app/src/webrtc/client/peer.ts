//
// Copyright 2024 DXOS.org
//

import { Event } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { DATA_CHANNEL_ID, DATA_CHANNEL_LABEL, STUN_ENDPOINT } from './defs';
import { SignalingClient } from './signaling';

/**
 * WebRTC Peer.
 */
export class Peer {
  private _signaling: SignalingClient;
  private _connection?: RTCPeerConnection;
  private _channel?: RTCDataChannel;
  private _makingOffer = false;

  public readonly update = new Event();

  constructor(public readonly id: PublicKey) {
    this._signaling = new SignalingClient(this.id);
  }

  get info() {
    return {
      ts: Date.now(),
      id: this.id.toHex(),
      signaling: this._signaling.info,
      // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection
      connection: this._connection && {
        connectionState: this._connection.connectionState,
        currentLocalDescription: this._connection.currentLocalDescription,
        currentRemoteDescription: this._connection.currentRemoteDescription,
        iceConnectionState: this._connection.iceConnectionState,
        iceGatheringState: this._connection.iceGatheringState,
        localDescription: this._connection.localDescription,
        remoteDescription: this._connection.remoteDescription,
        signalingState: this._connection.signalingState,
      },
      // https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel
      channel: this._channel && {
        binaryType: this._channel.binaryType,
        bufferedAmount: this._channel.bufferedAmount,
        id: this._channel.id,
        label: this._channel.label,
        maxPacketLifeTime: this._channel.maxPacketLifeTime,
        maxRetransmits: this._channel.maxRetransmits,
        negotiated: this._channel.negotiated,
        ordered: this._channel.ordered,
        protocol: this._channel.protocol,
        readyState: this._channel.readyState,
      },
      config: this._connection?.getConfiguration(),
    };
  }

  get connected() {
    return this._connection?.connectionState === 'connected';
  }

  async open(room = 'invitation', initiate = false) {
    await this.close();
    log.info('opening...', { room, initiate });

    //
    // Signaling.
    //

    const getPeer = () => this;

    // TODO(burdon): Should we keep open the signaling connection -- or only during invitations?
    await this._signaling.open(room, {
      async onDescription(description: RTCSessionDescription) {
        const { _connection, _signaling } = getPeer();
        if (_connection) {
          await _connection.setRemoteDescription(
            new RTCSessionDescription({ type: description.type, sdp: description.sdp }),
          );

          if (description.type === 'offer') {
            await _connection.setLocalDescription();
            _signaling.sendDescription(_connection.localDescription!);
          }
        }
      },

      async onIceCandidate(candidate: RTCIceCandidate) {
        const { _connection } = getPeer();
        if (_connection) {
          await _connection.addIceCandidate(candidate);
        }
      },
    });

    //
    // Peer connection.
    // https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Connectivity
    // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection
    //

    this._connection = new RTCPeerConnection({
      iceServers: [
        {
          urls: STUN_ENDPOINT,
        },
      ],
    });

    // Event handlers.
    // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection
    Object.assign<RTCPeerConnection, Partial<RTCPeerConnection>>(this._connection, {
      onnegotiationneeded: async (event) => {
        log.info('connection.onnegotiationneeded', { event });

        // TODO(burdon): Error handling.
        // https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation#implementing_perfect_negotiation
        if (initiate) {
          try {
            log.info('making offer...');
            this._makingOffer = true;
            await this._connection!.setLocalDescription();
            this._signaling.sendDescription(this._connection!.localDescription!);
          } catch (err) {
            log.catch(err);
          } finally {
            this._makingOffer = false;
          }
        }
      },
      onicecandidate: (event) => {
        log.info('connection.onicecandidate', { event });
        if (event.candidate) {
          this._signaling.sendIceCandidate(event.candidate);
        }
      },
      oniceconnectionstatechange: (event) => {
        log.info('connection.oniceconnectionstatechange', { event });
        this._connection?.restartIce();
      },
      onicecandidateerror: (event) => {
        log.warn('connection.onicecandidateerror', { event });
      },
      onconnectionstatechange: (event) => {
        log.info('connection.onconnectionstatechange', { state: this._connection?.connectionState });
        this.update.emit();
      },
      ondatachannel: (event: RTCDataChannelEvent) => {
        log.info('connection.ondatachannel', { event });
      },
    });

    //
    // Data channel.
    // https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Using_data_channels
    //

    log.info('creating channel...');
    this._channel = this._connection.createDataChannel(DATA_CHANNEL_LABEL, {
      id: DATA_CHANNEL_ID,
      negotiated: true,
    });

    Object.assign<RTCDataChannel, Partial<RTCDataChannel>>(this._channel, {
      onopen: (event) => {
        log.info('channel.onopen', { event });
        this.send({ sender: this.id, message: 'hello' });
      },
      onclose: (event) => {
        log.info('channel.onclose', { event });
      },
      onmessage: (event) => {
        const data = JSON.parse(event.data);
        log.info('channel.onmessage', { data });
      },
      onerror: (event) => {
        log.info('channel.onerror', { event });
      },
    });
  }

  async close() {
    await this._signaling.close();

    if (this._connection) {
      log.info('closing...');
      this._channel?.close();
      this._connection?.close();
      this._channel = undefined;
      this._connection = undefined;
    }
  }

  send(data: Object) {
    invariant(this.connected);
    this._channel?.send(JSON.stringify(data));
  }
}
