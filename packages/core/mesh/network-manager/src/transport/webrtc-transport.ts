//
// Copyright 2020 DXOS.org
//

// import wrtc from '@koush/wrtc';
import assert from 'node:assert';
import SimplePeerConstructor, { Instance as SimplePeer } from 'simple-peer';

import { Event } from '@dxos/async';
import { ErrorStream } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { Signal } from '@dxos/protocols/proto/dxos/mesh/swarm';

import { SignalMessage } from '../signal';
import { Transport, TransportFactory } from './transport';

/**
 * Implements Transport for WebRTC. Uses simple-peer under the hood.
 */
export class WebRTCTransport implements Transport {
  private readonly _peer: SimplePeer;

  readonly closed = new Event();
  readonly connected = new Event();
  readonly errors = new ErrorStream();

  constructor (
    private readonly _initiator: boolean,
    private readonly _stream: NodeJS.ReadWriteStream,
    private readonly _ownId: PublicKey,
    private readonly _remoteId: PublicKey,
    private readonly _sessionId: PublicKey,
    private readonly _topic: PublicKey,
    private readonly _sendSignal: (msg: SignalMessage) => void,
    private readonly _webrtcConfig?: any
  ) {
    log(`Created WebRTC connection ${this._ownId} -> ${this._remoteId} initiator=${this._initiator}`);

    log(`Creating WebRTC connection topic=${this._topic} ownId=${this._ownId} remoteId=${this._remoteId} initiator=${this._initiator} webrtcConfig=${JSON.stringify(this._webrtcConfig)}`);
    this._peer = new SimplePeerConstructor({
      initiator: this._initiator,
      wrtc: SimplePeerConstructor.WEBRTC_SUPPORT ? undefined : undefined,
      config: this._webrtcConfig
    });
    this._peer.on('signal', async data => {
      try {
        await this._sendSignal({
          author: this._ownId,
          recipient: this._remoteId,
          sessionId: this._sessionId,
          topic: this._topic,
          data: { signal: { json: JSON.stringify(data) } }
        });
      } catch (err: any) {
        this.errors.raise(err);
      }
    });
    this._peer.on('connect', () => {
      log(`Connection established ${this._ownId} -> ${this._remoteId}`);
      this._stream.pipe(this._peer!).pipe(this._stream);
      this.connected.emit();
    });
    this._peer.on('error', async (err) => {
      this.errors.raise(err);
      await this.close();
    });
    this._peer.on('close', async () => {
      log(`Connection closed ${this._ownId} -> ${this._remoteId}`);
      await this._disconnectStreams();
      this.closed.emit();
    });
  }

  get remoteId () {
    return this._remoteId;
  }

  get sessionId () {
    return this._sessionId;
  }

  get peer () {
    return this._peer;
  }

  async signal (signal: Signal) {
    assert(this._peer, 'Connection not ready to accept signals.');
    assert(signal.json, 'Signal message must contain signal data.');
    this._peer.signal(JSON.parse(signal.json));
  }

  async close () {
    await this._disconnectStreams();
    this._peer!.destroy();
    log('Closed.');
  }

  private async _disconnectStreams () {
    // TODO(rzadp): Find a way of unpiping this?
    this._stream.unpipe?.(this._peer)?.unpipe?.(this._stream);
  }
}

// TODO(burdon): Pass in opts?
export const createWebRTCTransportFactory = (webrtcConfig?: any): TransportFactory => opts => new WebRTCTransport(
  opts.initiator,
  opts.stream,
  opts.ownId,
  opts.remoteId,
  opts.sessionId,
  opts.topic,
  opts.sendSignal,
  webrtcConfig
);
