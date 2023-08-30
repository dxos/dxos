//
// Copyright 2023 DXOS.org
//

import { Duplex } from 'stream';

import { Event, Trigger } from '@dxos/async';
import { ErrorStream } from '@dxos/debug';
import { log } from '@dxos/log';
import { Signal } from '@dxos/protocols/proto/dxos/mesh/swarm';

import { type PeerConnection } from './datachannel/rtc-peer-connection';
import { Transport } from './transport';

export type LibDataChannelTransportParams = {
  initiator: boolean;
  stream: NodeJS.ReadWriteStream;
  webrtcConfig?: RTCConfiguration;
  sendSignal: (signal: Signal) => Promise<void>;
};

const MAX_BUFFERED_AMOUNT = 64 * 1024;

// https://viblast.com/blog/2015/2/5/webrtc-data-channel-message-size/
const MAX_MESSAGE_SIZE = 64 * 1024;

/**
 * Transport
 */
export class LibDataChannelTransport implements Transport {
  private _closed = false;
  readonly closed = new Event();
  private _connected = false;
  readonly connected = new Event();
  readonly errors = new ErrorStream();
  private readonly _peer: Promise<PeerConnection>;
  private _channel!: RTCDataChannel;
  private _stream!: Duplex;

  private readonly _readyForCandidates = new Trigger();
  private _writeCallback: (() => void) | null = null;

  constructor(private readonly params: LibDataChannelTransportParams) {
    this._peer = (async () => {
      const { RTCPeerConnection: PeerConnection } = await import('./datachannel');
      if (this._closed) {
        this.errors.raise(Error('connection already closed'));
      }
      const peer = new PeerConnection(params.webrtcConfig);

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
          await params.sendSignal({
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
        }
      };
      if (params.initiator) {
        peer
          .createOffer()
          .then(async (offer) => {
            if (peer.connectionState !== 'connecting') {
              log.error('i am initiator but peer not in state connecting', { peer });
              this.errors.raise(Error('invalid state: peer is initiator, but other peer not in state connecting'));
            }
            log.debug(`im the initiator, creating offer, peer is in state ${peer.connectionState}`, { offer });
            await peer.setLocalDescription(offer);
            await params.sendSignal({ payload: { data: { type: offer.type, sdp: offer.sdp } } });
            return offer;
          })
          .catch((err) => {
            this.errors.raise(err);
          });

        // TODO(nf): better pattern for adding event handlers to existing object?
        this._channel = this._channelHandler(peer.createDataChannel('dxos.mesh.transport'));
        log.info('created data channel', { label: this._channel.label });
        peer.ondatachannel = (event) => {
          this.errors.raise(Error('got ondatachannel when i am the initiator?'));
        };
      } else {
        peer.ondatachannel = (event) => {
          log.info('peer.ondatachannel (non-initiator)', { event });
          // TODO(nf): should the label contain some identifier?
          if (event.channel.label !== 'dxos.mesh.transport') {
            this.errors.raise(Error(`unexpected channel label ${event.channel.label}`));
          }
          this._channel = this._channelHandler(event.channel);
        };
      }

      return peer;
    })();
  }

  private _channelHandler(dataChannel: RTCDataChannel) {
    dataChannel.onopen = () => {
      log.info('dataChannel.onopen');
      const duplex = new Duplex({
        read: () => {},
        write: (chunk, encoding, callback) => {
          // todo wait to open

          if (chunk.length > MAX_MESSAGE_SIZE) {
            this.errors.raise(Error(`message too large: ${chunk.length} > ${MAX_MESSAGE_SIZE}`));
          }
          dataChannel.send(chunk);

          if (this._channel.bufferedAmount > MAX_BUFFERED_AMOUNT) {
            log.debug('bufferedAmount > MAX_BUFFERED_AMOUNT: PAUSING');
            if (this._writeCallback !== null) {
              log.error("consumer trying to write before we're ready for more data");
            }
            this._writeCallback = callback;
          } else {
            callback();
          }
        },
      });

      duplex.pipe(this.params.stream).pipe(duplex);
      this._stream = duplex;
      this._connected = true;
      this.connected.emit();
    };

    dataChannel.onerror = async (err) => {
      log.error('channel error', { err });
      await this._disconnectStreams();
      this._closed = true;
      this.closed.emit();
    };
    dataChannel.onclose = async (err) => {
      log.error('channel error', { err });
      await this._disconnectStreams();
      this._closed = true;
      this.closed.emit();
    };
    dataChannel.onmessage = (event) => {
      let data = event.data;
      if (data instanceof ArrayBuffer) {
        data = Buffer.from(data);
      }
      this._stream.push(data);
    };

    // TODO(mykola): Check if this is working correctly.
    dataChannel.onbufferedamountlow = () => {
      const cb = this._writeCallback;
      this._writeCallback = null;
      cb?.();
    };

    dataChannel.onclose = () => {
      this._stream.destroy();
      this._closed = true;
      this.closed.emit();
    };
    return dataChannel;
  }

  signal(signal: Signal): void {
    this._peer
      .then(async (peer) => {
        const data = signal.payload.data;
        switch (data.type) {
          case 'offer': {
            if ((await this._peer).connectionState !== 'new') {
              log.error('received offer but peer not in state new', { peer });
              this.errors.raise(Error('invalid signalling state: received offer when peer is not in state new'));
              break;
            }
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
            log.error('unhandled signal type', { type: data.type, signal });
            this.errors.raise(Error(`unhandled signal type ${data.type}`));
        }
      })
      .catch((err) => {
        log.catch(err);
      });
  }

  async destroy(): Promise<void> {
    if (this._closed) {
      log.warn('tried to destroy already closed connection');
      return;
    }
    await this._disconnectStreams();
    if (this._peer) {
      (await this._peer).close();
    }
    this._closed = true;
    this.closed.emit();
  }

  private async _disconnectStreams() {
    this.params.stream.unpipe?.(this._stream)?.unpipe?.(this.params.stream);
  }
}
