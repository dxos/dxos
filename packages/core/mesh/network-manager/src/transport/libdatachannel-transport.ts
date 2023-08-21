//
// Copyright 2023 DXOS.org
//

import { Duplex } from 'stream';

import { Event, Trigger } from '@dxos/async';
import { ErrorStream } from '@dxos/debug';
import { log } from '@dxos/log';
import { Signal } from '@dxos/protocols/proto/dxos/mesh/swarm';

import { type PeerConnection } from './datachannel/rtc-peer-connection';
import { Transport, TransportFactory } from './transport';

export type LibDataChannelTransportParams = {
  initiator: boolean;
  stream: NodeJS.ReadWriteStream;
  webrtcConfig?: RTCConfiguration;
  sendSignal: (signal: Signal) => Promise<void>;
};

const MAX_BUFFERED_AMOUNT = 64 * 1024;

/**
 * Transport
 */
export class LibDataChannelTransport implements Transport {
  readonly closed = new Event();
  readonly connected = new Event();
  readonly errors = new ErrorStream();
  private readonly _peer: Promise<PeerConnection>;
  private _channel!: RTCDataChannel;
  private _stream!: Duplex;

  private readonly _readyForCandidates = new Trigger();
  private _writeCallback: (() => void) | null = null;

  constructor(private readonly params: LibDataChannelTransportParams) {
    this._peer = (async () => {
      const { PeerConnection } = await import('./datachannel/rtc-peer-connection');
      const peer = new PeerConnection(params.webrtcConfig);

      peer.onicecandidateerror = (event) => {
        log.error('onicecandidateerror', { event });
      };

      peer.onconnectionstatechange = (event) => {
        log.info('onconnectionstatechange', { event, state: peer.connectionState });
      };

      peer.onicecandidate = async (event) => {
        if (event.candidate) {
          await params.sendSignal({
            payload: {
              data: {
                type: 'candidate',
                candidate: {
                  candidate: event.candidate.candidate,
                  sdpMLineIndex: event.candidate.sdpMLineIndex,
                  sdpMid: event.candidate.sdpMid,
                },
              },
            },
          });
        }
      };
      if (params.initiator) {
        peer
          .createOffer()
          .then(async (offer) => {
            await peer.setLocalDescription(offer);
            await params.sendSignal({ payload: { data: { type: offer.type, sdp: offer.sdp } } });
          })
          .catch((err) => {
            log.catch(err);
          });

        this._channel = peer.createDataChannel('dxos.mesh.transport');

        this._channel.onopen = () => this._handleChannel(this._channel);
      } else {
        peer.ondatachannel = (event) => {
          this._channel = event.channel;
          this._channel.onopen = () => this._handleChannel(this._channel);
        };
      }

      return peer;
    })();
  }

  private _handleChannel(dataChannel: RTCDataChannel) {
    this._channel.onerror = async (err) => {
      log.error('channel error', { err });
      await this._disconnectStreams();
    };
    this._channel.onclose = async (err) => {
      log.error('channel error', { err });
      await this._disconnectStreams();
    };

    const duplex = new Duplex({
      read: () => {},
      write: (chunk, encoding, callback) => {
        // todo wait to open

        dataChannel.send(chunk);

        if (this._channel.bufferedAmount > MAX_BUFFERED_AMOUNT) {
          this._writeCallback = callback;
        } else {
          callback();
        }
      },
    });

    dataChannel.onmessage = (event) => {
      let data = event.data;
      if (data instanceof ArrayBuffer) {
        data = Buffer.from(data);
      }
      duplex.push(data);
    };

    // TODO(mykola): Check if this is working correctly.
    dataChannel.onbufferedamountlow = () => {
      const cb = this._writeCallback;
      this._writeCallback = null;
      cb?.();
    };

    dataChannel.onclose = () => {
      duplex.destroy();
    };
    duplex.pipe(this.params.stream).pipe(duplex);
    this._stream = duplex;
  }

  signal(signal: Signal): void {
    this._peer
      .then(async (peer) => {
        const data = signal.payload.data;
        switch (data.type) {
          case 'offer': {
            await peer.setRemoteDescription({ type: data.type, sdp: data.sdp });
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            await this.params.sendSignal({ payload: { data: { type: answer.type, sdp: answer.sdp } } });
            this._readyForCandidates.wake();
            break;
          }

          case 'answer':
            await peer.setRemoteDescription({ type: data.type, sdp: data.sdp });
            this._readyForCandidates.wake();
            break;

          case 'candidate':
            await this._readyForCandidates.wait();
            await peer.addIceCandidate({ candidate: data.candidate.candidate });
            break;

          default:
            log.warn('unknown signal type', { type: data.type, signal });
        }
      })
      .catch((err) => {
        log.catch(err);
      });
  }

  async destroy(): Promise<void> {
    (await this._peer).close();
  }

  private async _disconnectStreams() {
    // TODO(rzadp): Find a way of unpiping this?
    this.params.stream.unpipe?.(this._stream)?.unpipe?.(this.params.stream);
  }
}
