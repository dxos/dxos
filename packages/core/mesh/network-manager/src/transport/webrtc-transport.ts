//
// Copyright 2020 DXOS.org
//

import assert from 'node:assert';
import SimplePeerConstructor, { Instance as SimplePeer } from 'simple-peer';

import { Event } from '@dxos/async';
import { ErrorStream, raise } from '@dxos/debug';
import { log } from '@dxos/log';
import { Signal } from '@dxos/protocols/proto/dxos/mesh/swarm';

import { Transport, TransportFactory } from './transport';
import { wrtc } from './webrtc';

export type WebRTCTransportParams = {
  initiator: boolean;
  stream: NodeJS.ReadWriteStream;
  webrtcConfig?: any;
  sendSignal: (signal: Signal) => Promise<void>;
};

/**
 * Implements Transport for WebRTC. Uses simple-peer under the hood.
 */
export class WebRTCTransport implements Transport {
  private readonly _peer: SimplePeer;
  private _closed = false;

  readonly closed = new Event();
  readonly connected = new Event();
  readonly errors = new ErrorStream();

  constructor(private readonly params: WebRTCTransportParams) {
    log('created connection', params);
    this._peer = new SimplePeerConstructor({
      initiator: this.params.initiator,
      wrtc: SimplePeerConstructor.WEBRTC_SUPPORT ? undefined : wrtc ?? raise(new Error('wrtc not available')),
      config: this.params.webrtcConfig
    });

    this._peer.on('signal', async (data) => {
      log('signal', data);
      await this.params.sendSignal({ payload: { data } });
    });

    this._peer.on('connect', () => {
      log('connected');
      this.params.stream.pipe(this._peer!).pipe(this.params.stream);
      this.connected.emit();
    });

    this._peer.on('close', async () => {
      log('closed');
      await this._disconnectStreams();
      this.closed.emit();
    });

    this._peer.on('error', async (err) => {
      this.errors.raise(err);
      await this.destroy();
    });
  }

  async destroy() {
    log('closing...');
    this._closed = true;
    await this._disconnectStreams();
    this._peer!.destroy();
    this.closed.emit();
    log('closed');
  }

  signal(signal: Signal) {
    if(this._closed) {
      return; // Ignore signals after close.
    }

    assert(signal.payload.data, 'Signal message must contain signal data.');
    this._peer.signal(signal.payload.data);
  }

  private async _disconnectStreams() {
    // TODO(rzadp): Find a way of unpiping this?
    this.params.stream.unpipe?.(this._peer)?.unpipe?.(this.params.stream);
  }
}

// TODO(dmaretskyi): Convert to class.
export const createWebRTCTransportFactory = (webrtcConfig?: any): TransportFactory => ({
  createTransport: (params) =>
    new WebRTCTransport({
      ...params,
      webrtcConfig
    })
});
