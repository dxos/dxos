//
// Copyright 2024 DXOS.org
//

import { Duplex } from 'node:stream';

import { Event as AsyncEvent } from '@dxos/async';
import { Resource } from '@dxos/context';
import { ErrorStream } from '@dxos/debug';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { ConnectivityError } from '@dxos/protocols';
import { type Signal } from '@dxos/protocols/buf/dxos/mesh/swarm_pb';

import { type Transport, type TransportOptions, type TransportStats } from '../transport.ts';
import { type RtcPeerConnection } from './rtc-peer-connection.ts';
import { createRtcTransportStats, describeSelectedRemoteCandidate } from './rtc-transport-stats.ts';

// https://viblast.com/blog/2015/2/5/webrtc-data-channel-message-size
const MAX_MESSAGE_SIZE = 64 * 1024;
// The default Readable stream buffer size: https://nodejs.org/api/stream.html#implementing-a-readable-stream
const MAX_BUFFERED_AMOUNT = 64 * 1024;

/** A peer sends a handful of frames before the channel opens; past that something is wrong. */
const MAX_PREOPEN_MESSAGES = 64;

/** Copied rather than aliased: a buffered frame outlives the event that carried it. */
const toFrame = (data: unknown): Buffer | string => {
  if (data instanceof ArrayBuffer) {
    return Buffer.from(new Uint8Array(data));
  }
  if (ArrayBuffer.isView(data)) {
    return Buffer.from(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
  }
  if (typeof data === 'string' || Buffer.isBuffer(data)) {
    return data;
  }
  throw new Error(`Unsupported data-channel frame: ${typeof data}.`);
};

/**
 * A WebRTC connection data channel.
 * Manages a WebRTC connection to a remote peer using an abstract signalling mechanism.
 */
export class RtcTransportChannel extends Resource implements Transport {
  public readonly closed = new AsyncEvent();
  public readonly connected = new AsyncEvent();
  public readonly errors = new ErrorStream();

  private _channel: RTCDataChannel | undefined;
  private _stream: Duplex | undefined;
  /** Frames delivered before {@link _stream} exists; nothing retransmits them. */
  private _bufferedMessages: (Buffer | string)[] = [];
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
      this._stream = undefined;
    }
    this._bufferedMessages.length = 0;
    this.closed.emit();

    log('closed');
  }

  private _initChannel(channel: RTCDataChannel): void {
    // Bytes rather than the default `blob`, whose async conversion lets two frames complete out of
    // arrival order.
    channel.binaryType = 'arraybuffer';

    const open = () => {
      // Both the event and the already-open check below can reach this; piping twice would duplicate
      // every frame on the protocol stream.
      if (this._stream) {
        return;
      }
      if (!this.isOpen) {
        log.warn('channel opened in a closed transport', { topic: this._options.topic });
        this._safeCloseChannel(channel);
        return;
      }

      log('onopen');
      const duplex = new Duplex({
        read: () => {},
        write: (chunk, encoding, callback) => {
          return this._handleChannelWrite(chunk, callback);
        },
      });
      duplex.pipe(this._options.stream).pipe(duplex);
      this._stream = duplex;
      const buffered = this._bufferedMessages;
      this._bufferedMessages = [];
      buffered.forEach((message) => duplex.push(message));
      this.connected.emit();
    };

    Object.assign<RTCDataChannel, Partial<RTCDataChannel>>(channel, {
      onopen: open,

      onclose: async () => {
        log('onclose');
        await this.close();
      },

      onmessage: (event: MessageEvent) => {
        const data = toFrame(event.data);
        if (this._stream) {
          this._stream.push(data);
          return;
        }
        if (!this.isOpen) {
          log.warn('ignoring message on a closed channel');
          return;
        }
        // Nothing retransmits a frame that lands before the channel reports open, so it waits.
        if (this._bufferedMessages.length >= MAX_PREOPEN_MESSAGES) {
          this.errors.raise(new Error(`More than ${MAX_PREOPEN_MESSAGES} frames before the channel opened.`));
          return;
        }
        this._bufferedMessages.push(data);
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

    // A channel that was already open when these handlers were attached never dispatches `open`,
    // leaving every frame to queue against a stream that is never created.
    if (channel.readyState === 'open') {
      open();
    }
  }

  private async _handleChannelWrite(chunk: any, callback: PendingStreamFlushedCallback): Promise<void> {
    // `send` throws once the channel leaves `open`, and raising that tears down the peer connection
    // — including a replacement one — for bytes whose connection is already going away. `onclose`
    // carries the close on its own. The callback still runs, or the stream never writes again.
    if (this._channel?.readyState !== 'open') {
      log('write dropped for a channel that is not open', { readyState: this._channel?.readyState });
      callback();
      return;
    }

    if (chunk.length > MAX_MESSAGE_SIZE) {
      const error = new Error(`Message too large: ${chunk.length} > ${MAX_MESSAGE_SIZE}.`);
      this.errors.raise(error);
      callback();
      return;
    }

    try {
      this._channel.send(chunk);
    } catch (err: any) {
      this.errors.raise(err);
      callback();
      return;
    }

    if (this._channel.bufferedAmount > MAX_BUFFERED_AMOUNT) {
      if (this._streamDataFlushedCallback !== null) {
        log.error('consumer trying to write before we are ready for more data');
      }
      this._streamDataFlushedCallback = callback;
    } else {
      callback();
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
