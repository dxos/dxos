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

import { type Transport, type TransportOptions, type TransportStats } from '../transport.ts';
import { bindDataChannel } from './rtc-data-channel.ts';
import { type RtcPeerConnection } from './rtc-peer-connection.ts';
import { createRtcTransportStats, describeSelectedRemoteCandidate } from './rtc-transport-stats.ts';

/**
 * Omitting `stream` makes the channel a handover: the `RTCDataChannel` is surfaced through
 * {@link RtcTransportChannel.channelReady} and the consumer — typically another thread it was
 * transferred to — owns it from then on.
 */
export type RtcTransportChannelOptions = Omit<TransportOptions, 'stream' | 'sendSignal'> & {
  stream?: TransportOptions['stream'];
};

/**
 * A WebRTC connection data channel.
 * Manages a WebRTC connection to a remote peer using an abstract signalling mechanism.
 */
export class RtcTransportChannel extends Resource implements Transport {
  public readonly closed = new AsyncEvent();
  public readonly connected = new AsyncEvent();
  public readonly errors = new ErrorStream();

  /** Emitted once per connection when {@link RtcTransportChannelOptions.stream} is omitted. */
  public readonly channelReady = new AsyncEvent<RTCDataChannel>();

  private _channel: RTCDataChannel | undefined;
  private _unbind: (() => void) | undefined;
  private _isChannelCreationInProgress = false;

  constructor(
    private readonly _connection: RtcPeerConnection,
    private readonly _options: RtcTransportChannelOptions,
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
        if (!this.isOpen) {
          this._safeCloseChannel(channel);
          return;
        }

        this._channel = channel;
        const stream = this._options.stream;
        if (!stream) {
          // Handed over before it opens: the platform only allows transferring a channel this
          // context has not yet used, and the receiver observes `onopen` itself.
          this.channelReady.emit(channel);
          this.connected.emit();
          return;
        }

        this._unbind = bindDataChannel(channel, stream, {
          onOpen: () => this.connected.emit(),
          onClose: () => this.close().then(() => {}),
          onError: (error) => {
            if (this.isOpen) {
              this.errors.raise(error);
            }
          },
        });
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
    if (this._unbind) {
      this._unbind();
      this._unbind = undefined;
    } else if (this._channel && this._options.stream) {
      this._safeCloseChannel(this._channel);
    }
    // A handed-over channel is detached from this context; closing it is the new owner's business.
    this._channel = undefined;
    this.closed.emit();

    log('closed');
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
