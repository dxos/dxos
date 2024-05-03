//
// Copyright 2024 DXOS.org
//

import { Event } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { DATA_CHANNEL_ID, DATA_CHANNEL_LABEL, STUN_ENDPOINT } from './defs';
import { SignalingClient } from './signaling-client';

/**
 * WebRTC Peer.
 */
export class Peer {
  private _signaler: SignalingClient;
  private _connection?: RTCPeerConnection;
  private _channel?: RTCDataChannel; // TODO(burdon): Multiple?

  private _makingOffer = false;
  private _ignoreOffer = false;

  public readonly error = new Event<Error>();
  public readonly update = new Event<{ state?: string }>();

  constructor(public readonly id: PublicKey) {
    this._signaler = new SignalingClient(this.id);
  }

  get info() {
    return {
      ts: Date.now(),
      id: this.id.toHex(),
      signaling: this._signaler.info,
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

  async open(swarmKey: PublicKey, initiating = false) {
    await this.close();
    log.info('opening...', { room: swarmKey, initiating });

    //
    // Signaling.
    //

    const getPeer = () => this;

    // TODO(burdon): Catch errors
    // TODO(burdon): Should we keep open the signaling connection -- or only during invitations?
    await this._signaler.open(swarmKey, {
      //
      async onDescription(description: RTCSessionDescription) {
        const peer = getPeer();
        if (peer._connection) {
          const offerCollision =
            description.type === 'offer' && (peer._makingOffer || peer._connection.signalingState !== 'stable');
          // TODO(burdon): Polite peer is either not initiating or connects to the signaling server last.
          peer._ignoreOffer = !initiating && offerCollision;
          if (peer._ignoreOffer) {
            return;
          }

          await peer._connection.setRemoteDescription(
            new RTCSessionDescription({ type: description.type, sdp: description.sdp }),
          );

          if (description.type === 'offer') {
            await peer._connection.setLocalDescription();
            peer._signaler.sendDescription(peer._connection.localDescription!);
          }
        }
      },

      // Share ICE candidates.
      async onIceCandidate(candidate: RTCIceCandidate) {
        const peer = getPeer();
        if (peer._connection) {
          try {
            await peer._connection.addIceCandidate(candidate);
          } catch (err) {
            if (!peer._ignoreOffer) {
              throw err;
            }
          }
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
      // During the initial setup of the connection and any time configuration is changed.
      // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/negotiationneeded_event
      onnegotiationneeded: async (event) => {
        log.info('connection.onnegotiationneeded', { event });

        // TODO(burdon): Consider separate invitation and connection processes.

        // https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation
        // Perfect negotiation works by assigning each of the two peers a role to play in the negotiation process:
        // A polite peer uses ICE rollback to prevent collisions with incoming offers.
        // An impolite peer, which always ignores incoming offers that collide with its own offers.
        // E.g., assign role via signaling server.
        if (initiating) {
          try {
            log.info('making offer...');
            this._makingOffer = true;
            await this._connection!.setLocalDescription();
            this._signaler.sendDescription(this._connection!.localDescription!);
          } catch (err) {
            log.catch(err);
          } finally {
            this._makingOffer = false;
          }
        }
      },

      // When ICE candidate identified (should be send to remote peer) and when ICE gathering finalized.
      // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/icecandidate_event
      onicecandidate: (event) => {
        log.info('connection.onicecandidate', { event });
        if (event.candidate) {
          this._signaler.sendIceCandidate(event.candidate);
        }
      },

      // When possible error during ICE gathering.
      // When possible error during ICE gathering.
      // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/iceconnectionstatechange_event
      oniceconnectionstatechange: (event) => {
        log.info('connection.oniceconnectionstatechange', { event });
        if (this._connection?.iceConnectionState === 'failed') {
          this.error.emit(new Error('Restarting ICE.'));
          this._connection?.restartIce();
        }
      },

      // @ts-ignore
      // When error occurs while performing ICE negotiations through a STUN or TURN server.
      // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/icecandidateerror_event
      onicecandidateerror: (event: RTCPeerConnectionIceErrorEvent) => {
        log.warn('connection.onicecandidateerror', { event });
        this.error.emit(new Error(`ICE candidate error: ${event.errorCode}`));
      },

      // When new track (or channel) is added.
      // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/connectionstatechange_event
      onconnectionstatechange: () => {
        log.info('connection.onconnectionstatechange', { connectionState: this._connection?.connectionState });
        this.update.emit({ state: this._connection?.connectionState });
        if (this._connection?.connectionState === 'failed') {
          this.error.emit(new Error('Connection failed.'));
        }
      },

      // When channel is added to connection.
      // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/datachannel_event
      ondatachannel: (event: RTCDataChannelEvent) => {
        log.info('connection.ondatachannel', { event });
      },
    });

    //
    // Data channel.
    // https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel
    // https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Using_data_channels
    //

    log.info('creating channel...');
    this._channel = this._connection.createDataChannel(DATA_CHANNEL_LABEL, {
      // TODO(burdon): Can support multiple channels per connection.
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
      // @ts-ignore
      // https://developer.mozilla.org/en-US/docs/Web/API/RTCErrorEvent
      onerror: (event: RTCErrorEvent) => {
        this.error.emit(event.error);
        log.info('channel.onerror', { event });
      },
    });
  }

  async close() {
    await this._signaler.close();

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
