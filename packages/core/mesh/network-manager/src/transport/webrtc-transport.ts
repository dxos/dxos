//
// Copyright 2020 DXOS.org
//

import assert from 'node:assert';
import SimplePeerConstructor, { Instance as SimplePeer } from 'simple-peer';

import { Event } from '@dxos/async';
import { ErrorStream, raise } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { Signal } from '@dxos/protocols/proto/dxos/mesh/swarm';

import { SignalMessage } from '../signal';
import { Transport, TransportFactory } from './transport';
import { wrtc } from './webrtc';

export type WebRTCTransportParams = {
  initiator: boolean;
  stream: NodeJS.ReadWriteStream;
  ownId: PublicKey;
  remoteId: PublicKey;
  sessionId: PublicKey;
  topic: PublicKey;
  sendSignal: (msg: SignalMessage) => void;
  webrtcConfig?: any;
};

/**
 * Implements Transport for WebRTC. Uses simple-peer under the hood.
 */
export class WebRTCTransport implements Transport {
  private readonly _peer: SimplePeer;

  readonly closed = new Event();
  readonly connected = new Event();
  readonly errors = new ErrorStream();

  constructor(private readonly params: WebRTCTransportParams) {
    log(`Created WebRTC connection ${this.params.ownId} -> ${this.params.remoteId} initiator=${this.params.initiator}`);

    log('Creating WebRTC connection', this.params);
    this._peer = new SimplePeerConstructor({
      initiator: this.params.initiator,
      wrtc: SimplePeerConstructor.WEBRTC_SUPPORT ? undefined : wrtc ?? raise(new Error('wrtc not available')),
      config: this.params.webrtcConfig
    });
    this._peer.on('signal', async (data) => {
      console.log('WebRTCTransport.signal');
      try {
        await this.params.sendSignal({
          author: this.params.ownId,
          recipient: this.params.remoteId,
          sessionId: this.params.sessionId,
          topic: this.params.topic,
          data: { signal: { json: JSON.stringify(data) } }
        });
      } catch (err: any) {
        this.errors.raise(err);
      }
    });
    this._peer.on('connect', () => {
      console.log(`Connection established ${this.params.ownId} -> ${this.params.remoteId}`);
      this.params.stream.pipe(this._peer!).pipe(this.params.stream);
      this.connected.emit();
    });
    this._peer.on('error', async (err) => {
      this.errors.raise(err);
      await this.close();
    });
    this._peer.on('close', async () => {
      log(`Connection closed ${this.params.ownId} -> ${this.params.remoteId}`);
      await this._disconnectStreams();
      this.closed.emit();
    });
  }

  get peer() {
    return this._peer;
  }

  get remoteId() {
    return this.params.remoteId;
  }

  get sessionId() {
    return this.params.sessionId;
  }

  async signal(signal: Signal) {
    assert(this._peer, 'Connection not ready to accept signals.');
    assert(signal.json, 'Signal message must contain signal data.');
    this._peer.signal(JSON.parse(signal.json));
  }

  async close() {
    await this._disconnectStreams();
    this._peer!.destroy();
    log('Closed.');
  }

  private async _disconnectStreams() {
    // TODO(rzadp): Find a way of unpiping this?
    this.params.stream.unpipe?.(this._peer)?.unpipe?.(this.params.stream);
  }
}

export const createWebRTCTransportFactory = (webrtcConfig?: any): TransportFactory => ({
  create: (params) =>
    new WebRTCTransport({
      ...params,
      webrtcConfig
    })
});
