//
// Copyright 2020 DXOS.org
//

import SimplePeerConstructor, { Instance as SimplePeer } from 'simple-peer';

import { Event } from '@dxos/async';
import { ErrorStream, raise } from '@dxos/debug';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { trace } from '@dxos/protocols';
import { Signal } from '@dxos/protocols/proto/dxos/mesh/swarm';

import { Transport, TransportFactory } from './transport';
import { wrtc } from './webrtc';

export type WebRTCTransportParams = {
  initiator: boolean;
  // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/RTCPeerConnection
  webrtcConfig?: any;
  stream: NodeJS.ReadWriteStream;
  // TODO(burdon): Rename onSignal.
  sendSignal: (signal: Signal) => Promise<void>;
};

// TODO(burdon): Refs:
//  https://webrtc.github.io/samples
//  Simple peer discord.

/**
 * Implements WebRTC transport using simple-peer (used by WebTorrent).
 */
export class WebRTCTransport implements Transport {
  private readonly _instanceId = PublicKey.random().toHex();
  private readonly _peer: SimplePeer;

  private _closed = false;
  readonly closed = new Event();
  readonly connected = new Event();
  readonly errors = new ErrorStream();

  constructor(private readonly params: WebRTCTransportParams) {
    log.trace('dxos.mesh.webrtc-transport.constructor', trace.begin({ id: this._instanceId }));
    log('created connection', params);

    // https://www.npmjs.com/package/simple-peer#api
    // NOTE: Set localStorage.debug = 'simple-peer*' to enable debug logging. (Or show verbose in Chrome).
    // View throughput via: chrome://webrtc-internals (data-channel)
    this._peer = new SimplePeerConstructor({
      initiator: this.params.initiator,
      config: this.params.webrtcConfig,
      // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createDataChannel
      channelConfig: {
        protocol: 'dxos.mesh',
      },
      // Custom WebRTC implementation (for Node); otherwise get-browser-rtc.
      wrtc: SimplePeerConstructor.WEBRTC_SUPPORT ? undefined : wrtc ?? raise(new Error('wrtc not available')),
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

// TODO(dmaretskyi): Convert to class.
export const createWebRTCTransportFactory = (webrtcConfig?: any): TransportFactory => ({
  createTransport: (params) =>
    new WebRTCTransport({
      ...params,
      webrtcConfig,
    }),
});
