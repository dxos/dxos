/* eslint-disable no-fallthrough */
//
// Copyright 2020 DXOS.org
//

import SimplePeerConstructor, { type Instance as SimplePeer } from 'simple-peer';
import invariant from 'tiny-invariant';

import { Event } from '@dxos/async';
import { ErrorStream, raise } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { ConnectionResetError, ConnectivityError, ProtocolError, UnknownProtocolError, trace } from '@dxos/protocols';
import { type Signal } from '@dxos/protocols/proto/dxos/mesh/swarm';

import { type Transport, type TransportFactory } from './transport';
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
  private _piped = false;

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
      this._piped = true;
      this.connected.emit();
    });

    this._peer.on('close', async () => {
      log('closed');
      await this.destroy();
    });

    this._peer.on('error', async (err) => {
      // https://developer.mozilla.org/en-US/docs/Web/API/RTCError
      if (typeof RTCError !== 'undefined' && err instanceof RTCError) {
        // Sent when connection is unexpectedly severed
        if (err.errorDetail === 'sctp-failure') {
          this.errors.raise(new ConnectionResetError('sctp-failure from RTCError', err));
        } else {
          this.errors.raise(new UnknownProtocolError('unknown RTCError', err));
        }
        // catch more generic simple-peer errors: https://github.com/feross/simple-peer/blob/master/README.md#error-codes
      } else if ('code' in err) {
        log.info('simple-peer error', err);
        switch (err.code) {
          case 'ERR_WEBRTC_SUPPORT':
            this.errors.raise(new ProtocolError('WebRTC not supported', err));
            break;
          case 'ERR_ICE_CONNECTION_FAILURE':
          case 'ERR_DATA_CHANNEL':
          case 'ERR_CONNECTION_FAILURE':
          case 'ERR_SIGNALING':
            this.errors.raise(new ConnectivityError('unknown communication failure', err));
            break;
          // errors due to library issues or improper API usage
          case 'ERR_CREATE_OFFER':
          case 'ERR_CREATE_ANSWER':
          case 'ERR_SET_LOCAL_DESCRIPTION':
          case 'ERR_SET_REMOTE_DESCRIPTION':
          case 'ERR_ADD_ICE_CANDIDATE':
            this.errors.raise(new UnknownProtocolError('unknown simple-peer library failure', err));
            break;
          default:
            this.errors.raise(new Error('unknown simple-peer error'));
            break;
        }
      } else {
        log.info('unknown peer connection error', err);
        this.errors.raise(err);
      }

      // Try to gather additional information about the connection.
      try {
        if (typeof (this._peer as any)?._pc?.getStats === 'function') {
          (this._peer as any)._pc.getStats().then((stats: any) => {
            log.info('report after webrtc error', {
              config: this.params.webrtcConfig,
              stats,
            });
          });
        }
      } catch (err) {
        log.catch(err);
      }

      await this.destroy();
    });
    log.trace('dxos.mesh.webrtc-transport.constructor', trace.end({ id: this._instanceId }));
  }

  async destroy() {
    log('closing...');
    if (this._closed) {
      return;
    }
    this._closed = true;
    this._disconnectStreams();
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

  private _disconnectStreams() {
    // TODO(rzadp): Find a way of unpiping this?
    if (this._piped) {
      this.params.stream.unpipe?.(this._peer)?.unpipe?.(this.params.stream);
    }
  }
}

export const createSimplePeerTransportFactory = (webrtcConfig?: any): TransportFactory => ({
  createTransport: (params) =>
    new SimplePeerTransport({
      ...params,
      webrtcConfig,
    }),
});
