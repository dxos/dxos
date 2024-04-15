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

import { type Transport, type TransportFactory, type TransportStats } from './transport';
import { wrtc } from './webrtc';

export type SimplePeerTransportParams = {
  initiator: boolean;
  stream: NodeJS.ReadWriteStream;
  webrtcConfig?: any;
  sendSignal: (signal: Signal) => Promise<void>;
};

export const createSimplePeerTransportFactory = (webrtcConfig?: any): TransportFactory => ({
  createTransport: (options) => new SimplePeerTransport({ ...options, webrtcConfig }),
});

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

  /**
   * @params opts.config formatted as per https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/RTCPeerConnection
   */
  constructor(private readonly _params: SimplePeerTransportParams) {
    log.trace('dxos.mesh.webrtc-transport.constructor', trace.begin({ id: this._instanceId }));
    log('created connection', _params);
    this._peer = new SimplePeerConstructor({
      channelName: 'dxos.mesh.transport',
      initiator: this._params.initiator,
      wrtc: SimplePeerConstructor.WEBRTC_SUPPORT ? undefined : wrtc ?? raise(new Error('wrtc not available')),
      config: this._params.webrtcConfig,
    });

    this._peer.on('signal', async (data) => {
      log('signal', data);
      await this._params.sendSignal({ payload: { data } });
    });

    this._peer.on('connect', () => {
      log('connected');
      this._params.stream.pipe(this._peer!).pipe(this._params.stream);
      this._piped = true;
      this.connected.emit();
    });

    this._peer.on('close', async () => {
      log('closed');
      await this.close();
    });

    this._peer.on('error', async (err) => {
      // https://developer.mozilla.org/en-US/docs/Web/API/RTCError
      if (typeof RTCError !== 'undefined' && err instanceof RTCError) {
        // Sent when connection is unexpectedly severed
        if (err.errorDetail === 'sctp-failure') {
          this.errors.raise(new ConnectionResetError('sctp-failure from RTCError', err));
        } else {
          log.info('unknown RTCError', { err });
          this.errors.raise(new UnknownProtocolError('unknown RTCError', err));
        }
        // catch more generic simple-peer errors: https://github.com/feross/simple-peer/blob/master/README.md#error-codes
      } else if ('code' in err) {
        log.info('simple-peer error', err);
        switch (err.code) {
          case 'ERR_WEBRTC_SUPPORT':
            this.errors.raise(new ProtocolError('WebRTC not supported', err));
            break;
          case 'ERR_SIGNALING':
            this.errors.raise(new ConnectivityError('signaling failure', err));
            break;
          case 'ERR_ICE_CONNECTION_FAILURE':
          case 'ERR_DATA_CHANNEL':
          case 'ERR_CONNECTION_FAILURE':
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
              config: this._params.webrtcConfig,
              stats: Object.fromEntries((stats as any).entries()),
            });
          });
        }
      } catch (err) {
        log.catch(err);
      }

      await this.close();
    });

    log.trace('dxos.mesh.webrtc-transport.constructor', trace.end({ id: this._instanceId }));
  }

  async getStats(): Promise<TransportStats> {
    const stats = await this._getStats();
    if (!stats) {
      return {
        bytesSent: 0,
        bytesReceived: 0,
        packetsSent: 0,
        packetsReceived: 0,
        rawStats: {},
      };
    }

    // TODO(nf): transport or candidatePair?
    return {
      bytesSent: stats.transport.bytesSent,
      bytesReceived: stats.transport.bytesReceived,
      packetsSent: stats.transport.packetsSent,
      packetsReceived: stats.transport.packetsReceived,
      rawStats: stats.raw,
    };
  }

  async _getStats(): Promise<any> {
    if (typeof (this._peer as any)?._pc?.getStats !== 'function') {
      return null;
    }
    return await (this._peer as any)._pc.getStats().then((stats: any) => {
      const statsEntries = Array.from(stats.entries() as any[]);
      const transport = statsEntries.filter((s: any) => s[1].type === 'transport')[0][1];
      const candidatePair = statsEntries.filter((s: any) => s[0] === transport.selectedCandidatePairId);
      let selectedCandidatePair: any;
      let remoteCandidate: any;
      if (candidatePair.length > 0) {
        selectedCandidatePair = candidatePair[0][1];
        remoteCandidate = statsEntries.filter((s: any) => s[0] === selectedCandidatePair.remoteCandidateId)[0][1];
      }
      return {
        datachannel: statsEntries.filter((s: any) => s[1].type === 'data-channel')[0][1],
        transport,
        selectedCandidatePair,
        remoteCandidate,
        raw: Object.fromEntries(stats.entries()),
      };
    });
  }

  async getDetails(): Promise<string> {
    const stats = await this._getStats();
    const rc = stats?.remoteCandidate;
    if (!rc) {
      return 'unavailable';
    }

    if (rc.candidateType === 'relay') {
      return `${rc.ip}:${rc.port}/${rc.protocol} relay for ${rc.relatedAddress}:${rc.relatedPort}`;
    }
    return `${rc.ip}:${rc.port}/${rc.protocol} ${rc.candidateType}`;
  }

  async open() {}

  async close() {
    log('closing...');
    if (this._closed) {
      return;
    }
    this._disconnectStreams();
    this._peer!.destroy();
    this._closed = true;
    this.closed.emit();
    log('closed');
  }

  async signal(signal: Signal) {
    if (this._closed) {
      return; // Ignore signals after close.
    }

    invariant(signal.payload.data, 'Signal message must contain signal data.');
    this._peer.signal(signal.payload.data);
  }

  private _disconnectStreams() {
    // TODO(rzadp): Find a way of unpiping this?
    if (this._piped) {
      this._params.stream.unpipe?.(this._peer)?.unpipe?.(this._params.stream);
    }
  }
}
