//
// Copyright 2024 DXOS.org
//

import { Event as AsyncEvent } from '@dxos/async';
import { Resource } from '@dxos/context';
import { ErrorStream } from '@dxos/debug';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { ConnectivityError } from '@dxos/protocols';
import { type Signal } from '@dxos/protocols/buf/dxos/mesh/swarm_pb';
import { connectDuplexStreams } from '@dxos/teleport';

import { type Transport, type TransportOptions, type TransportStats } from '../transport.ts';
import { type RtcPeerConnection } from './rtc-peer-connection.ts';
import { createRtcTransportStats, describeSelectedRemoteCandidate } from './rtc-transport-stats.ts';

// https://viblast.com/blog/2015/2/5/webrtc-data-channel-message-size
const MAX_MESSAGE_SIZE = 64 * 1024;
// Bytes the data channel may hold before we stop accepting writes; the real backpressure source.
const MAX_BUFFERED_AMOUNT = 64 * 1024;

/**
 * A WebRTC connection data channel.
 * Manages a WebRTC connection to a remote peer using an abstract signalling mechanism.
 */
export class RtcTransportChannel extends Resource implements Transport {
  public readonly closed = new AsyncEvent();
  public readonly connected = new AsyncEvent();
  public readonly errors = new ErrorStream();

  private _channel: RTCDataChannel | undefined;
  private _readableController: ReadableStreamDefaultController<Uint8Array> | undefined;
  private _streamDataFlushedCallback: PendingStreamFlushedCallback | null = null;
  private _isChannelCreationInProgress = false;

  constructor(
    private readonly _connection: RtcPeerConnection,
    private readonly _options: TransportOptions,
  ) {
    super();
  }

  public get isRtcChannelCreationInProgress() {
    return this._isChannelCreationInProgress;
  }

  public onConnectionError(error: Error): void {
    if (this.isOpen) {
      this.errors.raise(error);
    }
  }

  protected override async _open(): Promise<void> {
    invariant(!this._isChannelCreationInProgress);
    this._isChannelCreationInProgress = true;
    this._connection
      .createDataChannel(this._options.topic)
      .then((channel) => {
        if (this.isOpen) {
          this._channel = channel;
          this._initChannel(this._channel);
        } else {
          this._safeCloseChannel(channel);
        }
      })
      .catch((err) => {
        if (this.isOpen) {
          const error =
            err instanceof Error
              ? err
              : new ConnectivityError({ message: `Failed to create a channel: ${JSON.stringify(err?.message)}` });
          this.errors.raise(error);
        } else {
          log.verbose('connection establishment failed after transport was closed', { err });
        }
      })
      .finally(() => {
        this._isChannelCreationInProgress = false;
      });
  }

  protected override async _close(): Promise<void> {
    if (this._channel) {
      this._safeCloseChannel(this._channel);
      this._channel = undefined;
      this._readableController = undefined;
    }
    this.closed.emit();

    log('closed');
  }

  private _initChannel(channel: RTCDataChannel): void {
    Object.assign<RTCDataChannel, Partial<RTCDataChannel>>(channel, {
      onopen: () => {
        if (!this.isOpen) {
          log.warn('channel opened in a closed transport', { topic: this._options.topic });
          this._safeCloseChannel(channel);
          return;
        }

        log('onopen');
        const readable = new ReadableStream<Uint8Array>({
          start: (controller) => {
            this._readableController = controller;
          },
        });
        const writable = new WritableStream<Uint8Array>({
          write: (chunk) => this._handleChannelWrite(chunk),
        });
        connectDuplexStreams({ readable, writable }, this._options.stream, (err) => {
          if (this.isOpen) {
            this.errors.raise(err);
          }
        });
        this.connected.emit();
      },

      onclose: async () => {
        log('onclose');
        await this.close();
      },

      onmessage: async (event: MessageEvent) => {
        if (!this._readableController) {
          log.warn('ignoring message on a closed channel');
          return;
        }

        const data = event.data;
        if (data instanceof ArrayBuffer) {
          this._readableController.enqueue(new Uint8Array(data));
        } else if (data instanceof Blob) {
          this._readableController.enqueue(new Uint8Array(await data.arrayBuffer()));
        } else {
          this._readableController.enqueue(data);
        }
      },

      onerror: (event: Event & any) => {
        if (this.isOpen) {
          const err = event.error instanceof Error ? event.error : new Error(`Datachannel error: ${event.type}.`);
          this.errors.raise(err);
        }
      },

      onbufferedamountlow: () => {
        const cb = this._streamDataFlushedCallback;
        this._streamDataFlushedCallback = null;
        cb?.();
      },
    });
  }

  /**
   * Resolves once the channel has accepted the chunk, and — when its send buffer is over the
   * threshold — not until `onbufferedamountlow` fires, which is what applies backpressure.
   */
  private async _handleChannelWrite(chunk: Uint8Array): Promise<void> {
    if (!this._channel) {
      log.warn('writing to a channel after a connection was closed');
      return;
    }

    if (chunk.length > MAX_MESSAGE_SIZE) {
      const error = new Error(`Message too large: ${chunk.length} > ${MAX_MESSAGE_SIZE}.`);
      this.errors.raise(error);
      return;
    }

    try {
      // `send` demands an ArrayBuffer-backed view; re-wrapping is free unless the chunk is
      // SharedArrayBuffer-backed, which this pipeline never produces.
      this._channel.send(
        chunk.buffer instanceof ArrayBuffer
          ? new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength)
          : new Uint8Array(chunk),
      );
    } catch (err: any) {
      this.errors.raise(err);
      return;
    }

    if (this._channel.bufferedAmount > MAX_BUFFERED_AMOUNT) {
      if (this._streamDataFlushedCallback !== null) {
        log.error('consumer trying to write before we are ready for more data');
      }
      await new Promise<void>((resolve) => {
        this._streamDataFlushedCallback = resolve;
      });
    }
  }

  private _safeCloseChannel(channel: RTCDataChannel): void {
    try {
      channel.close();
    } catch (error: any) {
      log.catch(error);
    }
  }

  public onSignal(signal: Signal): Promise<void> {
    return this._connection.onSignal(signal);
  }

  async getDetails(): Promise<string> {
    return describeSelectedRemoteCandidate(this._connection.currentConnection);
  }

  async getStats(): Promise<TransportStats> {
    return createRtcTransportStats(this._connection.currentConnection, this._options.topic);
  }
}

type PendingStreamFlushedCallback = () => void;
