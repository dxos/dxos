//
// Copyright 2024 DXOS.org
//

import PartySocket from 'partysocket';

import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

const HOST_URL = 'http://127.0.0.1:1999';

export interface SignalingListener {
  onDescription(description: RTCSessionDescription): void;
  onIceCandidate(candidate: RTCIceCandidate): void;
}

/**
 * Signaling client.
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

  async open(listener: SignalingListener) {
    await this.close();
    log.info('opening...');

    // https://docs.partykit.io/reference/partysocket-api
    this.socket = new PartySocket({
      host: HOST_URL,
      id: this.id.toHex(),
      party: 'main', // Default party.
      room: 'signaling',
    });

    this.socket.addEventListener('open', (event) => {
      log.info('signaling.open', { event });
    });

    this.socket.addEventListener('close', (event) => {
      log.info('signaling.close', { event });
    });

    this.socket.addEventListener('message', async (event) => {
      const data = JSON.parse(event.data);
      log.info('signaling.message', { data });
      const { description, candidate } = data;

      if (description) {
        listener.onDescription(new RTCSessionDescription({ type: description.type, sdp: description.sdp }));
      }

      if (candidate) {
        listener.onIceCandidate(candidate);
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

  // TODO(burdon): Effect schema.
  send<T>(data: T) {
    log.info('sending', { data });
    this.socket?.send(JSON.stringify(data));
  }

  sendDescription(description: RTCSessionDescription) {
    this.send({ description });
  }

  sendIceCandidate(candidate: RTCIceCandidate) {
    this.send({ candidate });
  }
}
