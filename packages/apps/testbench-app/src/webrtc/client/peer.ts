//
// Copyright 2024 DXOS.org
//

import { Event } from '@dxos/async';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { DATA_CHANNEL_ID, DATA_CHANNEL_LABEL, STUN_ENDPOINT } from './defs';
import { SignalingClient } from './signaling';

// TODO(burdon): Remove event handlers.
// TODO(burdon): Use invitation/discovery key as room.

/**
 * WebRTC Peer.
 */
export class Peer {
  private signaling: SignalingClient;
  private connection?: RTCPeerConnection;
  private channel?: RTCDataChannel;
  private makingOffer = false;

  public readonly update = new Event();

  constructor(private readonly id: PublicKey) {
    this.signaling = new SignalingClient(this.id);
  }

  get info() {
    return {
      ts: Date.now(),
      id: this.id.toHex(),
      // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection
      connection: this.connection && {
        connectionState: this.connection.connectionState,
        currentLocalDescription: this.connection.currentLocalDescription,
        currentRemoteDescription: this.connection.currentRemoteDescription,
        iceConnectionState: this.connection.iceConnectionState,
        iceGatheringState: this.connection.iceGatheringState,
        localDescription: this.connection.localDescription,
        remoteDescription: this.connection.remoteDescription,
        signalingState: this.connection.signalingState,
      },
      // https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel
      channel: this.channel && {
        binaryType: this.channel.binaryType,
        bufferedAmount: this.channel.bufferedAmount,
        id: this.channel.id,
        label: this.channel.label,
        maxPacketLifeTime: this.channel.maxPacketLifeTime,
        maxRetransmits: this.channel.maxRetransmits,
        negotiated: this.channel.negotiated,
        ordered: this.channel.ordered,
        protocol: this.channel.protocol,
        readyState: this.channel.readyState,
      },
      config: this.connection?.getConfiguration(),
    };
  }

  async open(room = 'invitation', initiate = false) {
    await this.close();
    log.info('opening...', { room, initiate });

    const getPeer = () => this;

    //
    // Signaling.
    //

    await this.signaling.open(room, {
      async onDescription(description: RTCSessionDescription) {
        const { connection, signaling } = getPeer();
        if (connection) {
          await connection.setRemoteDescription(
            new RTCSessionDescription({ type: description.type, sdp: description.sdp }),
          );

          if (description.type === 'offer') {
            await connection.setLocalDescription();
            signaling.sendDescription(connection.localDescription!);
          }
        }
      },

      async onIceCandidate(candidate: RTCIceCandidate) {
        const { connection } = getPeer();
        if (connection) {
          await connection.addIceCandidate(candidate);
        }
      },
    });

    //
    // Peer connection.
    // https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Connectivity
    //

    this.connection = new RTCPeerConnection({
      iceServers: [
        {
          urls: STUN_ENDPOINT,
        },
      ],
    });

    this.connection.addEventListener('negotiationneeded', async (event) => {
      log.info('peer.negotiationneeded', { event });

      // TODO(burdon): Error handling.
      // https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation#implementing_perfect_negotiation
      if (initiate) {
        try {
          log.info('making offer...');
          this.makingOffer = true;
          await this.connection!.setLocalDescription();
          this.signaling.sendDescription(this.connection!.localDescription!);
        } catch (err) {
          log.catch(err);
        } finally {
          this.makingOffer = false;
        }
      }
    });

    this.connection.addEventListener('icecandidate', async (event) => {
      log.info('peer.icecandidate', { event });
      if (event.candidate) {
        this.signaling.sendIceCandidate(event.candidate);
      }
    });

    this.connection.addEventListener('icecandidateerror', async (event) => {
      log.warn('peer.icecandidateerror', { event });
    });

    this.connection.addEventListener('iceconnectionstatechange', async (event) => {
      log.info('peer.iceconnectionstatechange', { event });
      this.connection?.restartIce();
    });

    this.connection.addEventListener('connectionstatechange', async (event) => {
      log.info('peer.connectionstatechange', { event });
      this.update.emit();
    });

    this.connection.addEventListener('datachannel', async (event) => {
      log.info('peer.datachannel', { event });
    });

    //
    // Data channel.
    // https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Using_data_channels
    //

    log.info('creating channel...');
    this.channel = this.connection.createDataChannel(DATA_CHANNEL_LABEL, {
      id: DATA_CHANNEL_ID,
      negotiated: true,
    });

    this.channel.addEventListener('open', () => {
      log.info('channel.open');
      this.send({ sender: this.id, message: 'hello' });
    });

    this.channel.addEventListener('close', () => {
      log.info('channel.close');
    });

    this.channel.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      log.info('channel.message', { data });
    });
  }

  async close() {
    await this.signaling.close();

    if (this.connection) {
      log.info('closing...');
      this.channel?.close();
      this.connection?.close();
      this.channel = undefined;
      this.connection = undefined;
    }
  }

  send(data: Object) {
    this.channel?.send(JSON.stringify(data));
  }
}
