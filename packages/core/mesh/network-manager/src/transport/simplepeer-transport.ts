//
// Copyright 2020 DXOS.org
//

import SimplePeerConstructor, { Instance as SimplePeer } from 'simple-peer';
import invariant from 'tiny-invariant';

import { Event } from '@dxos/async';
import { ErrorStream, raise } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { trace } from '@dxos/protocols';
import { Signal } from '@dxos/protocols/proto/dxos/mesh/swarm';

import { Transport, TransportFactory } from './transport';
import { wrtc } from './webrtc';

export type SimplePeerTransportParams = {
  initiator: boolean;
  stream: NodeJS.ReadWriteStream;
  webrtcConfig?: any;
  sendSignal: (signal: Signal) => Promise<void>;
};

/**
 * Implements Transport for WebRTC. Uses simple-peer under the hood.
 */
export class SimplePeerTransport implements Transport {
  private readonly _peer: SimplePeer;
  private _closed = false;

  readonly closed = new Event();
  readonly connected = new Event();
  readonly errors = new ErrorStream();

  private readonly _instanceId = PublicKey.random().toHex();

  constructor(private readonly params: SimplePeerTransportParams) {
    log.trace('dxos.mesh.webrtc-transport.constructor', trace.begin({ id: this._instanceId }));
    log('created connection', params);
    this._peer = new SimplePeerConstructor({
      channelName: 'dxos.mesh.transport',
      initiator: this.params.initiator,
      wrtc: SimplePeerConstructor.WEBRTC_SUPPORT ? undefined : wrtc ?? raise(new Error('wrtc not available')),
      config: this.params.webrtcConfig,
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

      // Try to gather additional information about the connection.
      try {
        if (typeof (this._peer as any)?._pc.getStats === 'function') {
          (this._peer as any)._pc.getStats().then((stats: any) => {
            log.warn('report after webrtc error', {
              config: this.params.webrtcConfig,
              stats,
            });
          });
        }
      } catch {} // TODO(burdon): Ignored?

      await this.destroy();
    });
    log.trace('dxos.mesh.webrtc-transport.constructor', trace.end({ id: this._instanceId }));
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
    if (this._closed) {
      return; // Ignore signals after close.
    }

    invariant(signal.payload.data, 'Signal message must contain signal data.');
    this._peer.signal(signal.payload.data);
  }

  private async _disconnectStreams() {
    // TODO(rzadp): Find a way of unpiping this?
    this.params.stream.unpipe?.(this._peer)?.unpipe?.(this.params.stream);
  }
}

export const createSimplePeerTransportFactory = (webrtcConfig?: any): TransportFactory => ({
  createTransport: (params) =>
    new SimplePeerTransport({
      ...params,
      webrtcConfig,
    }),
});
