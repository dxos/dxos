//
// Copyright 2023 DXOS.org
//

import { Duplex } from 'stream';

import { Event, Trigger, synchronized } from '@dxos/async';
import { ErrorStream } from '@dxos/debug';
import { log } from '@dxos/log';
import { type Signal } from '@dxos/protocols/proto/dxos/mesh/swarm';

import { type Transport, type TransportFactory, type TransportStats } from './transport';

export type LibDataChannelTransportParams = {
  initiator: boolean;
  stream: NodeJS.ReadWriteStream;
  webrtcConfig?: RTCConfiguration;
  sendSignal: (signal: Signal) => Promise<void>;
};

const DATACHANNEL_LABEL = 'dxos.mesh.transport';
const MAX_BUFFERED_AMOUNT = 64 * 1024;

// https://viblast.com/blog/2015/2/5/webrtc-data-channel-message-size/
const MAX_MESSAGE_SIZE = 64 * 1024;

/**
 * Transport
 */
export class LibDataChannelTransport implements Transport {
  private static _instanceCount = 0;

  private _closed = false;
  private _connected = false;
  readonly closed = new Event();
  readonly connected = new Event();
  readonly errors = new ErrorStream();

  // TODO(burdon): Why promise? Make well-formed in initialize method?
  private readonly _peer: Promise<RTCPeerConnection>;

  private _channel!: RTCDataChannel;
  private _stream!: Duplex;

  private readonly _readyForCandidates = new Trigger();
  private _writeCallback: (() => void) | null = null;

  constructor(private readonly _params: LibDataChannelTransportParams) {
    // TODO(burdon): Move to initialize method?
    this._peer = (async () => {
      /* eslint-disable @typescript-eslint/consistent-type-imports */
      const { RTCPeerConnection } = (await importESM('node-datachannel/polyfill'))
        .default as typeof import('node-datachannel/polyfill');
      /* eslint-enable @typescript-eslint/consistent-type-imports */
      if (this._closed) {
        this.errors.raise(new Error('connection already closed'));
      }
      // workaround https://github.com/murat-dogan/node-datachannel/pull/207
      if (_params.webrtcConfig) {
        _params.webrtcConfig.iceServers = _params.webrtcConfig.iceServers ?? [];
      } else {
        _params.webrtcConfig = { iceServers: [] };
      }
      const peer = new RTCPeerConnection(_params.webrtcConfig);
      LibDataChannelTransport._instanceCount++;

      peer.onicecandidateerror = (event) => {
        log.error('peer.onicecandidateerror', { event });
      };

      peer.onconnectionstatechange = (event) => {
        log.debug('peer.onconnectionstatechange', {
          event,
          peerConnectionState: peer.connectionState,
          transportConnectionState: this._connected,
        });
        // TODO(nf): throw error if datachannel does not connect after some time?
      };

      peer.onicecandidate = async (event) => {
        log.debug('peer.onicecandidate', { event });
        if (event.candidate) {
          try {
            await _params.sendSignal({
              payload: {
                data: {
                  type: 'candidate',
                  candidate: {
                    candidate: event.candidate.candidate,
                    // these fields never seem to be not null, but connecting to Chrome doesn't work if they are
                    sdpMLineIndex: event.candidate.sdpMLineIndex ?? 0,
                    sdpMid: event.candidate.sdpMid ?? 0,
                  },
                },
              },
            });
          } catch (err) {
            log.info('signaling error', { err });
          }
        }
      };

      if (_params.initiator) {
        peer
          .createOffer()
          .then(async (offer) => {
            if (this._closed) {
              return;
            }
            if (peer.connectionState !== 'connecting') {
              log.error('peer not connecting', { peer });
              this.errors.raise(new Error('invalid state: peer is initiator, but other peer not in state connecting'));
            }

            log.debug('creating offer', { peer, offer });
            await peer.setLocalDescription(offer);
            await _params.sendSignal({ payload: { data: { type: offer.type, sdp: offer.sdp } } });
            return offer;
          })
          .catch((err) => {
            this.errors.raise(err);
          });

        this.handleChannel(peer.createDataChannel(DATACHANNEL_LABEL));
        log.debug('created data channel');
        peer.ondatachannel = (event) => {
          this.errors.raise(new Error('got ondatachannel when i am the initiator?'));
        };
      } else {
        peer.ondatachannel = (event) => {
          log.debug('peer.ondatachannel (non-initiator)', { event });
          // TODO(nf): should the label contain some identifier?
          if (event.channel.label !== DATACHANNEL_LABEL) {
            this.errors.raise(new Error(`unexpected channel label ${event.channel.label}`));
          }
          this.handleChannel(event.channel);
        };
      }

      return peer;
    })();
  }

  async open() {}

  async destroy(): Promise<void> {
    await this._close();
    if (--LibDataChannelTransport._instanceCount === 0) {
      (await importESM('node-datachannel')).cleanup();
    }
  }

  private handleChannel(dataChannel: RTCDataChannel) {
    this._channel = dataChannel;
    this._channel.onopen = () => {
      log.debug('dataChannel.onopen');
      const duplex = new Duplex({
        read: () => {},
        write: async (chunk, encoding, callback) => {
          // todo wait to open

          if (chunk.length > MAX_MESSAGE_SIZE) {
            this.errors.raise(new Error(`message too large: ${chunk.length} > ${MAX_MESSAGE_SIZE}`));
          }
          try {
            dataChannel.send(chunk);
          } catch (err: any) {
            this.errors.raise(err);
            await this._close();
          }
          if (this._channel.bufferedAmount > MAX_BUFFERED_AMOUNT) {
            if (this._writeCallback !== null) {
              log.error("consumer trying to write before we're ready for more data");
            }
            this._writeCallback = callback;
          } else {
            callback();
          }
        },
      });

      duplex.pipe(this._params.stream).pipe(duplex);
      this._stream = duplex;
      this._connected = true;
      this.connected.emit();
    };

    this._channel.onerror = async (err) => {
      this.errors.raise(new Error('channel error: ' + err.toString()));
      await this._close();
    };
    this._channel.onclose = async (err) => {
      log.info('channel onclose', { err });
      await this._close();
    };
    this._channel.onmessage = (event) => {
      let data = event.data;
      if (data instanceof ArrayBuffer) {
        data = Buffer.from(data);
      }
      this._stream.push(data);
    };

    this._channel.onbufferedamountlow = () => {
      const cb = this._writeCallback;
      this._writeCallback = null;
      cb?.();
    };
  }

  @synchronized
  private async _close() {
    if (this._closed) {
      return;
    }
    await this._disconnectStreams();
    const peer = await this._peer;
    try {
      peer.close();
    } catch (err: any) {
      this.errors.raise(err);
    }
    this._closed = true;
    this.closed.emit();
  }

  // TODO(burdon): Make async.
  signal(signal: Signal): void {
    this._peer
      .then(async (peer) => {
        const data = signal.payload.data;
        switch (data.type) {
          case 'offer': {
            if ((await this._peer).connectionState !== 'new') {
              log.error('received offer but peer not in state new', { peer });
              this.errors.raise(new Error('invalid signalling state: received offer when peer is not in state new'));
              break;
            }
            try {
              await peer.setRemoteDescription({ type: data.type, sdp: data.sdp });
              const answer = await peer.createAnswer();
              await peer.setLocalDescription(answer);
              await this._params.sendSignal({ payload: { data: { type: answer.type, sdp: answer.sdp } } });
              this._readyForCandidates.wake();
            } catch (err) {
              log.error("can't handle offer from signalling server", { err });
              this.errors.raise(new Error('error handling offer'));
            }
            break;
          }

          case 'answer':
            try {
              await peer.setRemoteDescription({ type: data.type, sdp: data.sdp });
              this._readyForCandidates.wake();
            } catch (err) {
              log.error("can't handle answer from signalling server", { err });
              this.errors.raise(new Error('error handling answer'));
            }
            break;

          case 'candidate':
            await this._readyForCandidates.wait();
            await peer.addIceCandidate({ candidate: data.candidate.candidate });
            break;

          default:
            log.error('unhandled signal type', { type: data.type, signal });
            this.errors.raise(new Error(`unhandled signal type ${data.type}`));
        }
      })
      .catch((err) => {
        log.catch(err);
      });
  }

  async getDetails(): Promise<string> {
    const stats = await this._getStats();
    const rc = stats?.remoteCandidate;
    if (!rc) {
      return 'unavailable';
    }

    if (rc.candidateType === 'relay') {
      return `${rc.ip}:${rc.port} relay for ${rc.relatedAddress}:${rc.relatedPort}`;
    }
    return `${rc.ip}:${rc.port} ${rc.candidateType}`;
  }

  async _getStats(): Promise<any> {
    return this._peer.then(async (peer) => {
      const stats = await peer.getStats();
      const statsEntries = Array.from((stats as any).entries() as any[]);
      const transport = statsEntries.filter((s) => s[1].type === 'transport')[0][1];
      const candidatePair = statsEntries.filter((s: any) => s[0] === transport.selectedCandidatePairId);
      let selectedCandidatePair: any;
      let remoteCandidate: any;
      if (candidatePair.length > 0) {
        selectedCandidatePair = candidatePair[0][1];
        remoteCandidate = statsEntries.filter((s: any) => s[0] === selectedCandidatePair.remoteCandidateId)[0][1];
      }

      return {
        transport,
        selectedCandidatePair,
        remoteCandidate,
        raw: Object.fromEntries(stats as any),
      };
    });
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

    return {
      bytesSent: stats.transport.bytesSent,
      bytesReceived: stats.transport.bytesReceived,
      packetsSent: 0,
      packetsReceived: 0,
      rawStats: stats.raw,
    };
  }

  private async _disconnectStreams() {
    this._params.stream.unpipe?.(this._stream)?.unpipe?.(this._params.stream);
  }
}

export const createLibDataChannelTransportFactory = (webrtcConfig?: any): TransportFactory => ({
  createTransport: (params) =>
    new LibDataChannelTransport({
      ...params,
      webrtcConfig,
    }),
});

// eslint-disable-next-line no-new-func
const importESM = Function('path', 'return import(path)');
