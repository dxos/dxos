//
// Copyright 2024 DXOS.org
//

import PartySocket from 'partysocket';

import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { SOCKET_HOST_ENDPOINT } from './defs';

export interface SignalingListener {
  onDescription(description: RTCSessionDescription): void;
  onIceCandidate(candidate: RTCIceCandidate): void;
}

/**
 * Signaling client.
 * https://docs.partykit.io/reference/partysocket-api
 */
export class SignalingClient {
  private socket?: PartySocket;

  constructor(private readonly id: PublicKey) {}

  get info() {
    return {
      ts: Date.now(),
      socket: this.socket?.id,
    };
  }

  // TODO(burdon): Use room for invitation.
  async open(room: string, listener: SignalingListener) {
    await this.close();
    log.info('opening...', { room });

    // https://docs.partykit.io/reference/partysocket-api
    this.socket = new PartySocket({
      host: SOCKET_HOST_ENDPOINT,
      id: this.id.toHex(),
      party: 'main', // Default party.
      room,
      debug: false,
      startClosed: true,
    });

    this.socket.addEventListener('open', (event) => {
      log.info('signaling.open', { room: this.socket?.room, event });
    });

    this.socket.addEventListener('close', (event) => {
      log.info('signaling.close', { room: this.socket?.room, event });
    });

    this.socket.addEventListener('error', (event) => {
      log.warn('signaling.error', { room: this.socket?.room, event });
    });

    this.socket.addEventListener('message', async (event) => {
      const data = JSON.parse(event.data);
      log.info('signaling.message', { room: this.socket?.room, data });
      const { description, candidate } = data;

      if (description) {
        listener.onDescription(new RTCSessionDescription({ type: description.type, sdp: description.sdp }));
      }

      if (candidate) {
        listener.onIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    this.socket.reconnect();
    log.info('open');
  }

  async close() {
    if (this.socket) {
      this.socket.close();
      this.socket = undefined;
      log.info('closed');
    }
  }

  sendDescription(description: RTCSessionDescription) {
    this.send({ description });
  }

  sendIceCandidate(candidate: RTCIceCandidate) {
    this.send({ candidate });
  }

  protected send<T extends Object>(data: T) {
    log.info('sending', { data });
    this.socket?.send(JSON.stringify(data));
  }
}
